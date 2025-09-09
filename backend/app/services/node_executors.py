import asyncio
from typing import Dict, Any, Optional
from ..core.embeddings import embed_texts
from ..core.chroma_client import get_or_create_collection
from ..core.llm_client import ask_llm, ask_llm_with_key
from ..core.ws_manager import ws_manager
from loguru import logger
import os

CHROMA_COLLECTION = os.getenv("CHROMA_COLLECTION", "kb_collection")

async def _run_blocking(func, *args, **kwargs):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, lambda: func(*args, **kwargs))

async def exec_user_query(node: Dict[str, Any], inputs: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
    session_id = context.get("session_id")
    q = node.get("data", {}).get("config", {}).get("default_query") or inputs.get("query")
    if session_id:
        await ws_manager.send(session_id, {"type":"log","message":f"[{node['id']}] UserQuery -> {q}"})
    return {"query": q}

async def exec_knowledgebase(node: Dict[str, Any], inputs: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
    session_id = context.get("session_id")
    node_configs = context.get("node_configs", {})
    api_keys = context.get("api_keys", {})
    
    # Get API keys and provider from context or node config
    embedding_api_key = api_keys.get("embedding") or node_configs.get(node["id"], {}).get("embedding_api_key")
    embedding_provider = node_configs.get(node["id"], {}).get("embedding_provider", "openai")
    
    if not embedding_api_key:
        raise Exception("Text Embedding API key not provided for Knowledge Base")
    
    query = inputs.get("query")
    top_k = int(node.get("data", {}).get("config", {}).get("top_k", 5))
    coll_name = node.get("data", {}).get("config", {}).get("collection_name", CHROMA_COLLECTION)
    
    # Set default embedding model based on provider
    if embedding_provider.lower() == "gemini":
        embedding_model = node_configs.get(node["id"], {}).get("embedding_model", "models/embedding-001")
    else:
        embedding_model = node_configs.get(node["id"], {}).get("embedding_model", "text-embedding-3-large")
    
    # Check if there's an uploaded file to process
    uploaded_file = node_configs.get(node["id"], {}).get("uploaded_file")
    if uploaded_file:
        if session_id:
            filename = uploaded_file.get('name', 'uploaded_file.pdf') if isinstance(uploaded_file, dict) else getattr(uploaded_file, 'name', 'uploaded_file.pdf')
            await ws_manager.send(session_id, {"type":"log","message":f"[{node['id']}] Processing uploaded file: {filename}"})
        
        try:
            # Process the uploaded file
            from ..services.processor import extract_text_from_pdf, store_document_in_chroma
            import io
            import base64
            import asyncio
            
            # Handle base64 file data from frontend
            if isinstance(uploaded_file, dict) and 'content' in uploaded_file:
                # File was sent as base64 from frontend
                file_contents = base64.b64decode(uploaded_file['content'])
                filename = uploaded_file.get('name', 'uploaded_file.pdf')
            else:
                # File was sent as file object (fallback)
                file_contents = await uploaded_file.read()
                filename = getattr(uploaded_file, 'name', 'uploaded_file.pdf')
            
            # Extract text from PDF with shorter timeout
            text = await asyncio.wait_for(
                _run_blocking(extract_text_from_pdf, file_contents),
                timeout=15.0  # 15 second timeout for PDF extraction
            )
            
            # Store in ChromaDB with the selected embedding provider with shorter timeout
            result = await asyncio.wait_for(
                _run_blocking(store_document_in_chroma, filename, text, 
                            {"description": f"Uploaded via Knowledge Base node {node['id']}"},
                            embedding_provider, embedding_api_key, embedding_model),
                timeout=30.0  # 30 second timeout for ChromaDB storage
            )
            
            if session_id:
                await ws_manager.send(session_id, {"type":"log","message":f"[{node['id']}] File processed and stored: {result.get('stored_chunks', 0)} chunks"})
            
            # Clear the uploaded file from config to prevent re-processing
            if node["id"] in node_configs:
                node_configs[node["id"]]["uploaded_file"] = None
            
        except asyncio.TimeoutError:
            error_msg = f"File processing timeout for {filename if 'filename' in locals() else 'uploaded file'}"
            if session_id:
                await ws_manager.send(session_id, {"type":"log","message":f"[{node['id']}] {error_msg}"})
            logger.warning(error_msg)
        except Exception as e:
            if session_id:
                await ws_manager.send(session_id, {"type":"log","message":f"[{node['id']}] File processing error: {str(e)}"})
            # Continue with query processing even if file upload fails
    
    if session_id:
        await ws_manager.send(session_id, {"type":"log","message":f"[{node['id']}] KB searching top {top_k} for query..."})
    
    # Use the provided API key for embeddings with the selected provider
    from ..core.embeddings import embed_texts_with_provider
    try:
        emb = await _run_blocking(embed_texts_with_provider, embedding_api_key, [query], embedding_provider, embedding_model)
    except Exception as e:
        error_msg = str(e)
        if "401" in error_msg or "AuthenticationError" in error_msg or "invalid_api_key" in error_msg:
            if embedding_provider.lower() == "gemini":
                error_msg = "Invalid Gemini API key provided for embeddings. Please check your API key in the Knowledge Base component."
            else:
                error_msg = "Invalid OpenAI API key provided for embeddings. Please check your API key in the Knowledge Base component."
        elif "403" in error_msg or "Forbidden" in error_msg:
            if embedding_provider.lower() == "gemini":
                error_msg = "API key doesn't have permission for Gemini embeddings. Please check your Gemini API key permissions."
            else:
                error_msg = "API key doesn't have permission for OpenAI embeddings. Please check your OpenAI API key permissions."
        else:
            error_msg = f"Embedding error ({embedding_provider}): {error_msg}"
        
        # Send error via WebSocket if session_id exists
        if session_id:
            await ws_manager.send(session_id, {"type":"error","message": error_msg})
        raise Exception(error_msg)
    
    if not emb:
        docs = []
        if session_id:
            await ws_manager.send(session_id, {"type":"log","message":f"[{node['id']}] No embeddings generated for query"})
    else:
        client = get_or_create_collection(coll_name)
        q_emb = emb[0]
        
        if session_id:
            await ws_manager.send(session_id, {"type":"log","message":f"[{node['id']}] Querying ChromaDB with {len(q_emb)}-dim embedding"})
        
        res = await _run_blocking(client.query, query_embeddings=[q_emb], n_results=top_k, include=["documents","metadatas"])
        docs = []
        if isinstance(res, dict) and "documents" in res:
            for dlist in res["documents"]:
                docs.extend(dlist)
        else:
            try:
                docs = res[0]["documents"]
            except Exception:
                docs = []
        
        if session_id:
            await ws_manager.send(session_id, {"type":"log","message":f"[{node['id']}] ChromaDB query returned {len(docs)} documents"})
    
    kb_context = "\n\n".join(docs)
    if session_id:
        await ws_manager.send(session_id, {"type":"log","message":f"[{node['id']}] KB retrieved {len(docs)} chunks, context length: {len(kb_context)} chars"})
    
    # Return only context - query should come directly from User Query to LLM
    result = {
        "context": kb_context, 
        "kb_docs": docs
    }
    
    if session_id:
        await ws_manager.send(session_id, {"type":"log","message":f"[{node['id']}] KB output: {list(result.keys())}"})
        await ws_manager.send(session_id, {"type":"log","message":f"[{node['id']}] Context length: {len(kb_context)} chars"})
    
    return result

async def exec_websearch(node: Dict[str, Any], inputs: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
    session_id = context.get("session_id")
    node_configs = context.get("node_configs", {})
    api_keys = context.get("api_keys", {})
    
    # Get API key from context or node config
    serp_api_key = api_keys.get("serp") or node_configs.get(node["id"], {}).get("serp_api_key")
    if not serp_api_key:
        raise Exception("SERP API key not provided")
    
    query = inputs.get("query")
    search_query = node.get("data", {}).get("config", {}).get("search_query") or query
    search_engine = node.get("data", {}).get("config", {}).get("search_engine", "google")
    num_results = node.get("data", {}).get("config", {}).get("num_results", 5)
    
    if session_id:
        await ws_manager.send(session_id, {"type":"log","message":f"[{node['id']}] WebSearch for query: {search_query}"})
    
    # TODO: Implement actual SERP API call
    # For now, return mock results
    results = [
        f"Search result 1 for '{search_query}' from {search_engine}",
        f"Search result 2 for '{search_query}' from {search_engine}",
        f"Search result 3 for '{search_query}' from {search_engine}"
    ]
    
    return {"web_results": results, "context": "\n".join(results)}

async def exec_llm(node: Dict[str, Any], inputs: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
    session_id = context.get("session_id")
    node_configs = context.get("node_configs", {})
    api_keys = context.get("api_keys", {})
    
    # Get API key from context or node config based on provider
    provider = node.get("data", {}).get("config", {}).get("provider", "openai")
    
    # Try to get API key from the appropriate provider key
    if provider.lower() == "gemini":
        api_key = api_keys.get("gemini") or node_configs.get(node["id"], {}).get("api_key")
    elif provider.lower() == "grok":
        api_key = api_keys.get("grok") or node_configs.get(node["id"], {}).get("api_key")
    else:  # openai or default
        api_key = api_keys.get("openai") or node_configs.get(node["id"], {}).get("api_key")
    
    if not api_key:
        raise Exception(f"{provider.title()} API key not provided")
    
    system_prompt = node.get("data", {}).get("config", {}).get("system_prompt", "You are a helpful assistant.")
    temperature = float(node.get("data", {}).get("config", {}).get("temperature", 0.2))
    max_tokens = int(node.get("data", {}).get("config", {}).get("max_tokens", 800))
    streaming = bool(node.get("data", {}).get("config", {}).get("stream", True))
    
    # Create the user prompt with context and query
    # Since we now have a single input handle, we need to collect all inputs
    user_prompt_parts = []
    
    # Get chat history for context
    chat_history = context.get("chat_history", [])
    if session_id:
        await ws_manager.send(session_id, {"type":"log","message":f"[{node['id']}] Chat history received: {len(chat_history)} messages"})
    
    if chat_history:
        # Format chat history for context
        history_context = "Previous conversation:\n"
        for msg in chat_history[-6:]:  # Keep last 6 messages for context
            role = "User" if msg.get("role") == "user" else "Assistant"
            content = msg.get("content", "")
            history_context += f"{role}: {content}\n"
        user_prompt_parts.append(history_context)
        
        if session_id:
            await ws_manager.send(session_id, {"type":"log","message":f"[{node['id']}] History context: {history_context[:200]}..."})
    
    # Get query from User Query component
    query = inputs.get("query", "")
    if query:
        user_prompt_parts.append(f"Current User Query: {query}")
    
    # Get context from Knowledge Base component
    context_data = inputs.get("context", "")
    if context_data:
        user_prompt_parts.append(f"CONTEXT: {context_data}")
        if session_id:
            await ws_manager.send(session_id, {"type":"log","message":f"[{node['id']}] Received context from Knowledge Base: {len(context_data)} chars"})
    else:
        if session_id:
            await ws_manager.send(session_id, {"type":"log","message":f"[{node['id']}] No context received from Knowledge Base"})
    
    # Debug: Show all inputs received by LLM
    if session_id:
        await ws_manager.send(session_id, {"type":"log","message":f"[{node['id']}] LLM inputs: {list(inputs.keys())}"})
        for key, value in inputs.items():
            if value:
                await ws_manager.send(session_id, {"type":"log","message":f"[{node['id']}] Input '{key}': {type(value)} with {len(str(value))} chars"})
    
    # Get web results from Web Search component
    web_results = inputs.get("web_results", "")
    if web_results:
        if isinstance(web_results, list):
            user_prompt_parts.append(f"WEB: {chr(10).join(web_results)}")
        else:
            user_prompt_parts.append(f"WEB: {str(web_results)}")
    
    # If no specific inputs, try to get from the general input
    if not user_prompt_parts:
        general_input = inputs.get("input", "")
        if general_input:
            user_prompt_parts.append(general_input)
    
    prompt = "\n\n".join(user_prompt_parts) if user_prompt_parts else "Please provide a response."

    if session_id:
        await ws_manager.send(session_id, {"type":"log","message":f"[{node['id']}] LLM starting (provider={provider}, streaming={streaming})"})
        await ws_manager.send(session_id, {"type":"log","message":f"[{node['id']}] System prompt: {system_prompt}"})
        await ws_manager.send(session_id, {"type":"log","message":f"[{node['id']}] Final prompt: {prompt[:300]}..."})

    if streaming:
        try:
            stream_iter = ask_llm_with_key(api_key, provider, streaming=True, system=system_prompt, prompt=prompt, temperature=temperature, max_tokens=max_tokens)
            final_text = ""
            token_count = 0
            max_tokens_limit = 5000  # Safety limit
            import time
            start_time = time.time()
            max_duration = 60  # 60 second timeout for LLM streaming
            
            for event in stream_iter:
                # Safety checks to prevent infinite loops
                if time.time() - start_time > max_duration:
                    logger.warning(f"LLM streaming timeout after {max_duration}s, breaking")
                    if session_id:
                        await ws_manager.send(session_id, {"type":"log","message":f"[{node['id']}] LLM streaming timeout after {max_duration}s"})
                    break
                
                if not isinstance(event, dict):
                    continue
                if event.get("type") == "token":
                    token = event.get("delta", "")
                    final_text += token
                    token_count += 1
                    if token_count > max_tokens_limit:
                        logger.warning(f"LLM streaming: Too many tokens ({token_count}), breaking")
                        if session_id:
                            await ws_manager.send(session_id, {"type":"log","message":f"[{node['id']}] LLM streaming: Too many tokens, breaking"})
                        break
                    if session_id:
                        await ws_manager.send(session_id, {"type":"token", "node_id": node["id"], "token": token})
                elif event.get("type") == "done":
                    final_text = event.get("text", final_text)
                    if session_id:
                        await ws_manager.send(session_id, {"type":"done", "node_id": node["id"], "text": final_text})
                    break
                elif event.get("type") == "error":
                    err = event.get("error")
                    if session_id:
                        await ws_manager.send(session_id, {"type":"error", "node_id": node["id"], "error": err})
                    raise Exception(err)
            if session_id:
                await ws_manager.send(session_id, {"type":"log","message":f"[{node['id']}] LLM streaming complete (len={len(final_text)}, tokens={token_count})"})
            return {"output": final_text}
        except Exception as e:
            logger.exception("Streaming LLM failed")
            error_msg = str(e)
            if "401" in error_msg or "AuthenticationError" in error_msg or "invalid_api_key" in error_msg:
                error_msg = f"Invalid {provider.upper()} API key provided. Please check your API key in the LLM component."
            elif "403" in error_msg or "Forbidden" in error_msg:
                error_msg = f"API key doesn't have permission for {provider.upper()}. Please check your API key permissions."
            elif "404" in error_msg or "not found" in error_msg:
                error_msg = f"Model not found for {provider.upper()}. Please check your model selection."
            else:
                error_msg = f"LLM error ({provider}): {error_msg}"
            
            # Send error via WebSocket if session_id exists
            if session_id:
                await ws_manager.send(session_id, {"type":"error","message": error_msg})
            raise Exception(error_msg)
    else:
        try:
            # Add timeout for non-streaming calls
            import asyncio
            text = await asyncio.wait_for(
                _run_blocking(ask_llm_with_key, api_key, provider, False, system=system_prompt, prompt=prompt, temperature=temperature, max_tokens=max_tokens),
                timeout=60.0  # 60 second timeout
            )
            if session_id:
                await ws_manager.send(session_id, {"type":"log","message":f"[{node['id']}] LLM finished (non-streaming)"})
            return {"output": text}
        except Exception as e:
            logger.exception("Non-streaming LLM error")
            error_msg = str(e)
            if "401" in error_msg or "AuthenticationError" in error_msg or "invalid_api_key" in error_msg:
                error_msg = f"Invalid {provider.upper()} API key provided. Please check your API key in the LLM component."
            elif "403" in error_msg or "Forbidden" in error_msg:
                error_msg = f"API key doesn't have permission for {provider.upper()}. Please check your API key permissions."
            elif "404" in error_msg or "not found" in error_msg:
                error_msg = f"Model not found for {provider.upper()}. Please check your model selection."
            else:
                error_msg = f"LLM error ({provider}): {error_msg}"
            
            # Send error via WebSocket if session_id exists
            if session_id:
                await ws_manager.send(session_id, {"type":"error","message": error_msg})
            raise Exception(error_msg)

async def exec_output(node, inputs, context):
    """Execute output node - just pass through the final result"""
    session_id = context.get("session_id")
    
    if session_id:
        await ws_manager.send(session_id, {"type":"log","message":f"[{node['id']}] Output node processing"})
    
    # Get the final output from the inputs
    final_output = inputs.get("output") or inputs.get("context") or inputs.get("input", "")
    
    if session_id:
        await ws_manager.send(session_id, {"type":"log","message":f"[{node['id']}] Output: {final_output[:100]}..."})
    
    return {"final": final_output}

EXECUTOR_REGISTRY = {
    "user_query": exec_user_query,
    "knowledgebase": exec_knowledgebase,
    "websearch": exec_websearch,
    "llm": exec_llm,
    "output": exec_output
}

def get_executor(node_type: str):
    return EXECUTOR_REGISTRY.get(node_type)

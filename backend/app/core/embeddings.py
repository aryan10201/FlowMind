import os
from openai import OpenAI
import google.generativeai as genai
from loguru import logger

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "text-embedding-3-large")

def embed_texts(texts):
    if not texts:
        return []
    if not client:
        raise Exception("OpenAI client not initialized. Please set OPENAI_API_KEY environment variable.")
    try:
        resp = client.embeddings.create(model=EMBEDDING_MODEL, input=texts)
        embeddings = [item.embedding for item in resp.data]
        return embeddings
    except Exception as e:
        logger.exception("OpenAI embedding error")
        raise

def embed_texts_with_key(api_key: str, texts: list, model: str = None):
    """Create embeddings with a specific API key"""
    if not texts:
        return []
    if not api_key:
        raise Exception("API key not provided for embeddings")
    
    temp_client = OpenAI(api_key=api_key)
    embedding_model = model or EMBEDDING_MODEL
    
    try:
        resp = temp_client.embeddings.create(model=embedding_model, input=texts)
        embeddings = [item.embedding for item in resp.data]
        return embeddings
    except Exception as e:
        logger.exception("OpenAI embedding error with custom key")
        raise

def embed_texts_gemini(api_key: str, texts: list, model: str = "models/embedding-001"):
    """Create embeddings using Google Gemini API with improved timeout handling"""
    if not texts:
        return []
    if not api_key:
        raise Exception("Gemini API key not provided for embeddings")
    
    try:
        genai.configure(api_key=api_key)
        embeddings = []
        
        for i, text in enumerate(texts):
            max_retries = 2  # Reduced retries to fail faster
            retry_delay = 2  # Increased delay between retries
            
            for attempt in range(max_retries):
                try:
                    import time
                    start_time = time.time()
                    
                    # Set a shorter timeout for individual requests
                    result = genai.embed_content(
                        model=model,
                        content=text,
                        task_type="retrieval_document"
                    )
                    
                    # Check if we got a valid response
                    if result and 'embedding' in result:
                        embeddings.append(result['embedding'])
                        break
                    else:
                        raise Exception("Invalid response from Gemini API")
                        
                except Exception as e:
                    error_msg = str(e)
                    
                    # Check for timeout errors
                    if "DeadlineExceeded" in error_msg or "504" in error_msg or "timeout" in error_msg.lower():
                        if attempt < max_retries - 1:
                            logger.warning(f"Gemini API timeout for text {i+1}, retry {attempt + 1}/{max_retries}")
                            time.sleep(retry_delay)
                            continue
                        else:
                            raise Exception("Gemini API timeout. The service is currently slow or unavailable. Please try again in a few minutes.")
                    
                    # Check for rate limiting
                    elif "429" in error_msg or "quota" in error_msg.lower():
                        if attempt < max_retries - 1:
                            logger.warning(f"Gemini API rate limited for text {i+1}, retry {attempt + 1}/{max_retries}")
                            time.sleep(retry_delay * 2)
                            continue
                        else:
                            raise Exception("Gemini API rate limit exceeded. Please try again later.")
                    
                    # Other errors - fail immediately
                    else:
                        raise Exception(f"Gemini API error: {error_msg}")
            
            # If we get here without breaking, it means all retries failed
            if len(embeddings) == i:
                raise Exception(f"Failed to get embedding for text {i+1} after {max_retries} attempts")
        
        return embeddings
        
    except Exception as e:
        logger.exception("Gemini embedding error")
        raise

def embed_texts_with_provider(api_key: str, texts: list, provider: str = "openai", model: str = None):
    """Create embeddings with a specific provider and API key"""
    if not texts:
        return []
    if not api_key:
        raise Exception("API key not provided for embeddings")
    
    if provider.lower() == "gemini":
        embedding_model = model or "models/embedding-001"
        return embed_texts_gemini(api_key, texts, embedding_model)
    elif provider.lower() == "openai":
        embedding_model = model or "text-embedding-3-large"
        return embed_texts_with_key(api_key, texts, embedding_model)
    else:
        raise Exception(f"Unsupported embedding provider: {provider}")

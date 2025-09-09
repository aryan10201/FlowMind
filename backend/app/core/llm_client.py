import os
import requests
from openai import OpenAI
from loguru import logger

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None
LLM_MODEL = os.getenv("LLM_MODEL", "gpt-4o-mini")

def ask_openai_system(system_prompt: str, user_prompt: str, temperature: float = 0.2, max_tokens: int = 800):
    if not client:
        raise Exception("OpenAI client not initialized. Please set OPENAI_API_KEY environment variable.")
    try:
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": user_prompt})
        resp = client.chat.completions.create(
            model=LLM_MODEL,
            messages=messages,
            temperature=float(temperature),
            max_tokens=max_tokens
        )
        return resp.choices[0].message.content
    except Exception as e:
        logger.exception("OpenAI non-streaming error")
        raise

def stream_chat_openai(system_prompt: str, user_prompt: str, temperature: float = 0.2, max_tokens: int = 800):
    if not client:
        yield {"type":"error", "error": "OpenAI client not initialized. Please set OPENAI_API_KEY environment variable."}
        return
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": user_prompt})
    try:
        resp = client.chat.completions.create(
            model=LLM_MODEL,
            messages=messages,
            temperature=float(temperature),
            max_tokens=max_tokens,
            stream=True
        )
        final_text = ""
        for chunk in resp:
            try:
                if chunk.choices and len(chunk.choices) > 0:
                    choice = chunk.choices[0]
                    if choice.delta and choice.delta.content:
                        token = choice.delta.content
                        final_text += token
                        yield {"type":"token", "delta": token}
                    if choice.finish_reason:
                        yield {"type":"done", "text": final_text}
                        return
            except Exception:
                continue
        yield {"type":"done", "text": final_text}
    except Exception as e:
        logger.exception("OpenAI streaming error")
        yield {"type":"error", "error": str(e)}
        return

def ask_llm(provider: str, streaming: bool = False, **kwargs):
    if provider == "openai":
        if streaming:
            return stream_chat_openai(kwargs.get("system"), kwargs.get("prompt"), kwargs.get("temperature", 0.2), kwargs.get("max_tokens", 800))
        else:
            return ask_openai_system(kwargs.get("system"), kwargs.get("prompt"), kwargs.get("temperature", 0.2), kwargs.get("max_tokens", 800))
    else:
        raise NotImplementedError(f"Provider {provider} not implemented (streaming adapter missing).")

def ask_llm_with_key(api_key: str, provider: str, streaming: bool = False, **kwargs):
    """Ask LLM with a specific API key"""
    if provider == "openai":
        temp_client = OpenAI(api_key=api_key)
        if streaming:
            return stream_chat_openai_with_client(temp_client, kwargs.get("system"), kwargs.get("prompt"), kwargs.get("temperature", 0.2), kwargs.get("max_tokens", 800))
        else:
            return ask_openai_system_with_client(temp_client, kwargs.get("system"), kwargs.get("prompt"), kwargs.get("temperature", 0.2), kwargs.get("max_tokens", 800))
    elif provider == "grok":
        if streaming:
            return stream_chat_grok(api_key, kwargs.get("system"), kwargs.get("prompt"), kwargs.get("temperature", 0.2), kwargs.get("max_tokens", 800))
        else:
            return ask_grok_system(api_key, kwargs.get("system"), kwargs.get("prompt"), kwargs.get("temperature", 0.2), kwargs.get("max_tokens", 800))
    elif provider == "gemini":
        if streaming:
            return stream_chat_gemini(api_key, kwargs.get("system"), kwargs.get("prompt"), kwargs.get("temperature", 0.2), kwargs.get("max_tokens", 800))
        else:
            return ask_gemini_system(api_key, kwargs.get("system"), kwargs.get("prompt"), kwargs.get("temperature", 0.2), kwargs.get("max_tokens", 800))
    else:
        raise NotImplementedError(f"Provider {provider} not implemented (streaming adapter missing).")

def ask_openai_system_with_client(client: OpenAI, system_prompt: str, user_prompt: str, temperature: float = 0.2, max_tokens: int = 800):
    try:
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": user_prompt})
        resp = client.chat.completions.create(
            model=LLM_MODEL,
            messages=messages,
            temperature=float(temperature),
            max_tokens=max_tokens
        )
        return resp.choices[0].message.content
    except Exception as e:
        logger.exception("OpenAI non-streaming error")
        raise

def stream_chat_openai_with_client(client: OpenAI, system_prompt: str, user_prompt: str, temperature: float = 0.2, max_tokens: int = 800):
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": user_prompt})
    try:
        resp = client.chat.completions.create(
            model=LLM_MODEL,
            messages=messages,
            temperature=float(temperature),
            max_tokens=max_tokens,
            stream=True
        )
        final_text = ""
        for chunk in resp:
            try:
                if chunk.choices and len(chunk.choices) > 0:
                    choice = chunk.choices[0]
                    if choice.delta and choice.delta.content:
                        token = choice.delta.content
                        final_text += token
                        yield {"type":"token", "delta": token}
                    if choice.finish_reason:
                        yield {"type":"done", "text": final_text}
                        return
            except Exception:
                continue
        yield {"type":"done", "text": final_text}
    except Exception as e:
        logger.exception("OpenAI streaming error")
        yield {"type":"error", "error": str(e)}
        return

def ask_grok_system(api_key: str, system_prompt: str, user_prompt: str, temperature: float = 0.2, max_tokens: int = 800):
    """Ask Grok API for non-streaming response"""
    try:
        url = "https://api.x.ai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": user_prompt})
        
        data = {
            "model": "grok-beta",
            "messages": messages,
            "temperature": float(temperature),
            "max_tokens": max_tokens
        }
        
        response = requests.post(url, headers=headers, json=data)
        
        if response.status_code == 403:
            raise Exception("Grok API access denied. Please check your API key and ensure you have access to Grok API.")
        elif response.status_code == 401:
            raise Exception("Invalid Grok API key. Please check your API key.")
        
        response.raise_for_status()
        
        result = response.json()
        return result["choices"][0]["message"]["content"]
        
    except Exception as e:
        logger.exception("Grok non-streaming error")
        raise

def stream_chat_grok(api_key: str, system_prompt: str, user_prompt: str, temperature: float = 0.2, max_tokens: int = 800):
    """Stream chat with Grok API"""
    try:
        url = "https://api.x.ai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": user_prompt})
        
        data = {
            "model": "grok-beta",
            "messages": messages,
            "temperature": float(temperature),
            "max_tokens": max_tokens,
            "stream": True
        }
        
        response = requests.post(url, headers=headers, json=data, stream=True)
        
        if response.status_code == 403:
            yield {"type":"error", "error": "Grok API access denied. Please check your API key and ensure you have access to Grok API."}
            return
        elif response.status_code == 401:
            yield {"type":"error", "error": "Invalid Grok API key. Please check your API key."}
            return
        
        response.raise_for_status()
        
        final_text = ""
        for line in response.iter_lines():
            if line:
                line = line.decode('utf-8')
                if line.startswith('data: '):
                    data_str = line[6:]  # Remove 'data: ' prefix
                    if data_str.strip() == '[DONE]':
                        yield {"type":"done", "text": final_text}
                        return
                    
                    try:
                        import json
                        chunk_data = json.loads(data_str)
                        if 'choices' in chunk_data and len(chunk_data['choices']) > 0:
                            choice = chunk_data['choices'][0]
                            if 'delta' in choice and 'content' in choice['delta']:
                                token = choice['delta']['content']
                                final_text += token
                                yield {"type":"token", "delta": token}
                    except json.JSONDecodeError:
                        continue
        
        yield {"type":"done", "text": final_text}
        
    except Exception as e:
        logger.exception("Grok streaming error")
        yield {"type":"error", "error": str(e)}
        return

def ask_gemini_system(api_key: str, system_prompt: str, user_prompt: str, temperature: float = 0.2, max_tokens: int = 800):
    """Ask Gemini API for non-streaming response"""
    try:
        import google.generativeai as genai
        
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        # Combine system and user prompts
        full_prompt = f"{system_prompt}\n\n{user_prompt}" if system_prompt else user_prompt
        
        response = model.generate_content(
            full_prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=temperature,
                max_output_tokens=max_tokens
            )
        )
        
        return response.text
        
    except Exception as e:
        logger.exception("Gemini non-streaming error")
        raise

def stream_chat_gemini(api_key: str, system_prompt: str, user_prompt: str, temperature: float = 0.2, max_tokens: int = 800):
    """Stream chat with Gemini API"""
    try:
        import google.generativeai as genai
        
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        # Combine system and user prompts
        full_prompt = f"{system_prompt}\n\n{user_prompt}" if system_prompt else user_prompt
        
        response = model.generate_content(
            full_prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=temperature,
                max_output_tokens=max_tokens
            ),
            stream=True
        )
        
        final_text = ""
        for chunk in response:
            if chunk.text:
                final_text += chunk.text
                yield {"type":"token", "delta": chunk.text}
        
        yield {"type":"done", "text": final_text}
        
    except Exception as e:
        logger.exception("Gemini streaming error")
        yield {"type":"error", "error": str(e)}
        return
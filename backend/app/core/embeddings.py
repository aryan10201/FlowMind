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
    """Create embeddings using Google Gemini API"""
    if not texts:
        return []
    if not api_key:
        raise Exception("Gemini API key not provided for embeddings")
    
    try:
        genai.configure(api_key=api_key)
        embeddings = []
        for text in texts:
            result = genai.embed_content(
                model=model,
                content=text,
                task_type="retrieval_document"
            )
            embeddings.append(result['embedding'])
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

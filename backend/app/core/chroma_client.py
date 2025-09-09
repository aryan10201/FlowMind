import chromadb
import os
from loguru import logger

CHROMA_PERSIST_DIR = os.getenv("CHROMA_PERSIST_DIR", "./chroma_db")

# Initialize ChromaDB client with error handling
try:
    _client = chromadb.PersistentClient(path=CHROMA_PERSIST_DIR)
    logger.info(f"ChromaDB client initialized with path: {CHROMA_PERSIST_DIR}")
except Exception as e:
    logger.error(f"Failed to initialize ChromaDB client: {e}")
    # Fallback to in-memory client
    _client = chromadb.Client()
    logger.warning("Using in-memory ChromaDB client as fallback")

def get_client():
    return _client

def get_or_create_collection(name: str):
    try:
        return _client.get_or_create_collection(name)
    except Exception as e:
        logger.error(f"Failed to get or create collection '{name}': {e}")
        raise

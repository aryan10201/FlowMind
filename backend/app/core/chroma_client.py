import chromadb
import os

CHROMA_PERSIST_DIR = os.getenv("CHROMA_PERSIST_DIR", "./chroma_db")
_client = chromadb.PersistentClient(path=CHROMA_PERSIST_DIR)

def get_client():
    return _client

def get_or_create_collection(name: str):
    return _client.get_or_create_collection(name)

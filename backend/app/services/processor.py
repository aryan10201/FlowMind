import fitz
import uuid
from ..core.chroma_client import get_or_create_collection
from ..core.embeddings import embed_texts, embed_texts_with_provider
import os
from loguru import logger

CHROMA_COLLECTION = os.getenv("CHROMA_COLLECTION", "kb_collection")

def extract_text_from_pdf(file_bytes: bytes):
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    texts = []
    for page in doc:
        texts.append(page.get_text("text"))
    return "\n".join(texts)

def chunk_text(text, chunk_size=1000, overlap=200):
    out = []
    start = 0
    n = len(text)
    while start < n:
        end = min(start + chunk_size, n)
        out.append(text[start:end])
        start = end - overlap
        if start < 0:
            start = 0
    return out

def store_document_in_chroma(filename: str, text: str, metadata: dict = None, 
                           embedding_provider: str = "openai", embedding_api_key: str = None, 
                           embedding_model: str = None):
    chunks = chunk_text(text, chunk_size=1000, overlap=200)
    ids = [f"{uuid.uuid4()}" for _ in chunks]
    metadatas = [{"source": filename, "chunk_idx": idx, **(metadata or {})} for idx in range(len(chunks))]
    
    # Use the specified embedding provider
    if embedding_api_key and embedding_provider:
        embeddings = embed_texts_with_provider(embedding_api_key, chunks, embedding_provider, embedding_model)
    else:
        embeddings = embed_texts(chunks)
    
    coll = get_or_create_collection(CHROMA_COLLECTION)
    coll.add(documents=chunks, metadatas=metadatas, ids=ids, embeddings=embeddings)
    return {"stored_chunks": len(chunks)}

import fitz
import uuid
from ..core.chroma_client import get_or_create_collection
from ..core.embeddings import embed_texts, embed_texts_with_provider
import os
from loguru import logger

CHROMA_COLLECTION = os.getenv("CHROMA_COLLECTION", "kb_collection")

def extract_text_from_pdf(file_bytes: bytes):
    """Extract text from PDF with memory optimization"""
    doc = None
    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        texts = []
        
        # Process pages one by one to avoid memory issues
        for page_num in range(doc.page_count):
            page = doc[page_num]
            text = page.get_text("text")
            if text.strip():  # Only add non-empty pages
                texts.append(text)
            
            # Clear page from memory after processing
            page = None
            
            # Limit to reasonable number of pages to prevent OOM
            if page_num >= 100:  # Max 100 pages
                logger.warning(f"PDF has {doc.page_count} pages, processing only first 100 to prevent memory issues")
                break
        
        return "\n".join(texts)
    except Exception as e:
        logger.error(f"Error extracting text from PDF: {e}")
        raise
    finally:
        if doc:
            doc.close()

def chunk_text(text, chunk_size=1000, overlap=200):
    """Chunk text with memory optimization"""
    if not text or len(text) == 0:
        return []
    
    # Limit text size to prevent memory issues
    max_text_size = 500000  # 500KB limit
    if len(text) > max_text_size:
        logger.warning(f"Text size {len(text)} exceeds limit, truncating to {max_text_size} chars")
        text = text[:max_text_size]
    
    out = []
    start = 0
    n = len(text)
    
    while start < n:
        end = min(start + chunk_size, n)
        chunk = text[start:end]
        if chunk.strip():  # Only add non-empty chunks
            out.append(chunk)
        start = end - overlap
        if start < 0:
            start = 0
    return out

def store_document_in_chroma(filename: str, text: str, metadata: dict = None, 
                           embedding_provider: str = "openai", embedding_api_key: str = None, 
                           embedding_model: str = None):
    """Store document in ChromaDB with memory optimization"""
    chunks = chunk_text(text, chunk_size=1000, overlap=200)
    
    if not chunks:
        logger.warning("No chunks to store")
        return {"stored_chunks": 0}
    
    # Limit number of chunks to prevent memory issues
    max_chunks = 200
    if len(chunks) > max_chunks:
        logger.warning(f"Document has {len(chunks)} chunks, limiting to {max_chunks} to prevent memory issues")
        chunks = chunks[:max_chunks]
    
    ids = [f"{uuid.uuid4()}" for _ in chunks]
    metadatas = [{"source": filename, "chunk_idx": idx, **(metadata or {})} for idx in range(len(chunks))]
    
    try:
        # Process embeddings in smaller batches to avoid memory issues
        batch_size = 50  # Process 50 chunks at a time
        all_embeddings = []
        
        for i in range(0, len(chunks), batch_size):
            batch_chunks = chunks[i:i + batch_size]
            
            if embedding_api_key and embedding_provider:
                batch_embeddings = embed_texts_with_provider(embedding_api_key, batch_chunks, embedding_provider, embedding_model)
            else:
                batch_embeddings = embed_texts(batch_chunks)
            
            all_embeddings.extend(batch_embeddings)
            
            # Clear batch from memory
            batch_chunks = None
            batch_embeddings = None
        
        coll = get_or_create_collection(CHROMA_COLLECTION)
        coll.add(documents=chunks, metadatas=metadatas, ids=ids, embeddings=all_embeddings)
        
        logger.info(f"Successfully stored {len(chunks)} chunks for {filename}")
        return {"stored_chunks": len(chunks)}
        
    except Exception as e:
        logger.error(f"Error storing document in ChromaDB: {e}")
        raise

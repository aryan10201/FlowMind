from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from ..services.processor import extract_text_from_pdf, store_document_in_chroma
from ..db import SessionLocal
from ..models import Document
from sqlalchemy.orm import Session

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/upload", tags=["documents"])
async def upload_pdf(file: UploadFile = File(...), description: str = ""):
    # Validate file type
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDFs allowed")
    
    # Validate file size (10MB limit)
    max_size = 10 * 1024 * 1024  # 10MB
    contents = await file.read()
    if len(contents) > max_size:
        raise HTTPException(status_code=400, detail=f"File size ({len(contents) / 1024 / 1024:.1f}MB) exceeds 10MB limit")
    
    # Validate filename
    if not file.filename or not file.filename.strip():
        raise HTTPException(status_code=400, detail="Invalid filename")
    
    try:
        # Extract text with timeout
        import asyncio
        text = await asyncio.wait_for(
            _run_blocking(extract_text_from_pdf, contents),
            timeout=30.0  # 30 second timeout
        )
        
        if not text or not text.strip():
            raise HTTPException(status_code=400, detail="No text content found in PDF")
        
        # Store in ChromaDB with default settings
        result = store_document_in_chroma(file.filename, text, metadata={"description": description})
        
        # Store in database
        db: Session = next(get_db())
        try:
            doc = Document(filename=file.filename, description=description)
            db.add(doc)
            db.commit()
            db.refresh(doc)
            return {"success": True, "document_id": doc.id, "stored_chunks": result["stored_chunks"]}
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
        finally:
            db.close()
            
    except asyncio.TimeoutError:
        raise HTTPException(status_code=408, detail="File processing timeout")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File processing error: {str(e)}")

def _run_blocking(func, *args, **kwargs):
    """Helper function to run blocking operations in async context"""
    import asyncio
    import concurrent.futures
    
    loop = asyncio.get_event_loop()
    with concurrent.futures.ThreadPoolExecutor() as executor:
        return loop.run_in_executor(executor, func, *args, **kwargs)

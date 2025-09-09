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
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDFs allowed")
    contents = await file.read()
    text = extract_text_from_pdf(contents)
    result = store_document_in_chroma(file.filename, text, metadata={"description": description})
    db: Session = next(get_db())
    doc = Document(filename=file.filename, description=description)
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return {"success": True, "document_id": doc.id, "stored_chunks": result["stored_chunks"]}

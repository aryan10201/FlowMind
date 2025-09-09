from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from .api import upload, workflow
from .core.ws_manager import ws_manager
from .db import Base, engine, get_db_health
from .models import *
from loguru import logger
import os
import traceback

app = FastAPI(title="GenAI Stack Backend", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.exception(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "type": "internal_error"}
    )

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    db_healthy = get_db_health()
    return {
        "status": "healthy" if db_healthy else "unhealthy",
        "database": "connected" if db_healthy else "disconnected",
        "version": "1.0.0"
    }

# Favicon endpoint to prevent 404 errors
@app.get("/favicon.ico")
async def favicon():
    return {"message": "No favicon available"}

# Initialize database
try:
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created successfully")
except Exception as e:
    logger.error(f"Failed to create database tables: {e}")
    raise

app.include_router(upload.router, prefix="/api")
app.include_router(workflow.router, prefix="/api")

@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await ws_manager.connect(session_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_json({"type":"ack", "message": "ok"})
    except WebSocketDisconnect:
        await ws_manager.disconnect(session_id, websocket)
    except Exception as e:
        logger.exception(f"WebSocket error for session {session_id}: {e}")
        await ws_manager.disconnect(session_id, websocket)

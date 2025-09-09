from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from .api import upload, workflow
from .core.ws_manager import ws_manager
from .db import Base, engine
from .models import *
import os

app = FastAPI(title="GenAI Stack Backend")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

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

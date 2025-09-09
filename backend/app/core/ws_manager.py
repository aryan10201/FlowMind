from typing import Dict, List
from fastapi import WebSocket
from loguru import logger

class ConnectionManager:
    def __init__(self):
        self.active: Dict[str, List[WebSocket]] = {}

    async def connect(self, session_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active.setdefault(session_id, []).append(websocket)
        logger.info(f"WS connect {session_id}")

    async def disconnect(self, session_id: str, websocket: WebSocket):
        conns = self.active.get(session_id, [])
        if websocket in conns:
            conns.remove(websocket)

    async def send(self, session_id: str, message):
        conns = self.active.get(session_id, [])
        for ws in conns:
            try:
                # ensure JSON-serializable
                await ws.send_json(message if isinstance(message, dict) else {"type":"log","message": str(message)})
            except Exception:
                logger.exception("Failed WS send")

ws_manager = ConnectionManager()

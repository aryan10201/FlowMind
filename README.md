# GenAI Stack - No/Low Code Workflow Builder

## What is included
- Backend: FastAPI app with endpoints for uploading PDFs, saving/loading workflows, executing workflows and a WebSocket manager for streaming logs/tokens.
- Frontend: React + Vite + Tailwind + React Flow UI with draggable nodes, polished nodes, config panel, workflow save/load, and chat modal with streaming.
- Docker compose for quick local setup (Postgres + backend + frontend).

## Quick start (local)
1. Copy `.env.template` to `.env` and fill required keys (OPENAI_API_KEY).
2. Build & run with Docker:
   ```bash
   docker-compose up --build
   ```
3. Frontend: http://localhost:5173
   Backend: http://localhost:8000

## Notes
- This is a prototype. For production, add auth, proper error handling, secrets management, and secure session handling.
- The LLM streaming adapter uses OpenAI's streaming; adapt for other providers if needed.

from pydantic import BaseModel
from typing import Any, Dict, List, Optional

class UploadResponse(BaseModel):
    success: bool
    document_id: int

class WorkflowDefinition(BaseModel):
    name: str
    description: Optional[str] = ""
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]

class ExecuteRequest(BaseModel):
    workflow_id: int
    query: str
    session_id: Optional[str] = None

class ExecutionResult(BaseModel):
    output: str

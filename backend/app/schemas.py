from pydantic import BaseModel, Field, validator
from typing import Any, Dict, List, Optional
import re

class UploadResponse(BaseModel):
    success: bool
    document_id: int
    stored_chunks: int

class WorkflowDefinition(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field("", max_length=500)
    nodes: List[Dict[str, Any]] = Field(..., min_items=1)
    edges: List[Dict[str, Any]] = Field(default_factory=list)
    
    @validator('name')
    def validate_name(cls, v):
        if not v or not v.strip():
            raise ValueError('Workflow name cannot be empty')
        return v.strip()

class ExecuteRequest(BaseModel):
    workflow_id: int = Field(..., gt=0)
    query: str = Field(..., min_length=1, max_length=1000)
    session_id: Optional[str] = Field(None, max_length=100)
    api_keys: Optional[Dict[str, str]] = Field(default_factory=dict)
    node_configs: Optional[Dict[str, Any]] = Field(default_factory=dict)
    chat_history: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    
    @validator('query')
    def validate_query(cls, v):
        if not v or not v.strip():
            raise ValueError('Query cannot be empty')
        return v.strip()
    
    @validator('api_keys')
    def validate_api_keys(cls, v):
        if v:
            for key, value in v.items():
                if not isinstance(value, str) or not value.strip():
                    raise ValueError(f'API key for {key} cannot be empty')
        return v

class ExecutionResult(BaseModel):
    output: str
    session_id: Optional[str] = None

class HealthResponse(BaseModel):
    status: str
    database: str
    version: str

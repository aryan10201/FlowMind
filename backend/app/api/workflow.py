from fastapi import APIRouter, HTTPException
from ..schemas import WorkflowDefinition
from ..db import SessionLocal
from ..models import Workflow, ChatLog
from ..services.graph_orchestrator import execute_graph
from ..services.workflow_validator import validate_workflow, validate_node_configuration
from ..core.ws_manager import ws_manager
from loguru import logger
import json
import uuid

router = APIRouter()

@router.post("/workflows", tags=["workflow"])
def create_workflow(defn: WorkflowDefinition):
    try:
        logger.info(f"Creating workflow: name='{defn.name}', nodes={len(defn.nodes)}, edges={len(defn.edges)}")
        
        # For empty workflows (initial creation), skip validation
        if not defn.nodes or len(defn.nodes) == 0:
            db = SessionLocal()
            try:
                wf = Workflow(name=defn.name, description=defn.description or "", definition=json.dumps({"nodes":defn.nodes, "edges": defn.edges}))
                db.add(wf)
                db.commit()
                db.refresh(wf)
                return {"workflow_id": wf.id, "message": "Workflow created successfully"}
            except Exception as e:
                db.rollback()
                raise HTTPException(status_code=500, detail=f"Failed to create workflow: {str(e)}")
            finally:
                db.close()
        
        # For workflows with nodes, validate structure
        is_valid, errors = validate_workflow(defn.nodes, defn.edges)
        if not is_valid:
            raise HTTPException(status_code=400, detail=f"Workflow validation failed: {'; '.join(errors)}")
        
        # Validate individual node configurations
        for node in defn.nodes:
            node_valid, node_errors = validate_node_configuration(node)
            if not node_valid:
                raise HTTPException(status_code=400, detail=f"Node {node.get('id', 'unknown')} validation failed: {'; '.join(node_errors)}")
        
        db = SessionLocal()
        try:
            wf = Workflow(name=defn.name, description=defn.description or "", definition=json.dumps({"nodes":defn.nodes, "edges": defn.edges}))
            db.add(wf)
            db.commit()
            db.refresh(wf)
            return {"workflow_id": wf.id, "message": "Workflow created successfully"}
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to create workflow: {str(e)}")
        finally:
            db.close()
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Unexpected error creating workflow: {e}")
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

@router.post("/workflows/{workflow_id}/execute", tags=["workflow"])
async def run_workflow(workflow_id: int, req: dict):
    db = SessionLocal()
    wf = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if not wf:
        raise HTTPException(404, "Workflow not found")
    definition = json.loads(wf.definition)
    session_id = req.get("session_id") or str(uuid.uuid4())
    
    # Extract API keys and config from request
    execution_context = {
        "query": req.get("query"),
        "api_keys": req.get("api_keys", {}),
        "node_configs": req.get("node_configs", {}),
        "chat_history": req.get("chat_history", [])
    }
    
    try:
        outputs = await execute_graph(definition.get("nodes", []), definition.get("edges", []), execution_context, session_id=session_id)
        # store chat log (take first output)
        if outputs and len(outputs) > 0:
            output_data = outputs[0]["value"] if "value" in outputs[0] else outputs[0]
            # Extract the actual text from the output data
            if isinstance(output_data, dict):
                out_text = output_data.get("final", output_data.get("output", str(output_data)))
            else:
                out_text = str(output_data)
        else:
            out_text = ""
        
        log = ChatLog(workflow_id=workflow_id, user_query=req.get("query"), response=out_text)
        db.add(log)
        db.commit()
        return {"session_id": session_id, "output": out_text}
    except Exception as e:
        logger.exception("Workflow execution failed")
        # Send error via WebSocket if session_id exists
        if session_id:
            from ..core.ws_manager import ws_manager
            await ws_manager.send(session_id, {"type":"error","message": str(e)})
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/workflows", tags=["workflow"])
def list_workflows():
    db = SessionLocal()
    wfs = db.query(Workflow).order_by(Workflow.created_at.desc()).all()
    result = [{"id": w.id, "workflow_id": w.id, "name": w.name, "description": w.description or "", "created_at": w.created_at.isoformat()} for w in wfs]
    return {"workflows": result}

@router.get("/workflows/{workflow_id}", tags=["workflow"])
def get_workflow(workflow_id: int):
    db = SessionLocal()
    wf = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    try:
        definition = json.loads(wf.definition)
    except Exception:
        definition = {"nodes": [], "edges": []}
    return {"workflow_id": wf.id, "name": wf.name, "description": wf.description or "", "definition": definition}

@router.get("/workflows/{workflow_id}/chat-history", tags=["workflow"])
def get_chat_history(workflow_id: int, limit: int = 50):
    db = SessionLocal()
    wf = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    logs = db.query(ChatLog).filter(ChatLog.workflow_id == workflow_id).order_by(ChatLog.created_at.desc()).limit(limit).all()
    return {"chat_history": [{"id": log.id, "user_query": log.user_query, "response": log.response, "created_at": log.created_at.isoformat()} for log in logs]}

@router.put("/workflows/{workflow_id}", tags=["workflow"])
def update_workflow(workflow_id: int, defn: WorkflowDefinition):
    # Validate workflow structure
    is_valid, errors = validate_workflow(defn.nodes, defn.edges)
    if not is_valid:
        raise HTTPException(status_code=400, detail=f"Workflow validation failed: {'; '.join(errors)}")
    
    # Validate individual node configurations
    for node in defn.nodes:
        node_valid, node_errors = validate_node_configuration(node)
        if not node_valid:
            raise HTTPException(status_code=400, detail=f"Node {node.get('id', 'unknown')} validation failed: {'; '.join(node_errors)}")
    
    db = SessionLocal()
    try:
        wf = db.query(Workflow).filter(Workflow.id == workflow_id).first()
        if not wf:
            raise HTTPException(status_code=404, detail="Workflow not found")
        
        wf.name = defn.name
        wf.description = defn.description or ""
        wf.definition = json.dumps({"nodes": defn.nodes, "edges": defn.edges})
        db.commit()
        
        return {"message": "Workflow updated successfully", "workflow_id": wf.id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update workflow: {str(e)}")
    finally:
        db.close()

@router.delete("/workflows/{workflow_id}", tags=["workflow"])
def delete_workflow(workflow_id: int):
    db = SessionLocal()
    try:
        wf = db.query(Workflow).filter(Workflow.id == workflow_id).first()
        if not wf:
            raise HTTPException(status_code=404, detail="Workflow not found")
        
        # Delete associated chat logs first
        db.query(ChatLog).filter(ChatLog.workflow_id == workflow_id).delete()
        
        # Delete the workflow
        db.delete(wf)
        db.commit()
        
        return {"message": "Workflow deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete workflow: {str(e)}")
    finally:
        db.close()

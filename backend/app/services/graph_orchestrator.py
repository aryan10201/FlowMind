import asyncio
from typing import List, Dict, Any
from ..core.ws_manager import ws_manager
from .node_executors import get_executor
from loguru import logger

class GraphExecutionError(Exception):
    pass

def build_levels(nodes: List[Dict[str, Any]], edges: List[Dict[str, Any]]):
    node_ids = {n["id"] for n in nodes}
    indegree = {nid: 0 for nid in node_ids}
    adj = {nid: [] for nid in node_ids}

    for e in edges:
        s, t = e["source"], e["target"]
        if s in node_ids and t in node_ids:
            adj[s].append(e)
            indegree[t] += 1

    queue = [nid for nid, deg in indegree.items() if deg == 0]
    levels = []
    while queue:
        this_level = queue[:]
        levels.append(this_level)
        queue = []
        for n in this_level:
            for e in adj.get(n, []):
                tgt = e["target"]
                indegree[tgt] -= 1
                if indegree[tgt] == 0:
                    queue.append(tgt)

    if sum(len(l) for l in levels) != len(node_ids):
        raise GraphExecutionError("Cycle detected in workflow graph")

    return levels

async def execute_graph(nodes: List[Dict[str, Any]], edges: List[Dict[str, Any]],
                        initial_inputs: Dict[str, Any], session_id: str = None):
    node_map = {n["id"]: n for n in nodes}
    out_map: Dict[str, Dict[str, Any]] = {}
    in_map: Dict[str, Dict[str, Any]] = {nid: {} for nid in node_map}

    for nid in in_map:
        in_map[nid].update(initial_inputs)

    edges_by_source = {}
    for e in edges:
        edges_by_source.setdefault(e["source"], []).append(e)

    outputs_collection = []

    levels = build_levels(nodes, edges)
    if session_id:
        await ws_manager.send(session_id, {"type":"log","message":f"Execution plan has {len(levels)} levels"})

    for level in levels:
        if session_id:
            await ws_manager.send(session_id, {"type":"log","message":f"Executing level with nodes {level}"})

        async def run_node(nid: str):
            node = node_map[nid]
            node_type = node.get("type")
            executor = get_executor(node_type)
            if not executor:
                msg = f"No executor for node type {node_type}"
                if session_id:
                    await ws_manager.send(session_id, {"type":"error","message": msg})
                raise GraphExecutionError(msg)

            inputs = in_map[nid]
            if session_id:
                await ws_manager.send(session_id, {"type":"log","message":f"Executing node {nid} ({node_type}) with inputs keys: {list(inputs.keys())}"})
            try:
                context = {
                    "session_id": session_id,
                    "api_keys": initial_inputs.get("api_keys", {}),
                    "node_configs": initial_inputs.get("node_configs", {}),
                    "chat_history": initial_inputs.get("chat_history", [])
                }
                result = await executor(node, inputs, context)
            except Exception as e:
                logger.exception(f"Node {nid} execution failed")
                if session_id:
                    await ws_manager.send(session_id, {"type":"error","message": str(e)})
                raise
            out_map[nid] = result or {}

            for e in edges_by_source.get(nid, []):
                tgt = e["target"]
                s_handle = e.get("sourceHandle")
                t_handle = e.get("targetHandle")
                val = None
                if s_handle:
                    val = result.get(s_handle)
                else:
                    if result:
                        val = next(iter(result.values()))
                if t_handle:
                    in_map[tgt][t_handle] = val
                else:
                    in_map[tgt][s_handle or "output"] = val
                
                # Debug logging for edge connections
                if session_id:
                    await ws_manager.send(session_id, {"type":"log","message":f"Edge: {nid}({s_handle}) -> {tgt}({t_handle}), value type: {type(val)}, value length: {len(str(val)) if val else 0}"})

            if node_type == "output":
                final = result.get("final") or result.get("output") or result
                outputs_collection.append({"node_id": nid, "value": final})

        await asyncio.gather(*(run_node(nid) for nid in level))

    if session_id:
        await ws_manager.send(session_id, {"type":"log","message":"Graph execution finished."})
    return outputs_collection

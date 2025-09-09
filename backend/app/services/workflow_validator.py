from typing import Dict, List, Any, Tuple

def validate_workflow(nodes: List[Dict[str, Any]], edges: List[Dict[str, Any]]) -> Tuple[bool, List[str]]:
    """
    Validate a workflow definition for correctness and completeness.
    
    Args:
        nodes: List of workflow nodes
        edges: List of workflow edges/connections
        
    Returns:
        Tuple of (is_valid, list_of_errors)
    """
    errors = []
    
    # Check if we have any nodes
    if not nodes:
        errors.append("Workflow must contain at least one component")
        return False, errors
    
    # Check for required components - only User Query and Output are required
    node_types = [node.get("type") for node in nodes]
    required_components = ["user_query", "output"]
    
    for component in required_components:
        if component not in node_types:
            errors.append(f"Workflow must include a {component.replace('_', ' ').title()} component")
    
    # Check for valid connections
    if not edges:
        errors.append("Components must be connected together")
        return len(errors) == 0, errors
    
    # Create a mapping of node IDs to types
    node_id_to_type = {node["id"]: node["type"] for node in nodes}
    
    # Validate that all edges reference existing nodes
    for edge in edges:
        source = edge.get("source")
        target = edge.get("target")
        if source not in node_id_to_type:
            errors.append(f"Edge references non-existent source node: {source}")
        if target not in node_id_to_type:
            errors.append(f"Edge references non-existent target node: {target}")
    
    # If we have edge validation errors, return early
    if errors:
        return False, errors
    
    # Check for proper flow - flexible validation based on available components
    user_query_nodes = [node["id"] for node in nodes if node["type"] == "user_query"]
    llm_nodes = [node["id"] for node in nodes if node["type"] == "llm"]
    output_nodes = [node["id"] for node in nodes if node["type"] == "output"]
    knowledgebase_nodes = [node["id"] for node in nodes if node["type"] == "knowledgebase"]
    websearch_nodes = [node["id"] for node in nodes if node["type"] == "websearch"]
    
    # Check if User Query connects to something
    if user_query_nodes:
        user_connected = any(
            edge["source"] in user_query_nodes
            for edge in edges
        )
        if not user_connected:
            errors.append("User Query component must be connected to another component")
    
    # Check if Output receives input from something
    if output_nodes:
        output_connected = any(
            edge["target"] in output_nodes
            for edge in edges
        )
        if not output_connected:
            errors.append("Output component must receive input from another component")
    
    # If LLM is present, it should be connected properly
    if llm_nodes:
        # LLM should receive input from User Query or other components
        llm_has_input = any(
            edge["target"] in llm_nodes
            for edge in edges
        )
        if not llm_has_input:
            errors.append("LLM Engine component must receive input from another component")
        
        # LLM should output to something (preferably Output)
        llm_has_output = any(
            edge["source"] in llm_nodes
            for edge in edges
        )
        if not llm_has_output:
            errors.append("LLM Engine component must output to another component")
    
    # If Knowledge Base is present, it should connect to LLM (if LLM exists) or Output
    if knowledgebase_nodes:
        if llm_nodes:
            # If LLM exists, Knowledge Base should connect to it
            kb_connected = any(
                edge["source"] in knowledgebase_nodes and edge["target"] in llm_nodes
                for edge in edges
            )
            if not kb_connected:
                errors.append("Knowledge Base component should be connected to LLM Engine")
        else:
            # If no LLM, Knowledge Base can connect directly to Output
            kb_connected = any(
                edge["source"] in knowledgebase_nodes and edge["target"] in output_nodes
                for edge in edges
            )
            if not kb_connected:
                errors.append("Knowledge Base component should be connected to Output component")
    
    # If Web Search is present, it should connect to LLM (if LLM exists) or Output
    if websearch_nodes:
        if llm_nodes:
            # If LLM exists, Web Search should connect to it
            ws_connected = any(
                edge["source"] in websearch_nodes and edge["target"] in llm_nodes
                for edge in edges
            )
            if not ws_connected:
                errors.append("Web Search component should be connected to LLM Engine")
        else:
            # If no LLM, Web Search can connect directly to Output
            ws_connected = any(
                edge["source"] in websearch_nodes and edge["target"] in output_nodes
                for edge in edges
            )
            if not ws_connected:
                errors.append("Web Search component should be connected to Output component")
    
    # Check for circular dependencies
    if has_circular_dependency(nodes, edges):
        errors.append("Workflow contains circular dependencies")
    
    # Check for orphaned nodes (nodes with no connections)
    connected_nodes = set()
    for edge in edges:
        connected_nodes.add(edge["source"])
        connected_nodes.add(edge["target"])
    
    orphaned_nodes = [node["id"] for node in nodes if node["id"] not in connected_nodes]
    if orphaned_nodes:
        errors.append(f"Orphaned components found: {', '.join(orphaned_nodes)}")
    
    return len(errors) == 0, errors

def has_circular_dependency(nodes: List[Dict[str, Any]], edges: List[Dict[str, Any]]) -> bool:
    """
    Check if the workflow has circular dependencies using DFS.
    """
    # Build adjacency list - only include nodes that exist
    node_ids = {node["id"] for node in nodes}
    graph = {node["id"]: [] for node in nodes}
    
    # Only add edges where both source and target exist in nodes
    for edge in edges:
        source = edge.get("source")
        target = edge.get("target")
        if source in node_ids and target in node_ids:
            graph[source].append(target)
    
    # DFS to detect cycles
    visited = set()
    rec_stack = set()
    
    def has_cycle(node):
        if node not in graph:  # Safety check
            return False
            
        visited.add(node)
        rec_stack.add(node)
        
        for neighbor in graph[node]:
            if neighbor not in visited:
                if has_cycle(neighbor):
                    return True
            elif neighbor in rec_stack:
                return True
        
        rec_stack.remove(node)
        return False
    
    for node in graph:
        if node not in visited:
            if has_cycle(node):
                return True
    
    return False

def validate_node_configuration(node: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """
    Validate individual node configuration.
    
    Args:
        node: Node configuration dictionary
        
    Returns:
        Tuple of (is_valid, list_of_errors)
    """
    errors = []
    node_type = node.get("type")
    config = node.get("data", {}).get("config", {})
    
    if node_type == "user_query":
        # User Query doesn't need specific validation
        pass
    elif node_type == "knowledgebase":
        if not config.get("embedding_api_key"):
            errors.append("Knowledge Base requires an embedding API key")
    elif node_type == "llm":
        if not config.get("api_key"):
            errors.append("LLM Engine requires an API key")
        if not config.get("provider"):
            errors.append("LLM Engine requires a provider selection")
    elif node_type == "websearch":
        if not config.get("serp_api_key"):
            errors.append("Web Search requires a SERP API key")
    elif node_type == "output":
        # Output doesn't need specific validation
        pass
    
    return len(errors) == 0, errors

import React, { useCallback, useRef, useState, useEffect, useMemo } from "react";
import ReactFlow, {
  addEdge,
  MiniMap,
  Controls,
  Background,
  ReactFlowProvider,
  useNodesState,
  useEdgesState
} from "reactflow";
import "reactflow/dist/style.css";
import axios from "axios";

import UserQueryNode from "./nodes/UserQueryNode";
import KnowledgeBaseNode from "./nodes/KnowledgeBaseNode";
import WebSearchNode from "./nodes/WebSearchNode";
import LLMNode from "./nodes/LLMNode";
import OutputNode from "./nodes/OutputNode";

// This will be defined inside the component to access onNodesDelete

function FlowCanvas({ setSelectedNode, setWorkflowId, loadedWorkflow, setCurrentNodes, onSaveWorkflow, selectedNode }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [workflowId, setWorkflowIdLocal] = useState(null);
  const reactFlowWrapper = useRef(null);

  useEffect(() => {
    if (!loadedWorkflow) return;
    const def = loadedWorkflow.definition || {};
    const incomingNodes = (def.nodes || []).map(n => ({
      ...n,
      position: n.position || { x: 100, y: 100 },
      data: n.data || { config: {} }
    }));
    const incomingEdges = (def.edges || []).map(e => ({ ...e }));
    setNodes(incomingNodes);
    setEdges(incomingEdges);
    setWorkflowIdLocal(loadedWorkflow.workflow_id);
    setWorkflowId(loadedWorkflow.workflow_id);
  }, [loadedWorkflow, setNodes, setEdges, setWorkflowId]);

  // Update current nodes whenever nodes change
  useEffect(() => {
    setCurrentNodes(nodes);
  }, [nodes, setCurrentNodes]);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodesDelete = useCallback(
    (deleted) => {
      setNodes((nds) => nds.filter((node) => !deleted.includes(node)));
    },
    [setNodes]
  );

  const deleteNode = useCallback(
    (nodeId) => {
      setNodes((nds) => nds.filter((node) => node.id !== nodeId));
      // Also remove any edges connected to this node
      setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
    },
    [setNodes, setEdges]
  );

  const nodeTypes = useMemo(() => ({
    user_query: (props) => <UserQueryNode {...props} onDelete={() => deleteNode(props.id)} />,
    knowledgebase: (props) => <KnowledgeBaseNode {...props} onDelete={() => deleteNode(props.id)} />,
    websearch: (props) => <WebSearchNode {...props} onDelete={() => deleteNode(props.id)} />,
    llm: (props) => <LLMNode {...props} onDelete={() => deleteNode(props.id)} />,
    output: (props) => <OutputNode {...props} onDelete={() => deleteNode(props.id)} />
  }), [deleteNode]);

  const onDrop = useCallback((event) => {
    event.preventDefault();
    const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
    const type = event.dataTransfer.getData("component");
    if (!type) return;
    
    const position = {
      x: event.clientX - reactFlowBounds.left,
      y: event.clientY - reactFlowBounds.top
    };
    
    const id = `${type}_${Date.now()}`;
    const newNode = {
      id,
      type,
      position,
      data: { 
        label: type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        config: {} 
      }
    };
    
    setNodes((nds) => [...nds, newNode]);
  }, [setNodes]);

  // Workflow validation function
  const validateWorkflow = () => {
    const errors = [];
    
    // If no nodes, it's valid (empty workflow)
    if (nodes.length === 0) {
      return { isValid: true, errors: [] };
    }
    
    // Check for required components - only User Query and Output are required
    const nodeTypes = nodes.map(n => n.type);
    const hasUserQuery = nodeTypes.includes('user_query');
    const hasOutput = nodeTypes.includes('output');
    
    if (!hasUserQuery) {
      errors.push("Workflow must include a User Query component");
    }
    if (!hasOutput) {
      errors.push("Workflow must include an Output component");
    }
    
    // Check for valid connections
    if (edges.length === 0) {
      errors.push("Please connect the components together");
    }
    
    // Check for proper flow - flexible validation based on available components
    const userQueryNodes = nodes.filter(n => n.type === 'user_query');
    const llmNodes = nodes.filter(n => n.type === 'llm');
    const outputNodes = nodes.filter(n => n.type === 'output');
    const knowledgebaseNodes = nodes.filter(n => n.type === 'knowledgebase');
    const websearchNodes = nodes.filter(n => n.type === 'websearch');
    
    // Check if User Query connects to something
    if (hasUserQuery) {
      const userConnected = edges.some(edge => 
        userQueryNodes.some(uq => uq.id === edge.source)
      );
      if (!userConnected) {
        errors.push("User Query component must be connected to another component");
      }
    }
    
    // Check if Output receives input from something
    if (hasOutput) {
      const outputConnected = edges.some(edge => 
        outputNodes.some(out => out.id === edge.target)
      );
      if (!outputConnected) {
        errors.push("Output component must receive input from another component");
      }
    }
    
    // If LLM is present, it should be connected properly
    const hasLLM = nodeTypes.includes('llm');
    if (hasLLM) {
      // LLM should receive input from User Query or other components
      const llmHasInput = edges.some(edge => 
        llmNodes.some(llm => llm.id === edge.target)
      );
      if (!llmHasInput) {
        errors.push("LLM Engine component must receive input from another component");
      }
      
      // LLM should output to something (preferably Output)
      const llmHasOutput = edges.some(edge => 
        llmNodes.some(llm => llm.id === edge.source)
      );
      if (!llmHasOutput) {
        errors.push("LLM Engine component must output to another component");
      }
    }
    
    // If Knowledge Base is present, it should connect to LLM (if LLM exists) or Output
    const hasKnowledgeBase = nodeTypes.includes('knowledgebase');
    if (hasKnowledgeBase) {
      if (hasLLM) {
        // If LLM exists, Knowledge Base should connect to it
        const kbConnected = edges.some(edge => 
          knowledgebaseNodes.some(kb => kb.id === edge.source) && 
          llmNodes.some(llm => llm.id === edge.target)
        );
        if (!kbConnected) {
          errors.push("Knowledge Base component should be connected to LLM Engine");
        }
      } else {
        // If no LLM, Knowledge Base can connect directly to Output
        const kbConnected = edges.some(edge => 
          knowledgebaseNodes.some(kb => kb.id === edge.source) && 
          outputNodes.some(out => out.id === edge.target)
        );
        if (!kbConnected) {
          errors.push("Knowledge Base component should be connected to Output component");
        }
      }
    }
    
    // If Web Search is present, it should connect to LLM (if LLM exists) or Output
    const hasWebSearch = nodeTypes.includes('websearch');
    if (hasWebSearch) {
      if (hasLLM) {
        // If LLM exists, Web Search should connect to it
        const wsConnected = edges.some(edge => 
          websearchNodes.some(ws => ws.id === edge.source) && 
          llmNodes.some(llm => llm.id === edge.target)
        );
        if (!wsConnected) {
          errors.push("Web Search component should be connected to LLM Engine");
        }
      } else {
        // If no LLM, Web Search can connect directly to Output
        const wsConnected = edges.some(edge => 
          websearchNodes.some(ws => ws.id === edge.source) && 
          outputNodes.some(out => out.id === edge.target)
        );
        if (!wsConnected) {
          errors.push("Web Search component should be connected to Output component");
        }
      }
    }
    
    return { isValid: errors.length === 0, errors };
  };

  const buildWorkflow = async () => {
    // Only validate if we have nodes
    if (nodes.length > 0) {
      const validation = validateWorkflow();
      
      if (!validation.isValid) {
        alert("❌ Workflow validation failed:\n" + validation.errors.join("\n"));
        return;
      }
    }
    
    // If we already have a workflow ID, update it instead of creating new
    if (workflowId) {
      try {
        const payload = {
          name: loadedWorkflow?.name || `FlowMind_${Date.now()}`,
          description: loadedWorkflow?.description || "Updated workflow",
          nodes: nodes.map(node => ({
            id: node.id,
            type: node.type,
            position: node.position,
            data: node.data
          })),
          edges: edges.map(edge => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            sourceHandle: edge.sourceHandle,
            targetHandle: edge.targetHandle
          }))
        };
        
        console.log("Updating workflow:", payload);
        
        // Update the existing workflow
        const res = await axios.put(
          `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/workflows/${workflowId}`,
          payload
        );
        
        alert(`✅ Workflow updated successfully!`);
      } catch (err) {
        console.error("Update workflow failed", err);
        alert(`❌ Failed to update workflow: ${err.response?.data?.detail || err.message}`);
      }
    } else {
      // Create new workflow - this should only happen when creating a new stack
    try {
      const payload = {
          name: `FlowMind_${Date.now()}`,
          description: "Auto-generated workflow",
          nodes: nodes.map(node => ({
            id: node.id,
            type: node.type,
            position: node.position,
            data: node.data
          })),
          edges: edges.map(edge => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            sourceHandle: edge.sourceHandle,
            targetHandle: edge.targetHandle
          }))
        };
        
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/workflows`,
        payload
      );
      const wid = res.data.workflow_id;
        setWorkflowIdLocal(wid);
      setWorkflowId(wid);
        alert(`✅ FlowMind saved! ID: ${wid}`);
    } catch (err) {
      console.error("Build workflow failed", err);
        alert(`❌ Failed to save workflow: ${err.response?.data?.detail || err.message}`);
      }
    }
  };

  const validation = validateWorkflow();
  const hasWorkflow = workflowId !== null;

  return (
    <div className="flex-1 flex flex-col" ref={reactFlowWrapper}>
      <div className="bg-white border-b p-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h3 className="font-semibold text-gray-700 text-lg">FlowMind Canvas</h3>
          <div className="flex items-center gap-2">
            {validation.isValid ? (
              <div className="flex items-center gap-1 text-green-600 text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Valid Workflow
              </div>
            ) : (
              <div className="flex items-center gap-1 text-red-600 text-sm">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                {validation.errors.length} Issue{validation.errors.length !== 1 ? 's' : ''}
              </div>
            )}
            {hasWorkflow && (
              <div className="flex items-center gap-1 text-blue-600 text-sm">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                Workflow ID: {workflowId}
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={buildWorkflow}
            className="px-4 py-2 bg-green-600 text-white rounded-md shadow hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            disabled={!validation.isValid}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            {nodes.length === 0 ? "Save Empty Stack" : (validation.isValid ? "Save" : "Fix Issues First")}
          </button>
          <button
            onClick={() => {
              setNodes([]);
              setEdges([]);
              setWorkflowIdLocal(null);
              setWorkflowId(null);
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-md shadow hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={nodes.length === 0}
          >
            Clear All
          </button>
        </div>
      </div>

      {!validation.isValid && validation.errors.length > 0 && (
        <div className="bg-red-50 border-b border-red-200 p-3">
          <div className="text-red-800 text-sm font-medium mb-1">Workflow Issues:</div>
          <ul className="text-red-700 text-sm space-y-1">
            {validation.errors.map((error, index) => (
              <li key={index} className="flex items-center gap-2">
                <span className="text-red-500">•</span>
                {error}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex-1 relative">
          <ReactFlow
          key="reactflow-canvas"
            nodes={nodes}
            edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
            onConnect={onConnect}
          onNodeClick={(e, node) => {
            // Only open config panel if the title area is clicked
            const target = e.target;
            const isTitleClick = target.closest('.node-title') || target.closest('.node-header');
            if (isTitleClick) {
              setSelectedNode(node);
            }
          }}
          onNodesDelete={onNodesDelete}
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
            nodeTypes={nodeTypes}
            fitView
            snapToGrid
            snapGrid={[16, 16]}
          connectionLineType="smoothstep"
          defaultEdgeOptions={{ type: 'smoothstep' }}
          deleteKeyCode={['Backspace', 'Delete']}
        >
          <MiniMap 
            zoomable 
            pannable 
            nodeColor={(node) => {
              switch (node.type) {
                case 'user_query': return '#3b82f6';
                case 'knowledgebase': return '#10b981';
                case 'websearch': return '#f59e0b';
                case 'llm': return '#8b5cf6';
                case 'output': return '#6b7280';
                default: return '#e5e7eb';
              }
            }}
          />
          <Controls 
            showInteractive 
            showFitView
            showZoom
          />
            <Background gap={16} color="#e5e7eb" />
          </ReactFlow>
        
        {/* Welcome overlay for empty canvas */}
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="text-center max-w-lg mx-auto p-8 bg-white/95 backdrop-blur-sm rounded-xl shadow-xl border border-gray-200">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-3">Welcome to FlowMind</h2>
              <p className="text-gray-600 mb-8 text-lg">
                Build intelligent AI workflows by dragging components from the sidebar. 
                Connect them together to create powerful automation flows.
              </p>
              <div className="space-y-4">
                <div className="flex items-center gap-4 text-sm text-gray-700">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 font-bold">1</span>
                  </div>
                  <span>Drag components from the sidebar to the canvas</span>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-700">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-green-600 font-bold">2</span>
                  </div>
                  <span>Connect components by dragging from output to input handles</span>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-700">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-purple-600 font-bold">3</span>
                  </div>
                  <span>Configure each component with your API keys and settings</span>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-700">
                  <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-yellow-600 font-bold">4</span>
                  </div>
                  <span>Click "Save" to save and test your workflow</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
);
}

export default function Canvas(props) {
  return (
    <ReactFlowProvider>
      <FlowCanvas {...props} />
    </ReactFlowProvider>
);
}

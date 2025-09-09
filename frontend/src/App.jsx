import React, { useState } from "react";
import LandingPage from "./LandingPage";
import Sidebar from "./Sidebar";
import Canvas from "./flow/Canvas";
import ChatModal from "./ChatModal";
import WorkflowListModal from "./components/WorkflowListModal";
import WorkflowSaveModal from "./components/WorkflowSaveModal";
import ComponentConfigPanel from "./components/ComponentConfigPanel";

export default function App() {
  const [currentView, setCurrentView] = useState("landing"); // "landing" or "workflow"
  const [selectedNode, setSelectedNode] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [workflowId, setWorkflowId] = useState(null);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [loadedWorkflow, setLoadedWorkflow] = useState(null);
  const [currentNodes, setCurrentNodes] = useState([]);
  const [showConfigPanel, setShowConfigPanel] = useState(false);

  const handleSaveWorkflow = async (name, description) => {
    try {
      // Create a new empty workflow first
      const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/workflows`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          description,
          nodes: [],
          edges: []
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Workflow creation error:', errorData);
        throw new Error(errorData.detail || errorData.message || 'Failed to create workflow');
      }

      const data = await response.json();
      const workflowId = data.workflow_id;
      
      // Now enter the workflow builder with the new workflow
      setWorkflowId(workflowId);
      setCurrentView("workflow");
      setLoadedWorkflow({
        workflow_id: workflowId,
        name,
        definition: { nodes: [], edges: [] }
      });
      
      // Close the modal
      setShowSaveModal(false);
      
      return data;
    } catch (error) {
      console.error('Error creating workflow:', error);
      throw error;
    }
  };

  const handleNodeSelect = (node) => {
    // Toggle config panel - close if same node is clicked again
    if (selectedNode && selectedNode.id === node.id) {
      setSelectedNode(null);
      setShowConfigPanel(false);
    } else {
      setSelectedNode(node);
      setShowConfigPanel(true);
    }
  };

  const handleEnterWorkflow = () => {
    setCurrentView("workflow");
    setLoadedWorkflow(null);
    setWorkflowId(null);
  };

  const handleCreateNewStack = () => {
    setShowSaveModal(true);
  };

  const handleLoadWorkflow = async (workflow, runImmediately = false) => {
    try {
      // Fetch the full workflow data including definition
      const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/workflows/${workflow.workflow_id || workflow.id}`);
      if (!response.ok) {
        throw new Error('Failed to load workflow');
      }
      const fullWorkflow = await response.json();
      
      setCurrentView("workflow");
      setLoadedWorkflow(fullWorkflow);
      setWorkflowId(fullWorkflow.workflow_id);
      
      if (runImmediately) {
        setShowChat(true);
      }
    } catch (error) {
      console.error('Error loading workflow:', error);
      alert('Failed to load workflow: ' + error.message);
    }
  };

  const handleBackToLanding = () => {
    setCurrentView("landing");
    setLoadedWorkflow(null);
    setWorkflowId(null);
    setCurrentNodes([]);
    setSelectedNode(null);
    setShowConfigPanel(false);
    setShowChat(false);
  };

  if (currentView === "landing") {
    return (
      <>
        <LandingPage 
          onEnterWorkflow={handleEnterWorkflow}
          onLoadWorkflow={handleLoadWorkflow}
          onCreateNewStack={handleCreateNewStack}
        />
        {showSaveModal && (
          <WorkflowSaveModal
            onClose={() => setShowSaveModal(false)}
            onSave={handleSaveWorkflow}
          />
        )}
      </>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar 
        onOpenChat={() => setShowChat(true)} 
        workflowId={workflowId} 
        onBackToLanding={handleBackToLanding}
      />
      <div className="flex flex-1">
        <Canvas
          setSelectedNode={handleNodeSelect}
          setWorkflowId={setWorkflowId}
          loadedWorkflow={loadedWorkflow}
          setCurrentNodes={setCurrentNodes}
          onSaveWorkflow={handleSaveWorkflow}
          selectedNode={selectedNode}
        />
        {showConfigPanel && (
          <div className="w-80 flex-shrink-0">
            <ComponentConfigPanel 
              selectedNode={selectedNode} 
              onClose={() => setShowConfigPanel(false)} 
            />
          </div>
        )}
      </div>
      {showChat && <ChatModal onClose={() => setShowChat(false)} workflowId={workflowId} nodes={currentNodes} />}
      {showLoadModal && (
        <WorkflowListModal
          onClose={() => setShowLoadModal(false)}
          onSelect={(wf) => {
            setLoadedWorkflow(wf);
            setWorkflowId(wf.workflow_id);
          }}
        />
      )}
    </div>
  );
}

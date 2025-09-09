import React, { useState, useEffect } from "react";
import { Plus, FolderOpen, Edit, Trash2, Zap, Settings } from "lucide-react";
import axios from "axios";
import WorkflowEditModal from "./components/WorkflowEditModal";

export default function LandingPage({ onEnterWorkflow, onLoadWorkflow, onCreateNewStack }) {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingWorkflow, setEditingWorkflow] = useState(null);

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/workflows`);
      setWorkflows(response.data.workflows || []);
    } catch (err) {
      setError("Failed to load workflows");
      console.error("Error loading workflows:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWorkflow = async (workflowId, workflowName) => {
    if (!window.confirm(`Are you sure you want to delete "${workflowName}"?`)) {
      return;
    }
    
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/workflows/${workflowId}`);
      setWorkflows(workflows.filter(w => w.id !== workflowId));
    } catch (err) {
      alert("Failed to delete workflow");
      console.error("Error deleting workflow:", err);
    }
  };

  const handleEditWorkflow = async (workflowId, name, description) => {
    try {
      // First, get the full workflow data to preserve the definition
      const fullWorkflowResponse = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/workflows/${workflowId}`);
      const fullWorkflow = fullWorkflowResponse.data;
      
      // Update only the name and description, keep the existing definition
      const response = await axios.put(`${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/workflows/${workflowId}`, {
        name,
        description: description || "",
        nodes: fullWorkflow.definition?.nodes || [],
        edges: fullWorkflow.definition?.edges || []
      });
      
      // Update local state
      setWorkflows(workflows.map(w => 
        w.id === workflowId 
          ? { ...w, name, description }
          : w
      ));
    } catch (err) {
      console.error("Edit workflow error:", err.response?.data);
      const errorMessage = err.response?.data?.detail || err.message || "Failed to update workflow";
      throw new Error(Array.isArray(errorMessage) ? errorMessage.join(", ") : errorMessage);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">FlowMind</h1>
                <p className="text-sm text-gray-500">No-Code AI Workflow Builder</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Build Intelligent AI Workflows
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Create powerful automation flows by connecting AI components. 
            No coding required - just drag, drop, and configure.
          </p>
          <button
            onClick={() => onCreateNewStack()}
            className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
          >
            <Plus className="w-6 h-6 mr-2" />
            Create New Stack
          </button>
        </div>

        {/* Workflows Grid */}
        <div className="mb-12">
          <h3 className="text-2xl font-semibold text-gray-900 mb-6">Your Stacks</h3>
          
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={loadWorkflows}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Try Again
              </button>
            </div>
          ) : workflows.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm border-2 border-dashed border-gray-300">
              <FolderOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">No stacks yet</h4>
              <p className="text-gray-500 mb-6">Create your first AI workflow to get started</p>
              <button
                onClick={() => onCreateNewStack()}
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Your First Stack
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {workflows.map((workflow) => (
                <div key={workflow.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-gray-900 mb-1">
                          {workflow.name}
                        </h4>
                        {workflow.description && (
                          <p className="text-sm text-gray-600 mb-2 overflow-hidden" style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical'
                          }}>
                            {workflow.description}
                          </p>
                        )}
                        <p className="text-xs text-gray-500">
                          Created {new Date(workflow.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => setEditingWorkflow(workflow)}
                          className="text-gray-400 hover:text-blue-600 transition-colors p-1"
                          title="Edit workflow details"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteWorkflow(workflow.id, workflow.name)}
                          className="text-gray-400 hover:text-red-600 transition-colors p-1"
                          title="Delete workflow"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => onLoadWorkflow(workflow)}
                        className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Stack
                      </button>
                      <button
                        onClick={() => onLoadWorkflow(workflow, true)}
                        className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <Zap className="w-4 h-4 mr-2" />
                        Run Stack
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Features Section */}
        <div className="bg-white rounded-lg shadow-sm border p-8">
          <h3 className="text-2xl font-semibold text-gray-900 mb-6 text-center">How It Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <span className="text-blue-600 font-bold text-lg">1</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Drag Components</h4>
              <p className="text-sm text-gray-600">Drag AI components from the library to your canvas</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <span className="text-green-600 font-bold text-lg">2</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Connect & Configure</h4>
              <p className="text-sm text-gray-600">Connect components and configure with your API keys</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <span className="text-purple-600 font-bold text-lg">3</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Build Stack</h4>
              <p className="text-sm text-gray-600">Save your workflow as a reusable stack</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <span className="text-yellow-600 font-bold text-lg">4</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Chat & Test</h4>
              <p className="text-sm text-gray-600">Test your stack with real conversations</p>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Workflow Modal */}
      {editingWorkflow && (
        <WorkflowEditModal
          workflow={editingWorkflow}
          onClose={() => setEditingWorkflow(null)}
          onSave={handleEditWorkflow}
        />
      )}
    </div>
  );
}

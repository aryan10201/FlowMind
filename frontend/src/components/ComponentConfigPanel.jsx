import React from "react";
import { MessageCircle, BookOpen, Cpu, Terminal, Search, Settings } from "lucide-react";

const componentInfo = {
  user_query: {
    title: "User Query Component",
    description: "Accepts user queries via a simple interface. Serves as the entry point for the workflow.",
    icon: MessageCircle,
    color: "blue",
    requirements: ["Query input field"],
    connections: {
      outputs: ["query"]
    }
  },
  knowledgebase: {
    title: "Knowledge Base Component", 
    description: "Allows uploading and processing of documents. Extracts text, generates embeddings, and retrieves relevant context.",
    icon: BookOpen,
    color: "green",
    requirements: ["Text Embedding API Key", "File upload", "Embedding model selection"],
    connections: {
      inputs: ["query"],
      outputs: ["context"]
    }
  },
  websearch: {
    title: "Web Search Component",
    description: "Searches the web for additional information using SERP API or Brave Search.",
    icon: Search,
    color: "yellow", 
    requirements: ["SERP API Key", "Search query", "Search engine selection"],
    connections: {
      inputs: ["query"],
      outputs: ["web_results"]
    }
  },
  llm: {
    title: "LLM Engine Component",
    description: "Processes queries and context using language models like OpenAI GPT, Gemini, or Grok.",
    icon: Cpu,
    color: "purple",
    requirements: ["API Key", "Provider selection", "System prompt", "Temperature"],
    connections: {
      inputs: ["input"],
      outputs: ["output"]
    }
  },
  output: {
    title: "Output Component",
    description: "Displays the final response to the user. Functions as a chat interface.",
    icon: Terminal,
    color: "gray",
    requirements: ["Output display"],
    connections: {
      inputs: ["output"]
    }
  }
};

export default function ComponentConfigPanel({ selectedNode, onClose }) {
  if (!selectedNode) return null;

  const nodeType = selectedNode.type;
  const info = componentInfo[nodeType];
  const Icon = info?.icon || Settings;

  return (
    <div className="w-80 bg-white border-l border-gray-200 p-4 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon className={`text-${info?.color}-600 w-5 h-5`} />
          <h3 className="font-semibold text-gray-900">Component Configuration</h3>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-4 flex-1">
        <div>
          <h4 className="font-medium text-gray-900 mb-1">{info?.title}</h4>
          <p className="text-sm text-gray-600">{info?.description}</p>
        </div>

        <div>
          <h5 className="font-medium text-gray-700 mb-2">Requirements</h5>
          <ul className="space-y-1">
            {info?.requirements.map((req, index) => (
              <li key={index} className="text-sm text-gray-600 flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                {req}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h5 className="font-medium text-gray-700 mb-2">Connections</h5>
          <div className="space-y-2">
            {info?.connections.inputs && (
              <div>
                <span className="text-xs font-medium text-gray-500">Inputs:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {info.connections.inputs.map((input, index) => (
                    <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                      {input}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {info?.connections.outputs && (
              <div>
                <span className="text-xs font-medium text-gray-500">Outputs:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {info.connections.outputs.map((output, index) => (
                    <span key={index} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                      {output}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-gray-50 p-3 rounded-lg">
          <h5 className="font-medium text-gray-700 mb-2">Configuration Status</h5>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Component ID:</span>
              <span className="font-mono text-xs bg-gray-200 px-2 py-1 rounded">
                {selectedNode.id}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Position:</span>
              <span className="text-gray-900">
                ({Math.round(selectedNode.position?.x || 0)}, {Math.round(selectedNode.position?.y || 0)})
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Type:</span>
              <span className="text-gray-900 capitalize">{nodeType.replace('_', ' ')}</span>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 p-3 rounded-lg">
          <h5 className="font-medium text-blue-900 mb-1">💡 Tip</h5>
          <p className="text-sm text-blue-800">
            {nodeType === 'user_query' && "This component serves as the entry point. Connect its output to other components."}
            {nodeType === 'knowledgebase' && "Upload a PDF file and configure your embedding API key to enable document search."}
            {nodeType === 'websearch' && "Configure your SERP API key to enable web search functionality."}
            {nodeType === 'llm' && "Connect context from Knowledge Base and queries from User Query for best results."}
            {nodeType === 'output' && "This component displays the final response. Connect it to the LLM output."}
          </p>
        </div>
      </div>
    </div>
  );
}

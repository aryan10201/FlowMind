import React, { useState } from "react";
import { Handle, Position } from "reactflow";
import { BookOpen, Eye, EyeOff, Trash2, X } from "lucide-react";

export default function KnowledgeBaseNode({ data, onDelete }) {
  const [showApiKey, setShowApiKey] = useState(false);
  const [localConfig, setLocalConfig] = useState(() => data?.config || {});
  const apiKeyRef = React.useRef(null);
  
  // Update local config when data changes
  React.useEffect(() => {
    if (data?.config) {
      setLocalConfig(prev => ({ ...prev, ...data.config }));
    }
  }, [data?.config]);
  
  // Update parent data when local config changes
  const updateConfig = React.useCallback((key, value) => {
    setLocalConfig(prev => {
      const newConfig = { ...prev, [key]: value };
      // Update the data object directly
      if (data) {
        if (!data.config) {
          data.config = {};
        }
        data.config[key] = value;
      }
      return newConfig;
    });
  }, [data]);

  return (
    <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-2xl shadow-md border border-green-300 w-80 relative">
      <div className="flex items-center justify-between mb-3 node-header">
        <div className="flex items-center gap-2 node-title cursor-pointer">
          <BookOpen className="text-green-600 w-5 h-5" />
        <span className="font-semibold text-green-700">Knowledge Base</span>
        </div>
        {onDelete && (
          <button
            onClick={onDelete}
            className="text-red-500 hover:text-red-700 p-1"
            title="Delete node"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      
      <div className="space-y-3">
        <div className="bg-gray-50 p-2 rounded text-xs text-gray-600">
          <div>Query Input: Connected from User Query</div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Embedding Provider</label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            value={localConfig.embedding_provider || "openai"}
            onChange={(e) => {
              updateConfig('embedding_provider', e.target.value);
              // Reset API key when provider changes
              updateConfig('embedding_api_key', '');
            }}
          >
            <option value="openai">OpenAI (Paid)</option>
            <option value="gemini">Gemini (Free)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {localConfig.embedding_provider === "gemini" ? "Gemini API Key" : "OpenAI API Key"}
          </label>
          <div className="relative">
            <input
              ref={apiKeyRef}
              type={showApiKey ? "text" : "password"}
              placeholder={localConfig.embedding_provider === "gemini" ? "Enter your Gemini API key" : "Enter your OpenAI API key"}
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              value={localConfig.embedding_api_key || ""}
              onChange={(e) => updateConfig('embedding_api_key', e.target.value)}
              onFocus={(e) => e.target.select()}
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-2 top-2 text-gray-500 hover:text-gray-700"
            >
              {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {localConfig.embedding_provider === "gemini" && (
            <p className="text-xs text-green-600 mt-1">
              💡 Gemini embeddings are free! Get your API key from <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline">Google AI Studio</a>
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Upload File</label>
          <div className="text-xs text-gray-500 mb-1">Max file size: 10MB (to prevent memory issues)</div>
          <input
            type="file"
            accept=".pdf"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            onChange={async (e) => {
              if (e.target.files[0]) {
                const file = e.target.files[0];
                
                // Check file size (limit to 10MB to prevent memory issues)
                const maxSize = 10 * 1024 * 1024; // 10MB
                if (file.size > maxSize) {
                  alert(`File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds the 10MB limit. Please use a smaller file.`);
                  e.target.value = ''; // Clear the input
                  return;
                }
                
                // Convert file to base64 for transmission
                const reader = new FileReader();
                reader.onload = () => {
                  const base64 = reader.result.split(',')[1]; // Remove data:application/pdf;base64, prefix
                  updateConfig('uploaded_file', {
                    name: file.name,
                    content: base64,
                    type: file.type
                  });
                };
                reader.readAsDataURL(file);
              }
            }}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Embedding Model</label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            value={localConfig.embedding_model || (localConfig.embedding_provider === "gemini" ? "models/embedding-001" : "text-embedding-3-large")}
            onChange={(e) => updateConfig('embedding_model', e.target.value)}
          >
            {localConfig.embedding_provider === "gemini" ? (
              <>
                <option value="models/embedding-001">models/embedding-001 (Free)</option>
              </>
            ) : (
              <>
                <option value="text-embedding-3-large">text-embedding-3-large</option>
                <option value="text-embedding-3-small">text-embedding-3-small</option>
                <option value="text-embedding-ada-002">text-embedding-ada-002</option>
              </>
            )}
          </select>
        </div>
      </div>

      <Handle
        type="target"
        position={Position.Left}
        id="query"
        className="w-3 h-3 bg-orange-500"
        style={{ top: '60%' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="context"
        className="w-3 h-3 bg-orange-500"
      />
    </div>
  );
}

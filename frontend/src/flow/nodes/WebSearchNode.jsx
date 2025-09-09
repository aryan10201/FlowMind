import React, { useState } from "react";
import { Handle, Position } from "reactflow";
import { Search, Eye, EyeOff, X } from "lucide-react";

export default function WebSearchNode({ data, onDelete }) {
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
    <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 p-4 rounded-2xl shadow-md border border-yellow-300 w-80 relative">
      <div className="flex items-center justify-between mb-3 node-header">
        <div className="flex items-center gap-2 node-title cursor-pointer">
          <Search className="text-yellow-600 w-5 h-5" />
          <span className="font-semibold text-yellow-700">Web Search</span>
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
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">SERP API Key</label>
          <div className="relative">
            <input
              type={showApiKey ? "text" : "password"}
              placeholder="Enter your SERP API key"
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
              value={localConfig.serp_api_key || ""}
              onChange={(e) => updateConfig('serp_api_key', e.target.value)}
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
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Search Engine</label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
            value={localConfig.search_engine || "google"}
            onChange={(e) => updateConfig('search_engine', e.target.value)}
          >
            <option value="google">Google</option>
            <option value="bing">Bing</option>
            <option value="brave">Brave Search</option>
            <option value="duckduckgo">DuckDuckGo</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Number of Results</label>
          <input
            type="number"
            min="1"
            max="20"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
            value={localConfig.num_results || 5}
            onChange={(e) => updateConfig('num_results', parseInt(e.target.value))}
            onFocus={(e) => e.target.select()}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Search Query</label>
          <input
            type="text"
            placeholder="Enter search query or leave empty to use input"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
            value={localConfig.search_query || ""}
            onChange={(e) => updateConfig('search_query', e.target.value)}
            onFocus={(e) => e.target.select()}
          />
        </div>
      </div>

      <Handle
        type="target"
        position={Position.Left}
        id="query"
        className="w-3 h-3 bg-orange-500"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="results"
        className="w-3 h-3 bg-yellow-500"
      />
    </div>
  );
}

import React, { useState } from "react";
import { Handle, Position } from "reactflow";
import { Cpu, Eye, EyeOff, X } from "lucide-react";

export default function LLMNode({ data, onDelete }) {
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
    <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-2xl shadow-md border border-purple-300 w-80 relative">
      <div className="flex items-center justify-between mb-3 node-header">
        <div className="flex items-center gap-2 node-title cursor-pointer">
          <Cpu className="text-purple-600 w-5 h-5" />
          <span className="font-semibold text-purple-700">LLM ({localConfig.provider || 'OpenAI'})</span>
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
          <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
          <div className="relative">
            <input
              ref={apiKeyRef}
              type={showApiKey ? "text" : "password"}
              placeholder="Enter your OpenAI API key"
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={localConfig.api_key || ""}
              onChange={(e) => updateConfig('api_key', e.target.value)}
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            value={localConfig.provider || "openai"}
            onChange={(e) => updateConfig('provider', e.target.value)}
          >
            <option value="openai">OpenAI</option>
            <option value="gemini">Gemini</option>
            <option value="grok">Grok</option>
          </select>
        </div>


        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">System Prompt</label>
          <textarea
            placeholder="You are a helpful PDF assistant. Use web search if the PDF lacks context"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 h-16 resize-none"
            value={localConfig.system_prompt || "You are a helpful PDF assistant. Use web search if the PDF lacks context"}
            onChange={(e) => updateConfig('system_prompt', e.target.value)}
            onFocus={(e) => e.target.select()}
          />
        </div>

        <div className="bg-gray-50 p-2 rounded text-xs text-gray-600">
          <div>Accepts: Query, Context, Web Results</div>
          <div>Combines all inputs into a single prompt</div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Temperature</label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="2"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            value={localConfig.temperature || 0.75}
            onChange={(e) => updateConfig('temperature', parseFloat(e.target.value))}
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={localConfig.websearch_enabled || false}
            onChange={(e) => updateConfig('websearch_enabled', e.target.checked)}
            className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
          />
          <label className="text-sm font-medium text-gray-700">WebSearch Tool</label>
        </div>

        {data?.config?.websearch_enabled && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SERP API Key</label>
            <div className="relative">
              <input
                type={showApiKey ? "text" : "password"}
                placeholder="Enter your SERP API key"
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={localConfig.serp_api_key || ""}
                onChange={(e) => updateConfig('serp_api_key', e.target.value)}
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
        )}
      </div>

      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="w-3 h-3 bg-orange-500"
        style={{ top: '50%' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="output"
        className="w-3 h-3 bg-orange-500"
      />
    </div>
  );
}

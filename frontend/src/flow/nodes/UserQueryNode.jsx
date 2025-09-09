import React, { useState } from "react";
import { Handle, Position } from "reactflow";
import { MessageCircle, X } from "lucide-react";

export default function UserQueryNode({ data, onDelete }) {
  const [localConfig, setLocalConfig] = useState(() => data?.config || {});
  const inputRef = React.useRef(null);
  
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
    <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-2xl shadow-md border border-blue-300 w-64 relative">
      <div className="flex items-center justify-between mb-3 node-header">
        <div className="flex items-center gap-2 node-title cursor-pointer">
          <MessageCircle className="text-blue-600 w-5 h-5" />
          <span className="font-semibold text-blue-700">User Query</span>
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
      
      <div className="mb-3">
        <label className="block text-sm font-medium text-gray-700 mb-1">Query</label>
        <input
          ref={inputRef}
          type="text"
          placeholder="Write your query here"
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={localConfig.default_query || ""}
          onChange={(e) => updateConfig('default_query', e.target.value)}
          onFocus={(e) => e.target.select()}
        />
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        id="query"
        className="w-3 h-3 bg-orange-500"
      />
    </div>
  );
}

import React from "react";
import { Handle, Position } from "reactflow";
import { Terminal, X } from "lucide-react";

export default function OutputNode({ data, onDelete }) {
  return (
    <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-2xl shadow-md border border-gray-300 w-64 relative">
      <div className="flex items-center justify-between mb-3 node-header">
        <div className="flex items-center gap-2 node-title cursor-pointer">
          <Terminal className="text-gray-600 w-5 h-5" />
          <span className="font-semibold text-gray-700">Output</span>
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
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Output Text</label>
        <textarea
          placeholder="Output will be generated based on query"
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-500 h-20 resize-none"
          value={data?.config?.output_text || ""}
          readOnly
        />
      </div>

      <Handle
        type="target"
        position={Position.Left}
        id="output"
        className="w-3 h-3 bg-green-500"
      />
    </div>
  );
}

import React, { useEffect, useState } from "react";
import axios from "axios";

export default function WorkflowListModal({ onClose, onSelect }) {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/workflows`);
        setWorkflows(res.data.workflows || []);
      } catch (e) {
        setErr("Unable to fetch workflows");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const handleSelect = async (wf) => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/workflows/${wf.id}`);
      const def = res.data.definition || { nodes: [], edges: [] };
      onSelect({ workflow_id: wf.id, name: wf.name, definition: def });
      onClose();
    } catch (e) {
      alert("Failed to load workflow");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-96 rounded-lg shadow-lg p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold">Load Workflow</h3>
          <button onClick={onClose} className="text-gray-500">Close</button>
        </div>

        {loading && <div>Loading...</div>}
        {err && <div className="text-red-500">{err}</div>}

        <div className="space-y-2 max-h-72 overflow-auto">
          {workflows.map(wf => (
            <div key={wf.id} className="p-2 border rounded flex justify-between items-center hover:bg-gray-50">
              <div>
                <div className="font-medium">{wf.name}</div>
                <div className="text-xs text-gray-500">ID: {wf.id} • {new Date(wf.created_at).toLocaleString()}</div>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm" onClick={() => handleSelect(wf)}>Load</button>
              </div>
            </div>
          ))}
          {workflows.length === 0 && !loading && <div className="text-sm text-gray-500">No workflows saved yet</div>}
        </div>
      </div>
    </div>
  );
}

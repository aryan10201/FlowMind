import React, { useState, useEffect } from "react";
import axios from "axios";

export default function ConfigPanel({ node }) {
  const [form, setForm] = useState({});

  useEffect(() => {
    setForm(node?.data?.config ?? {});
  }, [node]);

  if (!node) {
    return (
      <div className="w-80 bg-gradient-to-b from-gray-50 to-gray-100 border-l p-6">
        <h4 className="font-semibold text-lg text-gray-700">⚙️ Config Panel</h4>
        <p className="text-sm text-gray-500 mt-2">Click a node to configure settings</p>
      </div>
    );
  }

  const save = () => {
    node.data.config = form;
    alert("✅ Config saved");
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/upload`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      setForm({
        ...form,
        file: file.name,
        document_id: res.data.document_id
      });
    } catch (err) {
      alert("❌ Upload failed");
    }
  };

  const inputCls =
    "w-full border rounded-md px-2 py-1 mt-1 text-sm focus:ring-2 focus:ring-blue-300 outline-none";

  return (
    <div className="w-80 bg-gradient-to-b from-gray-50 to-gray-100 border-l p-6 flex flex-col">
      <h4 className="font-semibold text-lg text-gray-700 mb-3">
        ⚙️ Config: {node.type}
      </h4>

      {node.type === "user_query" && (
        <div className="mb-4">
          <label className="text-sm font-medium">Default Query</label>
          <input
            value={form.default_query || ""}
            onChange={(e) => setForm({ ...form, default_query: e.target.value })}
            className={inputCls}
            placeholder="Enter a default query"
          />
        </div>
      )}

      {node.type === "knowledgebase" && (
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">Collection Name</label>
            <input
              value={form.collection_name || "kb_collection"}
              onChange={(e) => setForm({ ...form, collection_name: e.target.value })}
              className={inputCls}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Top K</label>
            <input
              type="number"
              value={form.top_k || 5}
              onChange={(e) => setForm({ ...form, top_k: Number(e.target.value) })}
              className={inputCls}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Upload PDF</label>
            <input
              type="file"
              accept="application/pdf"
              onChange={handleFileUpload}
              className="mt-1 text-sm"
            />
            {form.file && (
              <p className="text-xs text-gray-500 mt-1">📄 {form.file}</p>
            )}
          </div>
        </div>
      )}

      {node.type === "llm" && (
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">Provider</label>
            <select
              value={form.provider || "openai"}
              onChange={(e) => setForm({ ...form, provider: e.target.value })}
              className={inputCls}
            >
              <option value="openai">OpenAI</option>
              <option value="gemini">Gemini</option>
              <option value="grok">Grok</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">System Prompt</label>
            <textarea
              value={form.system_prompt || ""}
              onChange={(e) => setForm({ ...form, system_prompt: e.target.value })}
              className={`${inputCls} h-20`}
              placeholder="Optional system instructions..."
            />
          </div>

          <div>
            <label className="text-sm font-medium">Temperature</label>
            <input
              type="number"
              step="0.1"
              value={form.temperature || 0.2}
              onChange={(e) => setForm({ ...form, temperature: parseFloat(e.target.value) })}
              className={inputCls}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.stream ?? true}
              onChange={(e) => setForm({ ...form, stream: e.target.checked })}
            />
            <label className="text-sm">Stream Responses</label>
          </div>
        </div>
      )}

      {node.type === "output" && (
        <p className="text-sm text-gray-600">
          This node shows the final response. No config needed.
        </p>
      )}

      <div className="mt-6 flex justify-end">
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded-md shadow hover:bg-blue-700 transition"
          onClick={save}
        >
          Save Config
        </button>
      </div>
    </div>
);
}

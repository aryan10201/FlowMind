import React from "react";
import { MessageCircle, BookOpen, Cpu, Terminal, Search, ArrowLeft } from "lucide-react";

const components = [
  { id: "user_query", label: "User Query", icon: MessageCircle, color: "blue" },
  { id: "knowledgebase", label: "KnowledgeBase", icon: BookOpen, color: "green" },
  { id: "websearch", label: "Web Search", icon: Search, color: "yellow" },
  { id: "llm", label: "LLM Engine", icon: Cpu, color: "purple" },
  { id: "output", label: "Output", icon: Terminal, color: "gray" }
];

export default function Sidebar({ onOpenChat, workflowId, onBackToLanding }) {
  return (
    <div className="w-64 bg-white border-r p-4 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg">Components</h3>
        <button
          onClick={onBackToLanding}
          className="text-gray-500 hover:text-gray-700 transition-colors"
          title="Back to landing page"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>
      <div className="space-y-2 flex-1">
        {components.map(c => {
          const Icon = c.icon;
          return (
            <div
              key={c.id}
              draggable
              onDragStart={(e) => e.dataTransfer.setData("component", c.id)}
              className={`p-2 flex items-center gap-2 rounded-md cursor-grab bg-${c.color}-50 border border-${c.color}-200 hover:shadow`}
            >
              <Icon className={`text-${c.color}-600 w-4 h-4`} />
              {c.label}
            </div>
          );
        })}
      </div>
      <div className="mt-6 space-y-2">
        <button
          className="px-4 py-2 bg-purple-600 text-white rounded w-full hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={onOpenChat}
          disabled={!workflowId}
        >
          Chat with Workflow
        </button>

        {!workflowId && (
          <p className="text-xs text-gray-500 mt-2 text-center">
            ⚠️ Build or load a workflow first to chat
          </p>
        )}
      </div>
    </div>
);
}

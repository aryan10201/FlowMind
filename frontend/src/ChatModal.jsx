import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

export default function ChatModal({ onClose, workflowId, nodes = [] }) {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const wsRef = useRef(null);
  const chatEndRef = useRef(null);
  const [hasWebSocketError, setHasWebSocketError] = useState(false);

  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chat]);

  // Load chat history when workflow changes
  useEffect(() => {
    if (workflowId) {
      loadChatHistory();
    }
  }, [workflowId]);

  const loadChatHistory = async () => {
    if (!workflowId) return;
    
    setIsLoadingHistory(true);
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/workflows/${workflowId}/chat-history`
      );
      const history = response.data.chat_history || [];
      
      // Convert history to chat format
      const chatFromHistory = [];
      history.reverse().forEach(item => {
        chatFromHistory.push({ role: "user", text: item.user_query, timestamp: item.created_at });
        chatFromHistory.push({ role: "assistant", text: item.response, timestamp: item.created_at });
      });
      
      setChatHistory(history);
      setChat(chatFromHistory);
    } catch (error) {
      console.error("Failed to load chat history:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const startWebsocket = (id) => {
    setSessionId(id);
    const ws = new WebSocket(`${import.meta.env.VITE_API_WS_URL || "ws://localhost:8000"}/ws/${id}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected");
    };

    ws.onmessage = (ev) => {
      let data;
      try {
        data = JSON.parse(ev.data);
      } catch (e) {
        console.error("WebSocket message parse error:", e);
        return;
      }

      if (data.type === "token") {
        const token = data.token;
        setChat(prev => {
          const clone = [...prev];
          const last = clone[clone.length - 1];
          if (!last || last.role !== "assistant") {
            clone.push({ role: "assistant", text: token });
          } else {
            last.text = (last.text || "") + token;
          }
          return clone;
        });
      } else if (data.type === "done") {
        const final = data.text;
        setChat(prev => {
          const clone = [...prev];
          const last = clone[clone.length - 1];
          if (!last || last.role !== "assistant") {
            clone.push({ role: "assistant", text: final });
          } else {
            last.text = final;
          }
          return clone;
        });
        setIsLoading(false);
      } else if (data.type === "error") {
        setChat(prev => {
          // Check if this error is already in the chat to prevent duplicates
          const lastMessage = prev[prev.length - 1];
          const errorText = `Error: ${data.error}`;
          if (lastMessage && lastMessage.role === "assistant" && lastMessage.text === errorText) {
            return prev; // Don't add duplicate
          }
          return [...prev, { role: "assistant", text: errorText }];
        });
        setIsLoading(false);
        setHasWebSocketError(true);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setHasWebSocketError(true);
      setIsLoading(false);
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
      setIsLoading(false);
    };
  };

  const sendQuery = async () => {
    if (!message || !workflowId || isLoading) return;
    
    setIsLoading(true);
    setHasWebSocketError(false); // Reset error flag
    setChat(c => [...c, { role: "user", text: message }]);
    const sid = `${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
    startWebsocket(sid);

    try {
      // Collect API keys and node configs from the current workflow
      const apiKeys = {};
      const nodeConfigs = {};
      
      // Extract API keys and configs from nodes
      nodes.forEach(node => {
        if (node.data?.config) {
          nodeConfigs[node.id] = node.data.config;
          
          // Collect different types of API keys
          if (node.type === 'knowledgebase') {
            // For knowledge base, collect embedding API key
            if (node.data.config.embedding_api_key) {
              apiKeys.embedding = node.data.config.embedding_api_key;
            }
          } else if (node.type === 'llm') {
            // For LLM, collect the main API key
            if (node.data.config.api_key) {
              // Use the provider to determine which key to use
              const provider = node.data.config.provider || 'openai';
              if (provider === 'gemini') {
                apiKeys.gemini = node.data.config.api_key;
              } else if (provider === 'grok') {
                apiKeys.grok = node.data.config.api_key;
              } else {
                apiKeys.openai = node.data.config.api_key;
              }
            }
          }
          
          if (node.data.config.serp_api_key) {
            apiKeys.serp = node.data.config.serp_api_key;
          }
        }
      });
      // Prepare chat history for context
      const chatHistory = chat.map(c => ({
        role: c.role,
        content: c.text
      }));

      const resp = await axios.post(`${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/workflows/${workflowId}/execute`, {
        workflow_id: workflowId,
        query: message,
        session_id: sid,
        api_keys: apiKeys,
        node_configs: nodeConfigs,
        chat_history: chatHistory
      });
      if (resp.data && resp.data.output) {
        setChat(prev => {
          const clone = [...prev];
          const last = clone[clone.length - 1];
          if (!last || last.role !== "assistant") {
            clone.push({ role: "assistant", text: resp.data.output });
          } else {
            last.text = resp.data.output;
          }
          return clone;
        });
      }
    } catch (err) {
      console.error("Execution error:", err);
      // Only show axios error if no WebSocket error was already shown
      if (!hasWebSocketError) {
        const errorMsg = err.response?.data?.detail || err.response?.data?.message || err.message;
        const errorText = `Error: ${errorMsg}`;
        setChat(prev => {
          // Check if this error is already in the chat to prevent duplicates
          const lastMessage = prev[prev.length - 1];
          if (lastMessage && lastMessage.role === "assistant" && lastMessage.text === errorText) {
            return prev; // Don't add duplicate
          }
          return [...prev, { role: "assistant", text: errorText }];
        });
      }
    } finally {
      setMessage("");
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-4xl h-full max-h-[90vh] rounded-lg shadow-xl flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-lg">FlowMind Chat</h3>
            {isLoadingHistory && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                Loading history...
              </div>
            )}
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="flex-1 flex flex-col min-h-0">
          {/* Chat Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
              {chat.length === 0 && !isLoadingHistory && (
                <div className="text-center text-gray-500 py-8">
                  <div className="text-4xl mb-2">💬</div>
                  <p>Start a conversation with your workflow</p>
                  <p className="text-sm">Ask questions and get intelligent responses</p>
                </div>
              )}
              {chat.map((c, i) => (
                <div key={i} className={`flex ${c.role === "user" ? "justify-end" : "justify-start"} mb-4`}>
                  <div className={`max-w-[70%] px-4 py-3 rounded-lg break-words ${
                    c.role === "user" 
                      ? "bg-blue-600 text-white" 
                      : "bg-gray-100 text-gray-900"
                  }`}>
                    <div className="text-sm whitespace-pre-wrap">{c.text}</div>
                    {c.timestamp && (
                      <div className={`text-xs mt-2 ${
                        c.role === "user" ? "text-blue-100" : "text-gray-500"
                      }`}>
                        {new Date(c.timestamp).toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {/* Scroll anchor */}
              <div ref={chatEndRef} />
          </div>
          
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <input 
                value={message} 
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendQuery()}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                placeholder="Type your message..." 
                disabled={!workflowId}
              />
              <button 
                onClick={sendQuery} 
                disabled={!message.trim() || !workflowId || isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

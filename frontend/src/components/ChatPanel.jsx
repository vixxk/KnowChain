import React, { useEffect, useRef, useState } from "react";
import { chatWeb, chatPdf, chatText } from "../api";
import { Send, RefreshCw, Bot, User, Sparkles, Database, AlertCircle } from "lucide-react";

export default function ChatPanel() {
  const [sessionId, setSessionId] = useState(() => crypto.randomUUID());
  const [collection, setCollection] = useState("website_docs");
  const [customCollection, setCustomCollection] = useState("");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const currentCollection = collection === "custom" ? customCollection.trim() : collection;

  async function send() {
    if (!input.trim()) return;
    const query = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: query }]);
    setLoading(true);
    try {
      let res;
      if (collection === "website_docs") {
        res = await chatWeb({ sessionId, query });
      } else if (collection === "pdf" || collection === "custom") {
        res = await chatPdf({ sessionId, query, collectionName: currentCollection || "pdf" });
      } else {
        res = await chatText({ query, collectionName: currentCollection || "text", sessionId });
      }
      const answer = res.answer || "No answer returned.";
      await typeWriter(answer);
    } catch (e) {
      setMessages(prev => [...prev, { role: "assistant", content: `Error: ${e?.response?.data?.error || e.message}` }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  // FIXED typeWriter to prevent duplicate replies
  function typeWriter(text) {
    return new Promise(resolve => {
      const tokens = Array.from(text);
      let buffer = "";

      // Start with one empty message
      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      const id = setInterval(() => {
        buffer += tokens.shift() || "";

        setMessages(prev => [
          ...prev.slice(0, -1),
          { ...(prev.at(-1) || { role: "assistant", content: "" }), content: buffer }
        ]);

        if (tokens.length === 0) {
          clearInterval(id);
          resolve();
        }
      }, 15);
    });
  }

  function resetSession() {
    setSessionId(crypto.randomUUID());
    setMessages([]);
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div className="chat-title">
          <Bot className="chat-icon" />
          <span>AI Assistant</span>
          <div className="pulse-indicator" />
        </div>
        <div className="session-info">
          <span className="session-label">Session</span>
          <div className="session-id">{sessionId.slice(0, 8)}</div>
          <button className="reset-btn" onClick={resetSession}>
            <RefreshCw size={16} />
            New Chat
          </button>
        </div>
      </div>

      <div className="collection-selector">
        <div className="collection-controls">
          <Database size={16} />
          <select value={collection} onChange={e => setCollection(e.target.value)} className="collection-dropdown">
            <option value="website_docs">📄 Website Docs</option>
            <option value="pdf">📋 PDF Documents</option>
            <option value="text">📝 Text Content</option>
            <option value="custom">⚙️ Custom Collection</option>
          </select>
          <div className="collection-note">
            <AlertCircle size={14} />
            <span>Make sure to select the correct data source</span>
          </div>
        </div>

        {collection === "custom" && (
          <input 
            value={customCollection} 
            onChange={e => setCustomCollection(e.target.value)} 
            placeholder="Enter collection name..."
            className="custom-collection-input"
          />
        )}
      </div>

      <div className="messages-container">
        {messages.length === 0 && (
          <div className="welcome-message">
            <Sparkles size={32} />
            <h3>Welcome to KnowChain</h3>
            <p>Ask me anything about your indexed documents and I'll help you find the answers!</p>
          </div>
        )}
        
        {messages.map((m, i) => (
          <Message key={i} role={m.role} content={m.content} />
        ))}
        
        {loading && (
          <div className="typing-indicator">
            <div className="typing-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <span>AI is thinking...</span>
          </div>
        )}
        
        <div ref={bottomRef} />
      </div>

      <div className="input-container">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask me anything about your documents..."
          className="message-input"
          rows={1}
        />
        <button 
          className={`send-button ${loading ? 'loading' : ''}`} 
          onClick={send} 
          disabled={loading || !input.trim()}
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}

function Message({ role, content }) {
  return (
    <div className={`message ${role}`}>
      <div className="message-avatar">
        {role === 'user' ? <User size={16} /> : <Bot size={16} />}
      </div>
      <div className="message-content">
        {content.split("\n").map((line, idx) => (
          <p key={idx}>{line}</p>
        ))}
      </div>
    </div>
  );
}

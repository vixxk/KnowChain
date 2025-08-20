import React, { useEffect, useRef, useState } from "react";
import { chatWeb, chatPdf, chatText } from "../api";

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
        res = await chatText({ question: query, collectionName: currentCollection || "text" });
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

  function typeWriter(text) {
    return new Promise(resolve => {
      const tokens = Array.from(text);
      let buffer = "";
      const id = setInterval(() => {
        buffer += tokens.shift() || "";
        if (tokens.length === 0) {
          clearInterval(id);
          setMessages(prev => [...prev, { role: "assistant", content: buffer }]);
          resolve();
        } else {
          setMessages(prev => [...prev.slice(0, -1), { ...(prev.at(-1) || { role: "assistant", content: "" }), content: buffer }]);
        }
      }, 15);
      setMessages(prev => [...prev, { role: "assistant", content: "" }]);
    });
  }

  function resetSession() {
    setSessionId(crypto.randomUUID());
    setMessages([]);
  }

  return (
    <div className="card chat-card">
      <div className="card-header">
        <div className="title">Chat</div>
        <div className="session">
          <span className="muted">Session:</span>
          <code>{sessionId.slice(0, 8)}</code>
          <button className="btn ghost" onClick={resetSession}>New</button>
        </div>
      </div>

      <div className="controls">
        <label className="field">
          <span>Collection</span>
          <select value={collection} onChange={e => setCollection(e.target.value)}>
            <option value="website_docs">website_docs</option>
            <option value="pdf">pdf</option>
            <option value="text">text</option>
            <option value="custom">custom…</option>
          </select>
        </label>

        {collection === "custom" && (
          <label className="field">
            <span>Name</span>
            <input value={customCollection} onChange={e => setCustomCollection(e.target.value)} placeholder="my_collection"/>
          </label>
        )}
      </div>

      <div className="messages">
        {messages.map((m, i) => (
          <Message key={i} role={m.role} content={m.content} />
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="composer">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask a question…"
          rows={2}
        />
        <button className="btn primary" onClick={send} disabled={loading}>
          {loading ? "Thinking…" : "Send"}
        </button>
      </div>
    </div>
  );
}

function Message({ role, content }) {
  return (
    <div className={`msg ${role}`}>
      <div className="bubble">
        {content.split("\n").map((line, idx) => (
          <p key={idx}>{line}</p>
        ))}
      </div>
    </div>
  );
}

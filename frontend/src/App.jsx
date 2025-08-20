import React from "react";
import DataSourcePanel from "./components/DataSourcePanel";
import ChatPanel from "./components/ChatPanel";

export default function App() {
  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="dot" />
          <span>KnowChain</span>
        </div>
        <div className="subtitle">RAG Playground</div>
      </header>

      <main className="grid">
        <DataSourcePanel />
        <ChatPanel />
      </main>
    </div>
  );
}

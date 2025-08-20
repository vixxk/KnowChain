import React from "react";
import DataSourcePanel from "./components/DataSourcePanel";
import ChatPanel from "./components/ChatPanel";
import { Brain, Zap } from "lucide-react";

export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <div className="brand-icon">
            <Brain size={24} />
          </div>
          <div className="brand-text">
            <h1>KnowChain</h1>
            <span>RAG Playground</span>
          </div>
        </div>
        
        <div className="header-actions">
          <div className="status-indicator">
            <Zap size={14} />
            <span>Online</span>
          </div>
        </div>
      </header>

      <main className="app-main">
        <DataSourcePanel />
        <ChatPanel />
      </main>
    </div>
  );
}

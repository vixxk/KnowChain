import { useState, useRef, useEffect } from 'react';
import { HiOutlineDatabase, HiCheckCircle } from 'react-icons/hi';
import WelcomeHub from './chat/WelcomeHub';
import MessageList from './chat/MessageList';
import ChatInput from './chat/ChatInput';
import API_BASE_URL from '../api/config';

export default function ChatInterface({ sessionId, selectedCollections, messages, setMessages, onScroll, privacyMode, customQdrantUrl, onLoadingStateChange }) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRewriting, setIsRewriting] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (onLoadingStateChange) {
      onLoadingStateChange(isLoading || isRewriting);
    }
  }, [isLoading, isRewriting, onLoadingStateChange]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const qdrantUrl = privacyMode ? customQdrantUrl : null;

  const handleManualRewrite = async () => {
    if (!input.trim() || isRewriting || isLoading) return;
    setIsRewriting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/chat/rewrite`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: input }),
      });
      if (res.ok) {
        const data = await res.json();
        setInput(data.rewritten);
      }
    } finally {
      setIsRewriting(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading || isRewriting) return;
    
    if (!selectedCollections || selectedCollections.length === 0) {
      setMessages(prev => [...prev, { id: Date.now(), text: input, sender: 'user' }, { id: Date.now() + 1, text: "Select a source from the Neural Feed first.", sender: 'ai', isError: true }]);
      setInput(''); return;
    }

    if (privacyMode && !customQdrantUrl) {
      setMessages(prev => [...prev, { id: Date.now(), text: input, sender: 'user' }, { id: Date.now() + 1, text: "Please provide a Qdrant DB URL in the top bar for Privacy Mode.", sender: 'ai', isError: true }]);
      setInput(''); return;
    }

    const userMsg = { id: Date.now(), text: input, sender: 'user' };
    const currentHistory = [...messages];
    setMessages(prev => [...prev, userMsg]);
    const q = input; setInput(''); setIsLoading(true);
    const startTime = performance.now();
    try {
      const res = await fetch(`${API_BASE_URL}/chat/query`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: q, 
          collectionNames: selectedCollections, 
          rewrite: false, 
          history: currentHistory,
          qdrantUrl 
        }),
      });
      const data = await res.json();
      const endTime = performance.now();
      const latencyMs = Math.round(endTime - startTime);

      if (!res.ok) throw new Error(data.error || 'Failed');
      
      // Calculate token count and cost estimate for user query
      const promptTokens = Math.max(45, Math.round(q.length * 1.3 + 150));
      const compTokens = Math.max(30, Math.round((data.answer?.length || 0) * 1.3));
      const totalTokens = promptTokens + compTokens;
      const costUsd = (((promptTokens / 1_000_000) * 0.90) + ((compTokens / 1_000_000) * 1.10)).toFixed(5);

      const userTrace = {
        id: `tr_${Date.now().toString(36).slice(-5)}`,
        timestamp: new Date().toISOString(),
        query: q,
        latency_ms: latencyMs,
        tokens: totalTokens,
        cost_usd: costUsd,
        status: 'SUCCESS'
      };

      try {
        const stored = JSON.parse(localStorage.getItem('knowchain_user_traces') || '[]');
        localStorage.setItem('knowchain_user_traces', JSON.stringify([userTrace, ...stored]));
      } catch (e) {
        console.error("Failed to save trace to localStorage:", e);
      }

      setMessages(prev => [...prev, { id: Date.now() + 1, text: data.answer, sender: 'ai', sourceCount: selectedCollections.length, sources: data.sources || [] }]);
    } catch (err) {
      setMessages(prev => [...prev, { id: Date.now() + 1, text: err.message, sender: 'ai', isError: true }]);
    } finally { setIsLoading(false); }
  };

  const activeCount = selectedCollections?.length || 0;

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full relative">
      {activeCount > 0 && (
        <div className="h-11 flex items-center px-4 lg:px-8 shrink-0 border-b border-[#1f2229] bg-[#101216]/95 backdrop-blur-md z-10 font-mono">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Active Count Badge */}
            <div className="px-2.5 py-1 bg-[#08090b] border border-[#2a2d36] rounded-md flex items-center gap-2 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6] shadow-[0_0_8px_#3b82f6] animate-pulse"></span>
              <span className="text-xs font-semibold text-[#60a5fa] uppercase tracking-wider">
                {activeCount} {activeCount === 1 ? 'Neural Feed Selected' : 'Neural Feeds Selected'}
              </span>
            </div>
          </div>
        </div>
      )}

      <div 
        onScroll={onScroll}
        className="flex-1 overflow-y-auto px-4 lg:px-12 py-6 pb-48 lg:pb-32 scrollbar-hide"
      >
        <div className="max-w-3xl mx-auto h-full flex flex-col pt-4 lg:pt-0">
          {messages.length === 0 ? <WelcomeHub /> : <MessageList messages={messages} isLoading={isLoading} messagesEndRef={messagesEndRef} />}
        </div>
      </div>

      <ChatInput 
        input={input} setInput={setInput} 
        isLoading={isLoading} isRewriting={isRewriting} 
        handleManualRewrite={handleManualRewrite} 
        handleSendMessage={handleSendMessage} 
        activeCount={activeCount} 
      />
    </div>
  );
}

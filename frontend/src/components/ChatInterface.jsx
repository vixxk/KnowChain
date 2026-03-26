import { useState, useRef, useEffect } from 'react';
import WelcomeHub from './chat/WelcomeHub';
import MessageList from './chat/MessageList';
import ChatInput from './chat/ChatInput';

export default function ChatInterface({ sessionId, selectedCollections, messages, setMessages }) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRewriting, setIsRewriting] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleManualRewrite = async () => {
    if (!input.trim() || isRewriting || isLoading) return;
    setIsRewriting(true);
    try {
      const res = await fetch('http://localhost:5000/chat/rewrite', {
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

    const userMsg = { id: Date.now(), text: input, sender: 'user' };
    const currentHistory = [...messages];
    setMessages(prev => [...prev, userMsg]);
    const q = input; setInput(''); setIsLoading(true);
    try {
      const res = await fetch('http://localhost:5000/chat/query', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, collectionNames: selectedCollections, rewrite: false, history: currentHistory }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setMessages(prev => [...prev, { id: Date.now() + 1, text: data.answer, sender: 'ai', sourceCount: selectedCollections.length, sources: data.sources || [] }]);
    } catch (err) {
      setMessages(prev => [...prev, { id: Date.now() + 1, text: err.message, sender: 'ai', isError: true }]);
    } finally { setIsLoading(false); }
  };

  const activeCount = selectedCollections?.length || 0;

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full relative">
      {activeCount > 0 && (
        <div className="h-12 flex items-center px-4 lg:px-8 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-[#D4AF37] rounded-full animate-pulse"></div>
            <span className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-[0.15em]">{activeCount} Unit Active</span>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 lg:px-12 py-6 scrollbar-hide">
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

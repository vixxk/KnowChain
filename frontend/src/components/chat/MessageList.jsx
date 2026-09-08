import MessageBubble from '../MessageBubble';

export default function MessageList({ messages, isLoading, messagesEndRef }) {
  return (
    <div className="space-y-6 pb-36">
      {messages.map(msg => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
      {isLoading && (
        <div className="flex gap-3 items-center animate-fade-in py-2.5 px-3.5 rounded-lg bg-[#101216]/80 border border-[#2a2d36] w-fit max-w-md my-3 tech-scanning-bar">
          <div className="w-5 h-5 rounded bg-[#08090b] border border-[#3b82f6]/50 flex items-center justify-center shrink-0 text-[#60a5fa] font-mono text-[9px] font-bold shadow-inner">
            KC
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#60a5fa] animate-ping" />
            <span className="text-xs font-mono text-[#9ca3af]">Scanning Neural Lattice & Retrieving Vectors...</span>
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}


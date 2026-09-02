import MessageBubble from '../MessageBubble';

export default function MessageList({ messages, isLoading, messagesEndRef }) {
  return (
    <div className="space-y-6 pb-36">
      {messages.map(msg => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
      {isLoading && (
        <div className="flex gap-3 items-start animate-fade-in py-4">
          <div className="w-6 h-6 rounded bg-[#101216] border border-[#2a2d36] flex items-center justify-center shrink-0 text-[#60a5fa] font-mono text-[10px]">
            KC
          </div>
          <div className="flex gap-1.5 items-center py-1">
            <div className="w-1.5 h-1.5 bg-[#3b82f6] rounded-full animate-bounce"></div>
            <div className="w-1.5 h-1.5 bg-[#60a5fa] rounded-full animate-bounce [animation-delay:0.15s]"></div>
            <div className="w-1.5 h-1.5 bg-[#93c5fd] rounded-full animate-bounce [animation-delay:0.3s]"></div>
            <span className="text-xs font-mono text-[#6b7280] ml-2">Searching & Generating...</span>
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}

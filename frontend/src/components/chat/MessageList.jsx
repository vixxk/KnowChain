import MessageBubble from '../MessageBubble';

export default function MessageList({ messages, isLoading, messagesEndRef }) {
  return (
    <div className="space-y-10 pb-[180px] lg:pb-36">
      {messages.map(msg => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
      {isLoading && (
        <div className="flex gap-4 items-start animate-fade-in">
          <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center shrink-0 overflow-hidden shadow-lg shadow-black/20">
            <img src="/favicon.png" className="w-6 h-6 object-contain animate-pulse" alt="Thinking" />
          </div>
          <div className="bg-[#38B28E]/[0.06] border border-[#38B28E]/15 rounded-2xl rounded-tl-lg px-8 py-5">
            <div className="flex gap-2">
              <div className="w-2 h-2 bg-[#38B28E] rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-[#38B28E] rounded-full animate-bounce [animation-delay:0.15s]"></div>
              <div className="w-2 h-2 bg-[#38B28E] rounded-full animate-bounce [animation-delay:0.3s]"></div>
            </div>
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}

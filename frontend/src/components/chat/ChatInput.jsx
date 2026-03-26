import { HiSparkles } from 'react-icons/hi';
import { FiSend } from 'react-icons/fi';
import { useRef, useEffect } from 'react';

export default function ChatInput({ input, setInput, isLoading, isRewriting, handleManualRewrite, handleSendMessage, activeCount }) {
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 140) + 'px';
    }
  }, [input]);

  return (
    <div className="absolute bottom-[90px] lg:bottom-10 left-0 right-0 px-4 lg:px-12 z-30">
      <div className="max-w-3xl mx-auto">
        <form onSubmit={handleSendMessage}>
          <div className={`relative bg-[#0F141E] border border-white/[0.08] rounded-[1.25rem] flex items-end p-1.5 lg:p-2 pr-4 lg:pr-5 transition-all duration-300 ${activeCount > 0 ? 'shadow-2xl shadow-black/80 ring-1 ring-white/5' : 'opacity-80'}`}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); } }}
              placeholder={isRewriting ? "AI is rewriting your query..." : (activeCount > 0 ? "Query the Chain..." : "Select a unit from Neural Feed to chat...")}
              disabled={isLoading || isRewriting || activeCount === 0}
              className={`flex-1 bg-transparent border-none focus:ring-0 text-white placeholder-[#4A5568] px-4 py-3 resize-none max-h-36 text-[14px] leading-[1.6] outline-none ${activeCount === 0 || isRewriting ? 'cursor-not-allowed italic opacity-70' : ''}`}
              rows="1"
            />
            <div className="pb-2.5 flex items-center gap-3 lg:gap-4">
              <HiSparkles
                onClick={handleManualRewrite}
                className={`text-[19px] cursor-pointer transition-all ${isRewriting ? 'text-[#38B28E] animate-spin-slow' : 'text-[#4A5568] hover:text-[#38B28E]'} ${activeCount === 0 || !input.trim() ? 'opacity-20 pointer-events-none' : ''}`}
                title="Enhance Prompt"
              />
              <button
                type="submit"
                disabled={isLoading || isRewriting || !input.trim() || activeCount === 0}
                className="text-[#D4AF37] hover:text-[#E8C84A] disabled:text-[#4A5568] transition-all disabled:opacity-30"
              >
                <FiSend className="text-[20px]" />
              </button>
            </div>
          </div>
          <div className="flex items-center justify-center gap-4 mt-2 px-4 translate-y-2">
            <div className="w-[30%] h-[1px] bg-gradient-to-r from-transparent to-white/5"></div>
            <div className="w-1 h-1 rounded-full bg-white/10"></div>
            <div className="w-[30%] h-[1px] bg-gradient-to-l from-transparent to-white/5"></div>
          </div>
        </form>
      </div>
    </div>
  );
}

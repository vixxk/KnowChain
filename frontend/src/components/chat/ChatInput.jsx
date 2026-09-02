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
    <div className="absolute bottom-4 sm:bottom-6 left-0 right-0 px-4 sm:px-8 z-30">
      <div className="max-w-3xl mx-auto">
        <form onSubmit={handleSendMessage}>
          <div className={`relative bg-[#08090b] border border-[#2a2d36] focus-within:border-[#3b82f6] rounded-xl flex items-end p-2 transition-all ${
            activeCount > 0 ? 'focus-within:ring-2 focus-within:ring-[#3b82f6]/20' : 'opacity-70'
          }`}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); } }}
              placeholder={isRewriting ? "Refining prompt..." : (activeCount > 0 ? "Query vector knowledge chain..." : "Select a unit from Neural Feed to query...")}
              disabled={isLoading || isRewriting || activeCount === 0}
              className={`flex-1 bg-transparent border-0 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 shadow-none focus:shadow-none text-[#eef0f3] placeholder-[#454952] px-3 py-2 resize-none max-h-36 text-xs sm:text-sm leading-relaxed font-mono ${activeCount === 0 || isRewriting ? 'cursor-not-allowed italic' : ''}`}
              style={{ outline: 'none', boxShadow: 'none' }}
              rows="1"
            />
            <div className="pb-1.5 flex items-center gap-2 px-2">
              <div className="relative flex items-center group">
                <button
                  type="button"
                  onClick={handleManualRewrite}
                  disabled={activeCount === 0 || !input.trim() || isRewriting}
                  className={`p-1 rounded-md transition-all ${
                    isRewriting 
                      ? 'text-[#fbbf24]' 
                      : 'text-[#6b7280] hover:text-[#60a5fa] hover:bg-[#16181d]'
                  } ${activeCount === 0 || !input.trim() ? 'opacity-30 pointer-events-none' : 'cursor-pointer'}`}
                >
                  <HiSparkles className={`text-lg ${isRewriting ? 'animate-spin' : ''}`} />
                </button>

                {/* Custom Hover Description Tooltip */}
                <div className="absolute bottom-full right-0 mb-2.5 hidden group-hover:flex items-center gap-1.5 px-2.5 py-1 bg-[#101216] border border-[#2a2d36] text-[#eef0f3] text-[11px] font-mono rounded-md shadow-xl whitespace-nowrap pointer-events-none z-50 animate-fade-in">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6]"></span>
                  <span>Rewrite Prompt</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || isRewriting || !input.trim() || activeCount === 0}
                className="w-8 h-8 rounded-full btn-blue-primary text-white flex items-center justify-center transition-all disabled:opacity-30 disabled:pointer-events-none shrink-0"
              >
                <FiSend size={13} />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

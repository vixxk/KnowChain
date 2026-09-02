import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  HiOutlineDuplicate, HiCheck, HiExternalLink, HiOutlineUser
} from 'react-icons/hi';
import API_BASE_URL from '../api/config';

export default function MessageBubble({ message }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isAi = message.sender === 'ai';
  const isError = message.isError;

  if (isAi) {
    return (
      <div className="animate-fade-in w-full max-w-4xl mx-auto my-4">
        {/* Distinguishable High-Density AI Response Card Container */}
        <div className={`rounded-xl border p-4 sm:p-5 bg-[#101216] transition-all shadow-md ${
          isError 
            ? 'border-[#f87171]/40 bg-[#f87171]/5' 
            : 'border-[#1f2229] hover:border-[#2a2d36] border-l-4 border-l-[#3b82f6]'
        }`}>
          {/* Card Header */}
          <div className="flex items-center justify-between gap-2 pb-3 mb-3.5 border-b border-[#1f2229]">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-[#08090b] border border-[#2a2d36] flex items-center justify-center shrink-0 text-[#60a5fa] font-mono text-[10px] font-bold shadow-inner">
                KC
              </div>
              <span className="text-xs font-mono font-semibold text-[#eef0f3]">KnowChain Engine</span>
              {message.sourceCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#08090b] border border-[#2a2d36] rounded text-[10px] font-medium text-[#60a5fa] font-mono">
                  {message.sourceCount} {message.sourceCount === 1 ? 'Source' : 'Sources'}
                </span>
              )}
            </div>

            <button 
              onClick={handleCopy}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-mono font-medium border transition-all ${
                copied 
                  ? 'bg-[#34d399]/10 border-[#34d399]/30 text-[#34d399]' 
                  : 'bg-[#08090b] border-[#2a2d36] text-[#9ca3af] hover:text-[#3b82f6] hover:border-[#3b82f6]/40'
              }`}
            >
              {copied ? (
                <>
                  <HiCheck size={12} />
                  <span>COPIED</span>
                </>
              ) : (
                <>
                  <HiOutlineDuplicate size={12} />
                  <span>COPY</span>
                </>
              )}
            </button>
          </div>

          {/* Document Text Content with Styled Markdown */}
          <div className={`text-sm leading-relaxed ${isError ? 'text-[#f87171]' : 'text-[#eef0f3]'}`}>
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({node, children, ...rest}) => {
                  const sources = message.sources || [];
                  const processChildren = (kids) => {
                    if (!Array.isArray(kids)) kids = [kids];
                    return kids.map((child, i) => {
                      if (typeof child === 'string') {
                        const parts = child.split(/(\[Source\s*\d+\])/gi);
                        if (parts.length > 1) {
                          return parts.map((part, j) => {
                            if (/^\[Source\s*\d+\]$/i.test(part)) {
                              const num = parseInt(part.match(/\d+/)?.[0]);
                              const src = sources.find(s => s.id === num);
                              let href = src?.source || null;
                              if (href && href.startsWith('uploads/')) {
                                href = `${API_BASE_URL}/${href}`;
                              }
                              if (href) {
                                return (
                                  <a key={`${i}-${j}`} href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 bg-[#08090b] hover:bg-[#16181d] border border-[#2a2d36] hover:border-[#3b82f6] rounded text-[10px] font-semibold text-[#60a5fa] no-underline transition-all cursor-pointer font-mono">
                                    <HiExternalLink className="text-[9px]" />{part}
                                  </a>
                                );
                              }
                              return (
                                <span key={`${i}-${j}`} onClick={() => { document.getElementById(`source-ref-${message.id}`)?.scrollIntoView({ behavior: 'smooth' }); }} className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 bg-[#08090b] hover:bg-[#16181d] border border-[#2a2d36] hover:border-[#3b82f6] rounded text-[10px] font-semibold text-[#60a5fa] cursor-pointer transition-all font-mono">
                                  <HiExternalLink className="text-[9px]" />{part}
                                </span>
                              );
                            }
                            return part;
                          });
                        }
                      }
                      return child;
                    });
                  };
                  return <p className="mb-3 last:mb-0 leading-relaxed block clear-both text-[#eef0f3]" {...rest}>{processChildren(children)}</p>;
                },
                h1: ({node, children, ...rest}) => (
                  <h1 className="text-sm sm:text-base font-bold font-mono uppercase tracking-wider text-[#60a5fa] mt-4 mb-2 pb-1 border-b border-[#1f2229] flex items-center gap-2" {...rest}>
                    <span className="w-2 h-2 rounded-full bg-[#3b82f6] inline-block shrink-0"></span>
                    {children}
                  </h1>
                ),
                h2: ({node, children, ...rest}) => (
                  <h2 className="text-xs sm:text-sm font-bold font-mono uppercase tracking-wider text-[#60a5fa] mt-3.5 mb-2 flex items-center gap-2" {...rest}>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6] inline-block shrink-0"></span>
                    {children}
                  </h2>
                ),
                h3: ({node, children, ...rest}) => (
                  <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-[#60a5fa] mt-3 mb-1.5 flex items-center gap-2" {...rest}>
                    <span className="w-1.5 h-1.5 rounded-sm bg-[#3b82f6] inline-block shrink-0"></span>
                    {children}
                  </h3>
                ),
                h4: ({node, children, ...rest}) => (
                  <h4 className="text-[11px] font-bold font-mono uppercase tracking-wider text-[#60a5fa] mt-2.5 mb-1 flex items-center gap-2" {...rest}>
                    {children}
                  </h4>
                ),
                strong: ({node, children, ...rest}) => (
                  <strong className="font-semibold text-[#eef0f3]" {...rest}>
                    {children}
                  </strong>
                ),
                ul: ({node, ...rest}) => <ul className="list-disc pl-5 my-2.5 space-y-1.5 text-[#eef0f3] clear-both" {...rest} />,
                ol: ({node, ...rest}) => <ol className="list-decimal pl-5 my-2.5 space-y-1.5 text-[#eef0f3] clear-both" {...rest} />,
                li: ({node, ...rest}) => <li className="leading-relaxed text-[#eef0f3] pl-0.5 my-0.5" {...rest} />,
                img: ({node, ...rest}) => {
                  const { alt, src, ...validProps } = rest;
                  let imgSrc = src || '';
                  if (imgSrc && !imgSrc.startsWith('http') && !imgSrc.startsWith('/')) {
                    imgSrc = `${API_BASE_URL}/${imgSrc}`;
                  }
                  return (
                    <span className="block clear-both my-3 w-full text-left">
                      <img 
                        {...validProps} 
                        src={imgSrc}
                        alt={alt || "Image"} 
                        referrerPolicy="no-referrer"
                        className="inline-block max-w-[220px] max-h-[160px] object-contain rounded-md border border-[#2a2d36] bg-[#08090b] p-1" 
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                      {alt && <span className="block text-[10px] text-[#6b7280] font-mono mt-1">{alt}</span>}
                    </span>
                  );
                },
                code: ({node, inline, className, children, ...rest}) => {
                  const isBlock = className?.includes('language-');
                  return isBlock ? (
                    <div className="my-3 p-3 bg-[#08090b] border border-[#1f2229] rounded-md overflow-x-auto clear-both">
                      <code {...rest} className={`text-xs font-mono text-[#60a5fa] ${className || ''}`}>
                        {children}
                      </code>
                    </div>
                  ) : (
                    <code {...rest} className="px-1.5 py-0.5 bg-[#08090b] border border-[#2a2d36] rounded text-[#60a5fa] font-mono text-xs">
                      {children}
                    </code>
                  );
                }
              }}
            >
              {message.text}
            </ReactMarkdown>
          </div>

          {/* Sources Citation Section */}
          {message.sources && message.sources.length > 0 && (
            <div id={`source-ref-${message.id}`} className="mt-4 pt-3 border-t border-[#1f2229] space-y-2 text-xs font-mono">
              <span className="text-[10px] font-semibold text-[#6b7280] uppercase tracking-wider">Citations & References</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[...new Map(message.sources.map(s => [s.id, s])).values()].map(src => (
                  <div key={src.id} className="flex items-center gap-2 p-2 bg-[#08090b] border border-[#1f2229] rounded-md hover:border-[#2a2d36] transition-all">
                    <span className="shrink-0 px-1.5 py-0.5 bg-[#101216] border border-[#2a2d36] rounded text-[10px] text-[#60a5fa]">#{src.id}</span>
                    {src.source ? (
                      <a href={src.source.startsWith('http') ? src.source : `${API_BASE_URL}/${src.source}`} target="_blank" rel="noopener noreferrer" className="text-xs text-[#9ca3af] hover:text-[#3b82f6] truncate transition-colors flex items-center gap-1">
                        <HiExternalLink size={11} className="shrink-0 text-[#6b7280]" />
                        <span className="truncate">{src.source.replace(/^uploads\//, '')}</span>
                      </a>
                    ) : (
                      <span className="text-xs text-[#9ca3af] truncate">{src.preview}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // User Message Bubble - Solid Blue Background (#3b82f6)
  return (
    <div className="flex gap-3 items-start justify-end animate-fade-in w-full max-w-4xl mx-auto my-4 group">
      <div className="flex-1 max-w-[80%] sm:max-w-[70%] space-y-1">
        <div className="flex items-center justify-end gap-2 pr-1">
          <span className="text-[11px] font-mono text-[#6b7280]">You</span>
          <button 
            onClick={handleCopy}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono transition-all border ${
              copied 
                ? 'bg-[#34d399]/10 border-[#34d399]/30 text-[#34d399]' 
                : 'bg-[#08090b] border-[#2a2d36] text-[#6b7280] hover:text-[#eef0f3] opacity-0 group-hover:opacity-100'
            }`}
          >
            {copied ? <HiCheck size={11} /> : <HiOutlineDuplicate size={11} />}
          </button>
        </div>

        <div className="bg-[#3b82f6] text-white rounded-xl p-3.5 shadow-md border border-[#3b82f6]/80">
          <div className="text-sm leading-relaxed whitespace-pre-wrap font-sans">
            {message.text}
          </div>
        </div>
      </div>

      <div className="w-7 h-7 rounded-lg bg-[#16181d] border border-[#2a2d36] flex items-center justify-center shrink-0 mt-5 text-[#9ca3af]">
        <HiOutlineUser size={14} />
      </div>
    </div>
  );
}

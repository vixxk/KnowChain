import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  HiOutlineDuplicate, HiCheck, HiExternalLink, HiOutlineUser, HiOutlineDatabase, HiSparkles
} from 'react-icons/hi';
import API_BASE_URL from '../api/config';

function CodeBlock({ language, children }) {
  const [copiedCode, setCopiedCode] = useState(false);
  const codeString = String(children).replace(/\n$/, '');

  const copyCode = () => {
    navigator.clipboard.writeText(codeString);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="code-terminal-wrapper">
      <div className="code-terminal-header">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#ef4444]/80 inline-block"></span>
          <span className="w-2 h-2 rounded-full bg-[#f59e0b]/80 inline-block"></span>
          <span className="w-2 h-2 rounded-full bg-[#10b981]/80 inline-block"></span>
          <span className="ml-2 font-mono text-[10px] text-[#60a5fa] uppercase tracking-wider font-semibold">
            {language || 'TERMINAL'}
          </span>
        </div>
        <button
          onClick={copyCode}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono text-[#9ca3af] hover:text-[#eef0f3] hover:bg-[#16181d] transition-all"
        >
          {copiedCode ? (
            <>
              <HiCheck size={11} className="text-[#34d399]" />
              <span className="text-[#34d399]">COPIED</span>
            </>
          ) : (
            <>
              <HiOutlineDuplicate size={11} />
              <span>COPY</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3.5 m-0 overflow-x-auto text-xs font-mono leading-relaxed text-[#93c5fd] bg-[#07080a]">
        <code>{codeString}</code>
      </pre>
    </div>
  );
}

export default function MessageBubble({ message }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isAi = message.sender === 'ai';
  const isError = message.isError;
  const isStreaming = Boolean(message.isStreaming);

  if (isAi) {
    return (
      <div className="animate-fade-in w-full max-w-4xl mx-auto my-4">
        {/* Futuristic Neural HUD Console Box */}
        <div className={`ai-hud-box p-4 sm:p-5 transition-all ${
          isError 
            ? '!border-[#f87171]/40 !bg-[#f87171]/5' 
            : isStreaming 
              ? '!border-[#3b82f6]/60 shadow-[0_0_25px_rgba(59,130,246,0.15)]' 
              : ''
        }`}>
          {/* Top Luminous Ambient Beam */}
          <div className="ai-hud-top-beam" />

          {/* HUD Header Bar */}
          <div className="flex items-center justify-between gap-2 pb-3 mb-3.5 border-b border-[#1f2229]">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Neural Core Icon Badge */}
              <div className="w-6 h-6 rounded-md bg-[#08090b] border border-[#2a2d36] flex items-center justify-center shrink-0 text-[#60a5fa] font-mono text-[10px] font-bold shadow-inner relative overflow-hidden">
                <span className="relative z-10">KC</span>
                <span className="absolute inset-0 bg-blue-500/10 animate-pulse"></span>
              </div>
              
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-mono font-semibold text-[#eef0f3] tracking-wide">
                  KnowChain Engine
                </span>
              </div>

              {/* Status Badge: Active Streaming vs Grounded */}
              {isStreaming ? (
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#3b82f6]/10 border border-[#3b82f6]/40 rounded text-[10px] font-medium text-[#60a5fa] font-mono tech-scanning-bar">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#60a5fa] animate-ping" />
                  <span>SYNTHESIZING...</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#08090b] border border-[#2a2d36] rounded text-[10px] font-medium text-[#9ca3af] font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#34d399]" />
                  <span>GROUNDED</span>
                </div>
              )}

              {/* Source Count Badge */}
              {message.sourceCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#08090b] border border-[#2a2d36] rounded text-[10px] font-medium text-[#60a5fa] font-mono">
                  <HiOutlineDatabase size={11} className="text-[#60a5fa]" />
                  <span>{message.sourceCount} {message.sourceCount === 1 ? 'Source' : 'Sources'}</span>
                </span>
              )}
            </div>

            {/* Copy Button */}
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
            {message.text ? (
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
                                    <a key={`${i}-${j}`} href={href} target="_blank" rel="noopener noreferrer" className="citation-chip no-underline cursor-pointer">
                                      <HiExternalLink className="text-[9px]" />{part}
                                    </a>
                                  );
                                }
                                return (
                                  <span key={`${i}-${j}`} onClick={() => { document.getElementById(`source-ref-${message.id}`)?.scrollIntoView({ behavior: 'smooth' }); }} className="citation-chip cursor-pointer">
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
                    <h1 className="text-sm sm:text-base font-bold font-mono uppercase tracking-wider text-[#60a5fa] mt-4 mb-2 pb-1.5 border-b border-[#1f2229] flex items-center gap-2" {...rest}>
                      <span className="w-2 h-2 rounded-full bg-[#3b82f6] inline-block shrink-0 shadow-[0_0_6px_#3b82f6]"></span>
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
                    <strong className="font-semibold text-[#f8fafc] bg-white/[0.04] px-1 py-0.5 rounded border border-white/[0.06]" {...rest}>
                      {children}
                    </strong>
                  ),
                  ul: ({node, ...rest}) => <ul className="list-none pl-1 my-2.5 space-y-2 text-[#eef0f3] clear-both" {...rest} />,
                  ol: ({node, ...rest}) => <ol className="list-decimal pl-5 my-2.5 space-y-2 text-[#eef0f3] clear-both" {...rest} />,
                  li: ({node, children, ...rest}) => (
                    <li className="leading-relaxed text-[#eef0f3] flex items-start gap-2 text-sm" {...rest}>
                      <span className="text-[#3b82f6] mt-1 shrink-0 font-mono text-xs">▸</span>
                      <div className="flex-1">{children}</div>
                    </li>
                  ),
                  blockquote: ({node, children, ...rest}) => (
                    <blockquote className="border-l-2 border-[#3b82f6] pl-3 py-1 my-3 bg-[#3b82f6]/5 rounded-r text-[#9ca3af] italic text-xs font-sans" {...rest}>
                      {children}
                    </blockquote>
                  ),
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
                          className="inline-block max-w-[240px] max-h-[170px] object-contain rounded-lg border border-[#2a2d36] bg-[#08090b] p-1 shadow-md" 
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                        {alt && <span className="block text-[10px] text-[#6b7280] font-mono mt-1">{alt}</span>}
                      </span>
                    );
                  },
                  code: ({node, inline, className, children, ...rest}) => {
                    const match = /language-(\w+)/.exec(className || '');
                    const isBlock = match || !inline;
                    if (isBlock && !inline) {
                      return (
                        <CodeBlock language={match ? match[1] : ''}>
                          {children}
                        </CodeBlock>
                      );
                    }
                    return (
                      <code {...rest} className="px-1.5 py-0.5 bg-[#08090b] border border-[#2a2d36] rounded text-[#60a5fa] font-mono text-xs">
                        {children}
                      </code>
                    );
                  }
                }}
              >
                {message.text}
              </ReactMarkdown>
            ) : isStreaming ? (
              <div className="flex items-center gap-2 text-xs font-mono text-[#60a5fa] py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6] animate-ping" />
                <span>Reading knowledge vector layer...</span>
              </div>
            ) : null}

            {/* Real-time Blinking Terminal Cursor during streaming */}
            {isStreaming && (
              <span className="streaming-cursor" title="Synthesizing..." />
            )}
          </div>

          {/* Sources Citation Section */}
          {message.sources && message.sources.length > 0 && (
            <div id={`source-ref-${message.id}`} className="mt-4 pt-3 border-t border-[#1f2229] space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-[#6b7280] uppercase tracking-wider flex items-center gap-1.5">
                  <HiOutlineDatabase size={11} className="text-[#3b82f6]" />
                  Neural Citations & References
                </span>
                <span className="text-[10px] text-[#4b5563]">Grounded Hybrid Layer</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[...new Map(message.sources.map(s => [s.id, s])).values()].map(src => (
                  <div key={src.id} className="flex items-center gap-2 p-2 bg-[#08090b] border border-[#1f2229] rounded-md hover:border-[#3b82f6]/50 transition-all group/src">
                    <span className="shrink-0 px-1.5 py-0.5 bg-[#101216] border border-[#2a2d36] rounded text-[10px] text-[#60a5fa] font-bold">#{src.id}</span>
                    {src.source ? (
                      <a href={src.source.startsWith('http') ? src.source : `${API_BASE_URL}/${src.source}`} target="_blank" rel="noopener noreferrer" className="text-xs text-[#9ca3af] group-hover/src:text-[#60a5fa] truncate transition-colors flex items-center gap-1">
                        <HiExternalLink size={11} className="shrink-0 text-[#6b7280] group-hover/src:text-[#60a5fa]" />
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

  // Futuristic User Message Capsule
  return (
    <div className="flex gap-3 items-start justify-end animate-fade-in w-full max-w-4xl mx-auto my-4 group">
      <div className="flex-1 max-w-[85%] sm:max-w-[75%] space-y-1.5">
        {/* User Capsule Meta Header */}
        <div className="flex items-center justify-end gap-2 pr-1">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#08090b]/80 border border-[#1f2229] text-[10px] font-mono text-[#60a5fa]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8] shadow-[0_0_6px_#38bdf8] animate-pulse"></span>
            <span className="font-semibold tracking-wider">OPERATOR</span>
          </div>
          <button 
            onClick={handleCopy}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono transition-all border ${
              copied 
                ? 'bg-[#34d399]/10 border-[#34d399]/30 text-[#34d399]' 
                : 'bg-[#08090b] border-[#1f2229] text-[#6b7280] hover:text-[#eef0f3] hover:border-[#3b82f6]/40 opacity-70 group-hover:opacity-100'
            }`}
          >
            {copied ? <HiCheck size={11} /> : <HiOutlineDuplicate size={11} />}
            <span>{copied ? 'COPIED' : 'COPY'}</span>
          </button>
        </div>

        {/* Unique Cyber-Cut User Bubble */}
        <div className="user-msg-capsule p-4 sm:p-5 relative">
          <div className="user-corner-notch" />
          <div className="text-sm sm:text-[14.5px] leading-relaxed whitespace-pre-wrap font-sans text-[#f1f5f9] select-text">
            {message.text}
          </div>
        </div>
      </div>

      {/* Futuristic User Avatar Ring */}
      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#1e293b] to-[#0f172a] border border-[#3b82f6]/40 flex items-center justify-center shrink-0 mt-6 text-[#60a5fa] shadow-[0_0_12px_rgba(59,130,246,0.2)]">
        <HiOutlineUser size={16} />
      </div>
    </div>
  );
}

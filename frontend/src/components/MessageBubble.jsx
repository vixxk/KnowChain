import { useState } from 'react';
import { HiOutlineUserCircle, HiCheck, HiOutlineDuplicate, HiExternalLink } from 'react-icons/hi';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import API_BASE_URL from '../api/config';

export default function MessageBubble({ message }) {
    const isAi = message.sender === 'ai';
    const isError = message.isError;
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(message.text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (isAi) {
        return (
            <div className="flex gap-4 items-start animate-fade-up w-full">
                <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center shrink-0 mt-1 shadow-lg shadow-black/20 overflow-hidden">
                    <img src="/favicon.png" className="w-6 h-6 object-contain" alt="AI" />
                </div>
                <div className="flex-1 max-w-[85%] space-y-1.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap min-h-[24px]">
                        <div className="flex items-center gap-2">
                            {message.sourceCount && message.text.includes('![') && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#38B28E]/10 border border-[#38B28E]/20 rounded-md text-[10px] font-bold text-[#38B28E] uppercase tracking-wider">
                                    {message.sourceCount} {message.sourceCount === 1 ? 'Source' : 'Sources'}
                                </span>
                            )}
                        </div>
                        <button 
                            onClick={handleCopy}
                            className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all border ${
                                copied 
                                    ? 'bg-[#38B28E]/20 border-[#38B28E]/40 text-[#38B28E]' 
                                    : 'bg-white/[0.04] border-white/[0.08] text-[#8A94A6] hover:text-white hover:bg-white/[0.08]'
                            }`}
                        >
                            {copied ? (
                                <>
                                    <HiCheck className="text-xs" />
                                    <span>Copied</span>
                                </>
                            ) : (
                                <>
                                    <HiOutlineDuplicate className="text-xs" />
                                    <span>Copy</span>
                                </>
                            )}
                        </button>
                    </div>
                    <div className={`group relative bg-[#111720]/40 lg:bg-[#38B28E]/[0.06] border border-[#38B28E]/15 rounded-2xl rounded-tl-sm px-5 py-4 ${isError ? 'bg-red-500/5 border-red-500/20' : ''}`}>
                        <div className={`text-[13.5px] leading-[1.8] ${isError ? 'text-red-400' : 'text-[#C8D1DC]'}`}>
                            <ReactMarkdown 
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    // Auto-style [Source X] citations in paragraphs
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
                                                                    return <a key={`${i}-${j}`} href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 border border-[#D4AF37]/30 rounded text-[10px] font-bold text-[#D4AF37] no-underline transition-all cursor-pointer"><HiExternalLink className="text-[9px]" />{part}</a>;
                                                                }
                                                                return <span key={`${i}-${j}`} onClick={() => { document.getElementById(`source-ref-${message.id}`)?.scrollIntoView({ behavior: 'smooth' }); }} className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 border border-[#D4AF37]/30 rounded text-[10px] font-bold text-[#D4AF37] cursor-pointer transition-all"><HiExternalLink className="text-[9px]" />{part}</span>;
                                                            }
                                                            return part;
                                                        });
                                                    }
                                                }
                                                return child;
                                            });
                                        };
                                        return <p {...rest}>{processChildren(children)}</p>;
                                    },
                                    // Custom citation style [1]
                                    a: ({node, ...rest}) => {
                                        const { children, ...validProps } = rest;
                                        const hasImage = Array.isArray(children) ? children.some(c => typeof c !== 'string' && (c?.type?.name === 'img' || c?.props?.src)) : (children?.type?.name === 'img');
                                        
                                        if (hasImage) {
                                            return <a {...validProps} className="block hover:opacity-90 transition-opacity">{children}</a>;
                                        }

                                        return (
                                            <a {...validProps} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 -mx-0.5 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 border border-[#D4AF37]/30 rounded text-[10px] font-bold text-[#D4AF37] no-underline transition-all">
                                                {children}
                                                <HiExternalLink className="text-[9px]" />
                                            </a>
                                        );
                                    },
                                    // Premium images
                                    img: ({node, ...rest}) => {
                                        const { alt, ...validProps } = rest;
                                        return (
                                            <span className="my-5 flex flex-col items-center gap-2 w-full">
                                                <img 
                                                    {...validProps} 
                                                    alt={alt} 
                                                    referrerPolicy="no-referrer"
                                                    className="max-w-[85%] rounded-xl border border-white/10 shadow-2xl shadow-black/40" 
                                                    onError={(e) => { e.target.style.display = 'none'; }}
                                                />
                                                {alt && <span className="text-[10px] text-[#4A5568] uppercase font-bold tracking-widest">{alt}</span>}
                                            </span>
                                        );
                                    },
                                    // Highlighting major points
                                    strong: ({node, ...rest}) => {
                                        const { children, ...validProps } = rest;
                                        return (
                                            <span {...validProps} className="inline-flex bg-[#D4AF37]/20 text-white font-black px-1.5 rounded shadow-[0_0_15px_rgba(212,175,55,0.2)] mx-0.5 align-middle">
                                                {children}
                                            </span>
                                        );
                                    },
                                    // Code/Architecture blocks
                                    code: ({node, inline, className, children, ...rest}) => {
                                        const isBlock = className?.includes('language-');
                                        return isBlock ? (
                                            <span className="my-4 p-4 bg-black/40 border border-white/[0.04] rounded-xl overflow-x-auto block">
                                                <code {...rest} className={`text-[12px] font-mono text-[#D4AF37] ${className || ''}`}>
                                                    {children}
                                                </code>
                                            </span>
                                        ) : (
                                            <code {...rest} className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-teal-400 font-mono text-[12px]">
                                                {children}
                                            </code>
                                        );
                                    },
                                    // Workflows / Architecture headings
                                    h3: ({node, ...rest}) => {
                                        const { children, ...validProps } = rest;
                                        return (
                                            <span {...validProps} className="mt-8 mb-3 text-[11px] font-black text-white uppercase tracking-[0.25em] flex items-center gap-3 w-full">
                                                <span className="w-1.5 h-1.5 bg-[#D4AF37] rounded-full shrink-0"></span>
                                                {children}
                                                <span className="flex-1 h-[1px] bg-gradient-to-r from-white/10 to-transparent"></span>
                                            </span>
                                        );
                                    }
                                }}
                            >
                                {message.text}
                            </ReactMarkdown>
                        </div>
                    </div>
                    {/* Sources Reference Panel - Only visible if cited in text or has images */}
                    {message.sources && message.sources.length > 0 && message.text.includes('![') && (
                        <div id={`source-ref-${message.id}`} className="mt-2 bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3 space-y-2">
                            <span className="text-[9px] font-bold text-[#8A94A6] uppercase tracking-widest">References</span>
                            {[...new Map(message.sources.map(s => [s.id, s])).values()].map(src => (
                                <div key={src.id} className="flex items-start gap-2">
                                    <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded text-[9px] font-bold text-[#D4AF37]">{src.id}</span>
                                    {src.source ? (
                                        <a href={src.source.startsWith('http') ? src.source : `${API_BASE_URL}/${src.source}`} target="_blank" rel="noopener noreferrer" className="text-[11px] text-[#38B28E] hover:text-[#4DD4A8] truncate transition-colors flex items-center gap-1">
                                            <HiExternalLink className="text-[10px] shrink-0" />
                                            {src.source.length > 60 ? src.source.substring(0, 60) + '...' : src.source}
                                        </a>
                                    ) : (
                                        <span className="text-[11px] text-[#6B7A90] truncate">{src.preview}</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="flex gap-4 items-start justify-end animate-fade-up w-full group">
            <div className="flex-1 max-w-[75%] space-y-1.5">
                <div className="flex items-center justify-end h-6">
                     <button 
                        onClick={handleCopy}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all border ${
                            copied 
                                ? 'bg-[#38B28E]/20 border-[#38B28E]/40 text-[#38B28E]' 
                                : 'bg-white/[0.04] border-white/[0.08] text-[#8A94A6] hover:text-white hover:bg-white/[0.08]'
                        }`}
                    >
                        {copied ? (
                            <>
                                <HiCheck className="text-xs" />
                                <span>Copied</span>
                            </>
                        ) : (
                            <>
                                <HiOutlineDuplicate className="text-xs" />
                                <span>Copy</span>
                            </>
                        )}
                    </button>
                </div>
                <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl rounded-tr-sm px-5 py-4 text-left">
                    <div className="text-[14px] text-[#E8ECF1] leading-relaxed">
                        <ReactMarkdown>
                            {message.text}
                        </ReactMarkdown>
                    </div>
                </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0 mt-1 text-[#8A94A6]">
                <HiOutlineUserCircle className="text-xl" />
            </div>
        </div>
    );
}

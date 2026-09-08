export default function WelcomeHub() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center animate-fade-in text-center px-4 py-8">
      {/* Cyber Pill Chip */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#3b82f6]/10 border border-[#3b82f6]/30 text-[#60a5fa] text-[11px] font-mono mb-5 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#60a5fa] animate-ping" />
        <span className="tracking-wider uppercase font-semibold">Neural RAG Workspace</span>
      </div>

      <div className="w-14 h-14 bg-[#08090b] border border-[#2a2d36] rounded-xl flex items-center justify-center mb-5 overflow-hidden shadow-[0_0_25px_rgba(59,130,246,0.25)] relative">
        <div className="absolute inset-0 bg-blue-500/10 animate-pulse pointer-events-none"></div>
        <img src="/favicon.png" className="w-full h-full object-cover relative z-10" alt="KnowChain" />
      </div>

      <h2 className="text-2xl lg:text-3xl font-extrabold text-[#eef0f3] tracking-tight mb-2.5 font-mono">
        KnowChain Engine
      </h2>
      <p className="text-xs lg:text-sm text-[#9ca3af] max-w-md leading-relaxed mb-8">
        Sync documents to the <span className="text-[#60a5fa] font-mono font-medium">Neural Feed</span> to begin context-aware querying.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full max-w-xl text-left">
        <div className="bg-[#0e1015]/80 backdrop-blur-md border border-[#1f2229] p-4 rounded-xl hover:border-[#3b82f6]/40 hover:bg-[#121620]/90 transition-all duration-200 group shadow-sm">
          <h4 className="text-[11px] font-semibold text-[#3b82f6] group-hover:text-[#60a5fa] uppercase tracking-wider mb-1.5 font-mono flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-[#3b82f6]"></span>
            <span>Document Indexing</span>
          </h4>
          <p className="text-xs text-[#9ca3af] leading-relaxed">Upload <span className="text-[#eef0f3] font-mono">PDFs</span> or paste <span className="text-[#eef0f3] font-mono">text snippets</span> to index into Qdrant vector space.</p>
        </div>
        <div className="bg-[#0e1015]/80 backdrop-blur-md border border-[#1f2229] p-4 rounded-xl hover:border-[#3b82f6]/40 hover:bg-[#121620]/90 transition-all duration-200 group shadow-sm">
          <h4 className="text-[11px] font-semibold text-[#60a5fa] group-hover:text-[#93c5fd] uppercase tracking-wider mb-1.5 font-mono flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-[#60a5fa]"></span>
            <span>Verifiable RAG</span>
          </h4>
          <p className="text-xs text-[#9ca3af] leading-relaxed">Connect <span className="text-[#eef0f3] font-mono">Web Nodes</span> for real-time answer generation with exact source attribution.</p>
        </div>
      </div>
    </div>
  );
}

export default function WelcomeHub() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center animate-fade-in text-center px-4">
      <div className="w-14 h-14 bg-[#08090b] border border-[#2a2d36] rounded-xl flex items-center justify-center mb-6 overflow-hidden">
        <img src="/favicon.png" className="w-full h-full object-cover" alt="KnowChain" />
      </div>
      <h2 className="text-2xl lg:text-3xl font-bold text-[#eef0f3] tracking-tight mb-2 font-mono">
        KnowChain Engine
      </h2>
      <p className="text-xs lg:text-sm text-[#9ca3af] max-w-md leading-relaxed mb-8">
        Sync documents to the <span className="text-[#60a5fa] font-mono font-medium">Neural Feed</span> to begin context-aware querying.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-xl text-left">
        <div className="bg-[#16181d] border border-[#1f2229] p-4 rounded-lg hover:border-[#2a2d36] transition-all">
          <h4 className="text-[11px] font-semibold text-[#3b82f6] uppercase tracking-wider mb-1.5 font-mono">Document Indexing</h4>
          <p className="text-xs text-[#9ca3af] leading-relaxed">Upload <span className="text-[#eef0f3] font-mono">PDFs</span> or paste <span className="text-[#eef0f3] font-mono">text snippets</span> to index into Qdrant vector space.</p>
        </div>
        <div className="bg-[#16181d] border border-[#1f2229] p-4 rounded-lg hover:border-[#2a2d36] transition-all">
          <h4 className="text-[11px] font-semibold text-[#60a5fa] uppercase tracking-wider mb-1.5 font-mono">Verifiable RAG</h4>
          <p className="text-xs text-[#9ca3af] leading-relaxed">Connect <span className="text-[#eef0f3] font-mono">Web Nodes</span> for real-time answer generation with exact source attribution.</p>
        </div>
      </div>
    </div>
  );
}

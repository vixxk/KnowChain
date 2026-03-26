export default function WelcomeHub() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center animate-fade-in text-center px-4">
      <div className="w-20 h-20 bg-[#D4AF37]/10 rounded-[1.75rem] flex items-center justify-center mb-8 shadow-2xl shadow-[#D4AF37]/5 border border-[#D4AF37]/10 overflow-hidden">
        <img src="/favicon.png" className="w-12 h-12 object-contain" alt="KnowChain" />
      </div>
      <h2 className="text-2xl font-extrabold text-white tracking-tight mb-3">Your Knowledge Hub</h2>
      <p className="text-[13px] text-[#8A94A6] max-w-sm leading-relaxed mb-10 font-medium">
        Link your data to the <span className="text-[#D4AF37]">Neural Feed</span>. Sync documents or websites to begin.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
        <div className="bg-white/[0.02] border border-white/[0.04] p-5 rounded-2xl text-left hover:bg-white/[0.04] transition-all group">
          <h4 className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest mb-1.5">Document Sync</h4>
          <p className="text-[12px] text-[#8A94A6]">Upload any <span className="text-white font-bold">PDF</span> or paste <span className="text-white font-bold">huge text</span> snippets to sync them with your private feed.</p>
        </div>
        <div className="bg-white/[0.02] border border-white/[0.04] p-5 rounded-2xl text-left hover:bg-white/[0.04] transition-all group">
          <h4 className="text-[10px] font-bold text-[#E8ECF1] uppercase tracking-widest mb-1.5">Smart Search</h4>
          <p className="text-[12px] text-[#8A94A6]">Connect any <span className="text-white font-bold">website link</span> to search and get answers instantly.</p>
        </div>
      </div>
    </div>
  );
}

import { HiShieldCheck, HiX } from 'react-icons/hi';

export default function PrivacyModal({ isPrivacyModalOpen, setIsPrivacyModalOpen }) {
	if (!isPrivacyModalOpen) return null;

	return (
		<div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
			<div className="fixed inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsPrivacyModalOpen(false)}></div>
			<div className="relative w-full max-w-lg bg-[#0F1319] border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-slide-up">
				<div className="p-8">
					<div className="flex items-center justify-between mb-6">
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
								<HiShieldCheck className="text-emerald-400 text-xl" />
							</div>
							<h2 className="text-xl font-bold text-white">Privacy Mode Setup</h2>
						</div>
						<button onClick={() => setIsPrivacyModalOpen(false)} className="p-2 text-[#4A5568] hover:text-white transition-colors">
							<HiX size={24} />
						</button>
					</div>

					<div className="space-y-6 text-[#8A94A6]">
						<p className="text-sm leading-relaxed">
							Privacy Mode allows you to use your own <strong className="inline-flex bg-[#D4AF37]/20 text-white font-black px-1.5 rounded shadow-[0_0_15px_rgba(212,175,55,0.2)] mx-0.5 align-middle">Qdrant Vector Database</strong>. Your documents will be indexed directly into your private instance, ensuring your data never touches our shared cognitive lattice.
						</p>

						<div className="space-y-4">
							<h3 className="text-xs font-bold text-[#D4AF37] uppercase tracking-[0.2em]">Step-by-Step Guide</h3>
							<div className="space-y-3">
								<div className="flex gap-4">
									<span className="w-6 h-6 shrink-0 bg-white/5 rounded-lg flex items-center justify-center text-[10px] font-bold text-white border border-white/10">1</span>
									<p className="text-sm pt-0.5">Go to <a href="https://cloud.qdrant.io" target="_blank" rel="noreferrer" className="text-[#D4AF37] hover:underline">qdrant.io</a> and create a free account.</p>
								</div>
								<div className="flex gap-4">
									<span className="w-6 h-6 shrink-0 bg-white/5 rounded-lg flex items-center justify-center text-[10px] font-bold text-white border border-white/10">2</span>
									<p className="text-sm pt-0.5">Create a new <strong className="inline-flex bg-[#D4AF37]/10 text-white font-bold px-1.5 rounded border border-[#D4AF37]/20 mx-0.5">Cluster</strong> (Free Tier is sufficient).</p>
								</div>
								<div className="flex gap-4">
									<span className="w-6 h-6 shrink-0 bg-white/5 rounded-lg flex items-center justify-center text-[10px] font-bold text-white border border-white/10">3</span>
									<p className="text-sm pt-0.5">Wait for the cluster to be provisioned, then click on it.</p>
								</div>
								<div className="flex gap-4">
									<span className="w-6 h-6 shrink-0 bg-white/5 rounded-lg flex items-center justify-center text-[10px] font-bold text-white border border-white/10">4</span>
									<p className="text-sm pt-0.5">Copy the <strong className="inline-flex bg-[#D4AF37]/10 text-white font-bold px-1.5 rounded border border-[#D4AF37]/20 mx-0.5">Endpoint URL</strong> (it looks like `https://...cloud.qdrant.io:6333`).</p>
								</div>
								<div className="flex gap-4">
									<span className="w-6 h-6 shrink-0 bg-white/5 rounded-lg flex items-center justify-center text-[10px] font-bold text-white border border-white/10">5</span>
									<p className="text-sm pt-0.5">Paste that URL into the input field in the top bar.</p>
								</div>
							</div>
						</div>

						<div className="p-4 bg-white/5 rounded-2xl border border-white/5">
							<p className="text-xs font-medium italic">
								Note: Ensure your Qdrant instance is accessible via the internet. KnowChain v2 uses standard LangChain integrations to connect.
							</p>
						</div>

						<button 
							onClick={() => setIsPrivacyModalOpen(false)}
							className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-2xl transition-all active:scale-[0.98]"
						>
							Got it, let's secure!
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

import { HiShieldCheck, HiX } from 'react-icons/hi';

export default function PrivacyModal({ isPrivacyModalOpen, setIsPrivacyModalOpen }) {
	if (!isPrivacyModalOpen) return null;

	return (
		<div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
			<div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsPrivacyModalOpen(false)}></div>
			<div className="relative w-full max-w-lg bg-[#101216] border border-[#1f2229] rounded-xl overflow-hidden animate-fade-in font-mono">
				<div className="p-6">
					<div className="flex items-center justify-between mb-4 pb-3 border-b border-[#1f2229]">
						<div className="flex items-center gap-2">
							<HiShieldCheck className="text-[#3b82f6]" size={18} />
							<h2 className="text-sm font-bold text-[#eef0f3]">Privacy Mode Setup</h2>
						</div>
						<button onClick={() => setIsPrivacyModalOpen(false)} className="text-[#6b7280] hover:text-[#eef0f3]">
							<HiX size={18} />
						</button>
					</div>

					<div className="space-y-4 text-xs text-[#9ca3af]">
						<p className="leading-relaxed">
							Privacy Mode allows indexing directly into your private <strong className="text-[#60a5fa] font-mono">Qdrant Vector Database</strong> instance.
						</p>

						<div className="space-y-2">
							<h3 className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider">Setup Instructions</h3>
							<div className="space-y-2 text-[#9ca3af]">
								<div className="flex gap-3 items-start">
									<span className="px-1.5 py-0.5 bg-[#08090b] border border-[#2a2d36] text-[#60a5fa] text-[10px] rounded">1</span>
									<p className="pt-0.5">Go to <a href="https://cloud.qdrant.io" target="_blank" rel="noreferrer" className="text-[#60a5fa] hover:underline">qdrant.io</a> and create a free account.</p>
								</div>
								<div className="flex gap-3 items-start">
									<span className="px-1.5 py-0.5 bg-[#08090b] border border-[#2a2d36] text-[#60a5fa] text-[10px] rounded">2</span>
									<p className="pt-0.5">Create a free tier <strong className="text-[#eef0f3]">Cluster</strong>.</p>
								</div>
								<div className="flex gap-3 items-start">
									<span className="px-1.5 py-0.5 bg-[#08090b] border border-[#2a2d36] text-[#60a5fa] text-[10px] rounded">3</span>
									<p className="pt-0.5">Copy the cluster <strong className="text-[#eef0f3]">Endpoint URL</strong> (`https://...cloud.qdrant.io:6333`).</p>
								</div>
								<div className="flex gap-3 items-start">
									<span className="px-1.5 py-0.5 bg-[#08090b] border border-[#2a2d36] text-[#60a5fa] text-[10px] rounded">4</span>
									<p className="pt-0.5">Paste the Endpoint URL into the Privacy field in the top bar.</p>
								</div>
							</div>
						</div>

						<button 
							onClick={() => setIsPrivacyModalOpen(false)}
							className="w-full py-2.5 btn-blue-primary text-xs font-semibold uppercase tracking-wider"
						>
							Got It
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

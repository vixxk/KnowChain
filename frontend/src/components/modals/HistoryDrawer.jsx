import { HiOutlineCollection, HiChatAlt2, HiX } from 'react-icons/hi';

export default function HistoryDrawer({ 
	isHistoryOpen, 
	setIsHistoryOpen, 
	sessionList, 
	activeSessionId, 
	setActiveSessionId, 
	handleClearAllHistory, 
	handleDeleteSession 
}) {
	if (!isHistoryOpen) return null;

	return (
		<>
			<div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm lg:bg-transparent lg:backdrop-blur-none" onClick={() => setIsHistoryOpen(false)} />
			<div className="fixed bottom-0 inset-x-0 z-[70] lg:absolute lg:inset-x-auto lg:right-12 lg:bottom-auto lg:top-[84px] w-full lg:w-80 bg-[#0F1319] lg:bg-transparent lg:glass lg:border border-white/[0.08] lg:rounded-2xl rounded-t-[2rem] shadow-[0_-20px_50px_rgba(0,0,0,0.5)] lg:shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-6 lg:p-2 animate-slide-up lg:animate-fade-in origin-bottom lg:origin-top-right">
				<div className="lg:hidden w-12 h-1 bg-white/10 rounded-full mx-auto mb-6"></div>
				<div className="flex items-center justify-between px-4 py-3.5 border-b border-white/[0.04] mb-1">
					<span className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-[0.2em]">Chat History</span>
					{sessionList.length > 0 && (
						<button onClick={handleClearAllHistory} className="text-[10px] text-red-400/60 hover:text-red-400 font-bold uppercase tracking-wider transition-colors">Clear All</button>
					)}
				</div>
				<div className="max-h-[70vh] lg:max-h-80 overflow-y-auto scrollbar-hide py-1 space-y-1">
					{sessionList.length === 0 ? (
						<div className="py-12 flex flex-col items-center justify-center opacity-40">
							<HiOutlineCollection className="text-3xl mb-3" />
							<p className="text-center text-xs font-medium tracking-wide">No history yet</p>
						</div>
					) : sessionList.map(s => (
						<div key={s.id} className="group relative px-1">
							<button
								onClick={() => { setActiveSessionId(s.id); setIsHistoryOpen(false); }}
								className={`w-full flex items-center gap-4 px-4 py-4 lg:py-3.5 rounded-2xl lg:rounded-xl text-left transition-all duration-300 border ${
									activeSessionId === s.id ? 'bg-[#D4AF37]/10 border-[#D4AF37]/20 text-[#D4AF37] shadow-lg shadow-[#D4AF37]/5' : 'text-[#8A94A6] border-transparent hover:bg-white/[0.04] hover:text-white hover:border-white/[0.04]'
								}`}
							>
								<div className={`w-11 h-11 lg:w-10 lg:h-10 rounded-[14px] lg:rounded-lg flex items-center justify-center shrink-0 transition-colors ${activeSessionId === s.id ? 'bg-[#D4AF37]/20 text-[#D4AF37]' : 'bg-white/5 text-[#4A5568] group-hover:text-[#D4AF37]/60'}`}>
									<HiChatAlt2 size={24} className="lg:hidden" />
									<HiChatAlt2 size={20} className="hidden lg:block" />
								</div>
								<div className="flex-1 min-w-0">
									<p className={`text-[14px] lg:text-[13px] font-bold truncate ${activeSessionId === s.id ? 'text-[#D4AF37]' : 'text-slate-200'}`}>{s.name || 'Untitled Chat'}</p>
									<div className="flex items-center gap-2 mt-1">
										<span className="w-1 h-1 bg-white/10 rounded-full"></span>
										<p className="text-[10px] lg:text-[9px] font-medium text-[#4A5568] uppercase tracking-wider">{new Date(s.lastActive).toLocaleDateString()}</p>
									</div>
								</div>
							</button>
							<button onClick={(e) => { e.stopPropagation(); handleDeleteSession(s.id); }} className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg bg-red-400/0 hover:bg-red-400/10 text-[#4A5568] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all duration-300">
								<HiX size={16} />
							</button>
						</div>
					))}
				</div>
			</div>
		</>
	);
}

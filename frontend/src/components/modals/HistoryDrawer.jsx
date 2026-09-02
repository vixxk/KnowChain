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
			<div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm lg:bg-transparent lg:backdrop-blur-none" onClick={() => setIsHistoryOpen(false)} />
			<div className="fixed bottom-0 inset-x-0 z-[70] lg:absolute lg:inset-x-auto lg:right-6 lg:bottom-auto lg:top-[68px] w-full lg:w-80 bg-[#101216] border border-[#1f2229] rounded-t-xl lg:rounded-xl p-4 animate-fade-in origin-bottom lg:origin-top-right font-mono">
				<div className="flex items-center justify-between pb-2.5 border-b border-[#1f2229] mb-2">
					<span className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider">Chat History</span>
					{sessionList.length > 0 && (
						<button onClick={handleClearAllHistory} className="text-[10px] text-[#f87171] hover:text-red-400 font-semibold uppercase tracking-wider transition-colors">Clear All</button>
					)}
				</div>
				<div className="max-h-[60vh] lg:max-h-72 overflow-y-auto space-y-1">
					{sessionList.length === 0 ? (
						<div className="py-8 flex flex-col items-center justify-center text-[#6b7280]">
							<HiOutlineCollection className="text-2xl mb-1 text-[#454952]" />
							<p className="text-center text-xs">No history found</p>
						</div>
					) : sessionList.map(s => (
						<div key={s.id} className="group relative">
							<button
								onClick={() => { setActiveSessionId(s.id); setIsHistoryOpen(false); }}
								className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-all border ${
									activeSessionId === s.id ? 'bg-[#3b82f6]/10 border-[#3b82f6]/40 text-[#60a5fa]' : 'text-[#9ca3af] border-[#1f2229] bg-[#08090b] hover:bg-[#16181d] hover:text-[#eef0f3] hover:border-[#2a2d36]'
								}`}
							>
								<HiChatAlt2 size={16} className={activeSessionId === s.id ? 'text-[#3b82f6]' : 'text-[#6b7280]'} />
								<div className="flex-1 min-w-0">
									<p className="text-xs font-sans font-medium truncate">{s.name || 'Untitled Chat'}</p>
									<p className="text-[9px] text-[#6b7280] mt-0.5">{new Date(s.lastActive).toLocaleDateString()}</p>
								</div>
							</button>
							<button onClick={(e) => { e.stopPropagation(); handleDeleteSession(s.id); }} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#6b7280] hover:text-[#f87171] opacity-0 group-hover:opacity-100 transition-all">
								<HiX size={13} />
							</button>
						</div>
					))}
				</div>
			</div>
		</>
	);
}

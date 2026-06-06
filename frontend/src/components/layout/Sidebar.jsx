import SessionManager from '../SessionManager';

export default function Sidebar({ 
	activeTab, 
	sessions, 
	setSessions, 
	activeSessionId, 
	setActiveSessionId, 
	updateActiveSession, 
	cleanupSessionOnServer, 
	privacyMode, 
	customQdrantUrl 
}) {
	return (
		<aside className={`lg:flex flex-col w-full lg:w-[300px] shrink-0 bg-[#0F1319] lg:border-r border-white/5 overflow-hidden ${activeTab === 'feed' ? 'flex' : 'hidden'}`}>
			<div className="flex items-center gap-3 px-6 h-[72px] shrink-0 border-b border-white/5">
				<div className="w-9 h-9 bg-[#D4AF37]/10 rounded-xl flex items-center justify-center shadow-lg shadow-[#D4AF37]/5 border border-[#D4AF37]/20 overflow-hidden">
					<img src="/favicon.png" alt="KnowChain v2" className="w-6 h-6 object-contain" />
				</div>
				<span className="font-bold text-lg text-white">KnowChain v2</span>
			</div>
			<div className="flex-1 overflow-y-auto scrollbar-hide pb-20 lg:pb-0">
				<SessionManager
					sessions={sessions} 
					setSessions={setSessions}
					activeSessionId={activeSessionId} 
					setActiveSessionId={setActiveSessionId}
					updateActiveSession={updateActiveSession} 
					cleanupSessionOnServer={cleanupSessionOnServer}
					privacyMode={privacyMode} 
					customQdrantUrl={customQdrantUrl}
				/>
			</div>
		</aside>
	);
}

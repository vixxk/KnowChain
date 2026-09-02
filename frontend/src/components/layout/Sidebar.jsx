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
	customQdrantUrl,
	onLoadingStateChange
}) {
	// Hide sidebar completely when viewing Analytics / Evals page
	if (activeTab === 'evals') return null;

	return (
		<aside className={`flex-col w-full sm:w-[280px] md:w-[300px] lg:w-[320px] shrink-0 bg-[#101216] border border-[#1f2229] rounded-xl overflow-hidden z-10 transition-all ${activeTab === 'feed' ? 'flex' : 'hidden sm:flex'}`}>
			<div className="flex items-center gap-3 px-5 h-[60px] shrink-0 border-b border-[#1f2229] bg-[#101216]">
				<div className="w-7 h-7 bg-[#08090b] border border-[#2a2d36] rounded-lg flex items-center justify-center overflow-hidden">
					<img src="/favicon.png" alt="KnowChain" className="w-full h-full object-cover" />
				</div>
				<span className="font-bold text-sm tracking-tight text-[#eef0f3] font-mono">KnowChain</span>
			</div>
			<div className="flex-1 overflow-y-auto pb-20 sm:pb-0">
				<SessionManager
					sessions={sessions} 
					setSessions={setSessions}
					activeSessionId={activeSessionId} 
					setActiveSessionId={setActiveSessionId}
					updateActiveSession={updateActiveSession} 
					cleanupSessionOnServer={cleanupSessionOnServer}
					privacyMode={privacyMode} 
					customQdrantUrl={customQdrantUrl}
					onLoadingStateChange={onLoadingStateChange}
				/>
			</div>
		</aside>
	);
}

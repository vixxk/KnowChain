import { useRef } from 'react';
import SessionManager from '../SessionManager';
import HeroBackground from '../chat/HeroBackground';

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
	const sidebarRef = useRef(null);

	// Hide sidebar completely when viewing Analytics / Evals page
	if (activeTab === 'evals') return null;

	return (
		<aside 
			ref={sidebarRef}
			className={`flex-col w-full sm:w-[280px] md:w-[300px] lg:w-[320px] shrink-0 bg-[#08090b] border border-[#1f2229] rounded-xl overflow-hidden z-10 transition-all relative ${activeTab === 'feed' ? 'flex' : 'hidden sm:flex'}`}
		>
			{/* Special Effects Hero Background */}
			<HeroBackground containerRef={sidebarRef} compact={true} />

			{/* Sidebar Header Bar with Glassmorphic Translucency */}
			<div className="flex items-center gap-3 px-5 h-[60px] shrink-0 border-b border-[#1f2229]/80 bg-[#0c0e12]/75 backdrop-blur-md relative z-10">
				<div className="w-7 h-7 bg-[#08090b] border border-[#2a2d36] rounded-lg flex items-center justify-center overflow-hidden shadow-sm">
					<img src="/favicon.png" alt="KnowChain" className="w-full h-full object-cover" />
				</div>
				<div className="flex flex-col">
					<span className="font-bold text-sm tracking-tight text-[#eef0f3] font-mono leading-none">KnowChain</span>
					<span className="text-[9px] text-[#60a5fa] font-mono tracking-widest uppercase mt-0.5 opacity-80">Workspace</span>
				</div>
			</div>

			{/* Sidebar Content (Sync Unit & Feeds) */}
			<div className="flex-1 overflow-y-auto pb-20 sm:pb-0 relative z-10">
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

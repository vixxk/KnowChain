import { useState, useEffect } from 'react';
import ChatInterface from './components/ChatInterface';
import InfoDashboard from './components/InfoDashboard';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import BottomNav from './components/layout/BottomNav';
import HistoryDrawer from './components/modals/HistoryDrawer';
import PrivacyModal from './components/modals/PrivacyModal';
import './App.css';
import API_BASE_URL from './api/config';

function App() {
	const [sessions, setSessions] = useState(() => {
		const saved = localStorage.getItem('knowchain_sessions') || localStorage.getItem('knowchain_v2_sessions');
		if (saved) {
			try {
				const parsed = JSON.parse(saved);
				if (parsed && typeof parsed === 'object') {
					delete parsed['undefined'];
					delete parsed[null];
					return parsed;
				}
			} catch (e) {
				return {};
			}
		}
		return {};
	});
	const [activeSessionId, setActiveSessionId] = useState(null);
	const [isLoading, setIsLoading] = useState(false);
	const [isChatLoading, setIsChatLoading] = useState(false);
	const [appStatus, setAppStatus] = useState('initializing');
	const [isHistoryOpen, setIsHistoryOpen] = useState(false);
	const [activeTab, setActiveTab] = useState(() => {
		return window.location.pathname === '/evals' ? 'evals' : 'chat';
	});
	const [isNavVisible, setIsNavVisible] = useState(true);
	const [lastScrollY, setLastScrollY] = useState(0);

	// Privacy Mode States
	const [privacyMode, setPrivacyMode] = useState(() => localStorage.getItem('knowchain_privacy_mode') === 'true');
	const [customQdrantUrl, setCustomQdrantUrl] = useState(() => localStorage.getItem('knowchain_qdrant_url') || '');
	const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
	const [showUrl, setShowUrl] = useState(false);

	useEffect(() => {
		const handlePopState = () => {
			if (window.location.pathname === '/evals') {
				setActiveTab('evals');
			} else {
				setActiveTab('chat');
			}
		};
		window.addEventListener('popstate', handlePopState);
		return () => window.removeEventListener('popstate', handlePopState);
	}, []);

	const handleScroll = (e) => {
		if (window.innerWidth >= 1024) return;
		const currentScrollY = e.target.scrollTop;
		if (currentScrollY > lastScrollY && currentScrollY > 100) {
			setIsNavVisible(false);
		} else {
			setIsNavVisible(true);
		}
		setLastScrollY(currentScrollY);
	};

	useEffect(() => {
		const ids = Object.keys(sessions).sort((a, b) => sessions[b].lastActive - sessions[a].lastActive);
		if (ids.length > 0) { setActiveSessionId(ids[0]); setAppStatus('ready'); }
		else { startNewSession(); }
	}, []);

	useEffect(() => { localStorage.setItem('knowchain_sessions', JSON.stringify(sessions)); }, [sessions]);
	
	useEffect(() => {
		localStorage.setItem('knowchain_privacy_mode', privacyMode);
		localStorage.setItem('knowchain_qdrant_url', customQdrantUrl);
	}, [privacyMode, customQdrantUrl]);

	const cleanupSessionOnServer = async (id) => {
		try { 
			await fetch(`${API_BASE_URL}/chat/cleanup/${id}`, { 
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ qdrantUrl: privacyMode ? customQdrantUrl : null })
			}); 
		} catch (e) {}
	};

	const handleDeleteSession = (id) => {
		cleanupSessionOnServer(id);
		setSessions(prev => {
			const u = { ...prev }; delete u[id];
			if (activeSessionId === id) { const k = Object.keys(u); setActiveSessionId(k.length > 0 ? k[0] : null); }
			return u;
		});
	};

	const handleClearAllHistory = () => {
		if (window.confirm("Delete all chat history?")) {
			Object.keys(sessions).forEach(id => cleanupSessionOnServer(id));
			setSessions({}); setActiveSessionId(null); setIsHistoryOpen(false);
		}
	};

	const sessionList = Object.values(sessions).sort((a, b) => b.lastActive - a.lastActive);

	const startNewSession = async () => {
		setIsLoading(true); setAppStatus('loading');
		try {
			const res = await fetch(`${API_BASE_URL}/chat/start-session`, { method: 'POST' });
			if (!res.ok) {
				throw new Error(`Server returned status ${res.status}`);
			}
			const data = await res.json();
			const newId = data.sessionId;
			if (!newId) {
				throw new Error("No sessionId returned by server");
			}
			setSessions(prev => ({
				...prev,
				[newId]: { id: newId, name: `Chat ${Object.keys(prev).length + 1}`, createdAt: Date.now(), lastActive: Date.now(), documents: [], messages: [], selectedCollections: [] }
			}));
			setActiveSessionId(newId); setAppStatus('ready');
		} catch (e) {
			console.error("Failed to start session:", e);
			setAppStatus('error');
		}
		finally { setIsLoading(false); }
	};

	const updateActiveSession = (updateFn) => {
		if (!activeSessionId) return;
		setSessions(prev => {
			const c = prev[activeSessionId]; if (!c) return prev;
			const u = updateFn(c);
			return { ...prev, [activeSessionId]: { ...c, ...u, lastActive: Date.now() } };
		});
	};

	const currentSession = sessions[activeSessionId] || null;

	return (
		<div className="h-screen flex bg-[#0a0b0d] overflow-hidden relative font-sans text-[#eef0f3]">
			{/* Dark technical canvas animated background */}
			<div className="tech-bg-canvas">
				<div className="tech-grid-pattern" />
				<div className="aurora-orb-1" />
				<div className="aurora-orb-2" />
				<div className="tech-scanline" />
			</div>

			<div className="relative z-10 flex w-full h-full p-2 lg:p-3 gap-2 lg:gap-3 overflow-hidden">
				<Sidebar 
					activeTab={activeTab}
					sessions={sessions}
					setSessions={setSessions}
					activeSessionId={activeSessionId}
					setActiveSessionId={setActiveSessionId}
					updateActiveSession={updateActiveSession}
					cleanupSessionOnServer={cleanupSessionOnServer}
					privacyMode={privacyMode}
					customQdrantUrl={customQdrantUrl}
				/>

				<div className="flex-1 flex flex-col min-w-0 h-full">
					{/* Main High-Density Tech Panel: Glowing Blue Border Beam ONLY when loading */}
					<div className={`flex-1 flex flex-col h-full rounded-xl overflow-hidden relative transition-all ${
						(isLoading || isChatLoading) 
							? 'border-beam-card border-beam-card-slow' 
							: 'bg-[#0a0b0d] border border-[#1f2229]'
					}`}>
						<div className={(isLoading || isChatLoading) ? "border-beam-inner bg-[#0a0b0d]" : "flex-1 flex flex-col min-h-0 h-full"}>
							<Header 
								activeTab={activeTab}
								setActiveTab={setActiveTab}
								privacyMode={privacyMode}
								setPrivacyMode={setPrivacyMode}
								customQdrantUrl={customQdrantUrl}
								setCustomQdrantUrl={setCustomQdrantUrl}
								showUrl={showUrl}
								setShowUrl={setShowUrl}
								setIsPrivacyModalOpen={setIsPrivacyModalOpen}
								isHistoryOpen={isHistoryOpen}
								setIsHistoryOpen={setIsHistoryOpen}
								sessionList={sessionList}
								isLoading={isLoading || isChatLoading}
								startNewSession={startNewSession}
							/>

							<main className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
								<div key={activeTab} className="flex-1 flex flex-col min-h-0 h-full animate-view-switch">
									{activeTab === 'evals' ? (
										<InfoDashboard />
									) : (
										<ChatInterface
											key={activeSessionId}
											sessionId={activeSessionId}
											messages={currentSession?.messages || []}
											setMessages={(msgs) => updateActiveSession(curr => ({ messages: typeof msgs === 'function' ? msgs(curr.messages) : msgs }))}
											selectedCollections={currentSession?.selectedCollections || []}
											setSelectedCollections={(cols) => updateActiveSession(curr => ({ selectedCollections: typeof cols === 'function' ? cols(curr.selectedCollections) : cols }))}
											onScroll={handleScroll}
											privacyMode={privacyMode}
											customQdrantUrl={customQdrantUrl}
											onLoadingStateChange={setIsChatLoading}
										/>
									)}
								</div>
							</main>
						</div>
					</div>
				</div>
			</div>

			<BottomNav 
				activeTab={activeTab}
				setActiveTab={setActiveTab}
				isNavVisible={isNavVisible}
			/>

			<HistoryDrawer 
				isHistoryOpen={isHistoryOpen}
				setIsHistoryOpen={setIsHistoryOpen}
				sessionList={sessionList}
				activeSessionId={activeSessionId}
				setActiveSessionId={setActiveSessionId}
				handleClearAllHistory={handleClearAllHistory}
				handleDeleteSession={handleDeleteSession}
			/>

			<PrivacyModal 
				isPrivacyModalOpen={isPrivacyModalOpen}
				setIsPrivacyModalOpen={setIsPrivacyModalOpen}
			/>
		</div>
	);
}

export default App;

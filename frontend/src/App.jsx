import { useState, useEffect } from 'react';
import ChatInterface from './components/ChatInterface';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import BottomNav from './components/layout/BottomNav';
import HistoryDrawer from './components/modals/HistoryDrawer';
import PrivacyModal from './components/modals/PrivacyModal';
import './App.css';
import API_BASE_URL from './api/config';

function App() {
	const [sessions, setSessions] = useState(() => {
		const saved = localStorage.getItem('knowchain_v2_sessions');
		if (saved) { try { return JSON.parse(saved); } catch (e) { return {}; } }
		return {};
	});
	const [activeSessionId, setActiveSessionId] = useState(null);
	const [isLoading, setIsLoading] = useState(false);
	const [appStatus, setAppStatus] = useState('initializing');
	const [isHistoryOpen, setIsHistoryOpen] = useState(false);
	const [activeTab, setActiveTab] = useState('chat');
	const [isNavVisible, setIsNavVisible] = useState(true);
	const [lastScrollY, setLastScrollY] = useState(0);

	// Privacy Mode States
	const [privacyMode, setPrivacyMode] = useState(() => localStorage.getItem('knowchain_privacy_mode') === 'true');
	const [customQdrantUrl, setCustomQdrantUrl] = useState(() => localStorage.getItem('knowchain_qdrant_url') || '');
	const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
	const [showUrl, setShowUrl] = useState(false);

	const handleScroll = (e) => {
		if (window.innerWidth >= 1024) return; // Ignore on desktop
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

	useEffect(() => { localStorage.setItem('knowchain_v2_sessions', JSON.stringify(sessions)); }, [sessions]);
	
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
			const data = await res.json();
			const newId = data.sessionId;
			setSessions(prev => ({
				...prev,
				[newId]: { id: newId, name: `Chat ${Object.keys(prev).length + 1}`, createdAt: Date.now(), lastActive: Date.now(), documents: [], messages: [], selectedCollections: [] }
			}));
			setActiveSessionId(newId); setAppStatus('ready');
		} catch (e) { setAppStatus('error'); }
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
		<div className="h-screen flex bg-[#0B0E14] overflow-hidden">
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

			<div className={`flex-1 flex flex-col min-w-0 p-3 lg:p-5 ${activeTab === 'chat' ? 'flex' : 'hidden lg:flex'}`}>
				<div className="flex-1 flex flex-col bg-[#111720] border border-white/5 rounded-2xl lg:rounded-[1.25rem] overflow-hidden">
					<Header 
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
						isLoading={isLoading}
						startNewSession={startNewSession}
					/>

					<main className="flex-1 min-h-0">
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
						/>
					</main>
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

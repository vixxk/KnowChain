import { useState, useEffect } from 'react';
import SessionManager from './components/SessionManager';
import ChatInterface from './components/ChatInterface';
import { HiPlus, HiOutlineCollection, HiX, HiChatAlt2 } from 'react-icons/hi';
import { FiClock } from 'react-icons/fi';
import './App.css';

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

	useEffect(() => {
		const ids = Object.keys(sessions).sort((a, b) => sessions[b].lastActive - sessions[a].lastActive);
		if (ids.length > 0) { setActiveSessionId(ids[0]); setAppStatus('ready'); }
		else { startNewSession(); }
	}, []);

	useEffect(() => { localStorage.setItem('knowchain_v2_sessions', JSON.stringify(sessions)); }, [sessions]);

	const cleanupSessionOnServer = async (id) => {
		try { await fetch(`http://localhost:5000/chat/cleanup/${id}`, { method: 'POST' }); } catch (e) {}
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
			const res = await fetch('http://localhost:5000/chat/start-session', { method: 'POST' });
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
			<aside className={`lg:flex flex-col w-full lg:w-[300px] shrink-0 bg-[#0F1319] lg:border-r border-white/5 overflow-hidden ${activeTab === 'feed' ? 'flex' : 'hidden'}`}>
				<div className="flex items-center gap-3 px-6 h-[72px] shrink-0 border-b border-white/5">
					<div className="w-9 h-9 bg-[#D4AF37]/10 rounded-xl flex items-center justify-center shadow-lg shadow-[#D4AF37]/5 border border-[#D4AF37]/20 overflow-hidden">
						<img src="/favicon.png" alt="KnowChain" className="w-6 h-6 object-contain" />
					</div>
					<span className="font-bold text-lg text-white">KnowChain</span>
				</div>
				<div className="flex-1 overflow-y-auto scrollbar-hide pb-20 lg:pb-0">
					<SessionManager
						sessions={sessions} setSessions={setSessions}
						activeSessionId={activeSessionId} setActiveSessionId={setActiveSessionId}
						updateActiveSession={updateActiveSession} cleanupSessionOnServer={cleanupSessionOnServer}
					/>
				</div>
			</aside>

			<div className={`flex-1 flex flex-col min-w-0 p-3 lg:p-5 ${activeTab === 'chat' ? 'flex' : 'hidden lg:flex'}`}>
				<div className="flex-1 flex flex-col bg-[#111720] border border-white/5 rounded-2xl lg:rounded-[1.25rem] overflow-hidden">
					<header className="h-[72px] flex items-center justify-between px-6 lg:px-8 border-b border-white/5 shrink-0 relative">
						<div className="flex items-center gap-3">
							<div className="hidden lg:block">
								<span className="font-bold text-xl tracking-tight text-white">KnowChain</span>
							</div>
						</div>
						<div className="flex items-center gap-3">
							<div className="relative">
								<button
									onClick={() => setIsHistoryOpen(!isHistoryOpen)}
									className={`flex items-center justify-center lg:justify-start gap-2 h-11 px-3 lg:px-5 rounded-full text-sm font-semibold border transition-all ${
										isHistoryOpen
											? 'bg-[#D4AF37]/10 border-[#D4AF37]/30 text-[#D4AF37]'
											: 'bg-white/[0.03] border-white/[0.06] text-[#8A94A6] hover:text-white hover:border-white/10'
									}`}
								>
									<FiClock className="text-base" />
									<span className="hidden lg:inline">History</span>
									{sessionList.length > 0 && (
										<span className="lg:ml-1 w-6 h-6 flex items-center justify-center bg-[#D4AF37]/15 text-[#D4AF37] text-xs rounded-full font-bold">{sessionList.length}</span>
									)}
								</button>
								{isHistoryOpen && (
									<>
										<div className="fixed inset-0 z-40" onClick={() => setIsHistoryOpen(false)} />
										<div className="absolute right-0 mt-3 w-[85vw] sm:w-80 glass border border-white/[0.08] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-2 z-50 animate-fade-in origin-top-right">
											<div className="flex items-center justify-between px-4 py-3.5 border-b border-white/[0.04] mb-1">
												<span className="text-[9px] font-bold text-[#8A94A6] uppercase tracking-[0.2em]">History</span>
												{sessionList.length > 0 && (
													<button onClick={handleClearAllHistory} className="text-[10px] text-red-400/60 hover:text-red-400 font-bold uppercase tracking-wider transition-colors">Clear</button>
												)}
											</div>
											<div className="max-h-80 overflow-y-auto scrollbar-hide py-1 space-y-1">
												{sessionList.length === 0 ? (
													<div className="py-12 flex flex-col items-center justify-center opacity-40">
														<HiOutlineCollection className="text-3xl mb-3" />
														<p className="text-center text-xs font-medium tracking-wide">Empty</p>
													</div>
												) : sessionList.slice(0, 10).map(s => (
													<div key={s.id} className="group relative px-1">
														<button
															onClick={() => { setActiveSessionId(s.id); setIsHistoryOpen(false); }}
															className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-left transition-all duration-300 border ${
																activeSessionId === s.id ? 'bg-[#D4AF37]/10 border-[#D4AF37]/20 text-[#D4AF37] shadow-lg shadow-[#D4AF37]/5' : 'text-[#8A94A6] border-transparent hover:bg-white/[0.04] hover:text-white hover:border-white/[0.04]'
															}`}
														>
															<div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors ${activeSessionId === s.id ? 'bg-[#D4AF37]/20 text-[#D4AF37]' : 'bg-white/5 text-[#4A5568] group-hover:text-[#D4AF37]/60'}`}>
																<HiChatAlt2 size={20} />
															</div>
															<div className="flex-1 min-w-0">
																<p className={`text-[13px] font-bold truncate ${activeSessionId === s.id ? 'text-[#D4AF37]' : 'text-slate-200'}`}>{s.name}</p>
																<div className="flex items-center gap-2 mt-1">
																	<span className="w-1 h-1 bg-white/10 rounded-full"></span>
																	<p className="text-[9px] font-medium text-[#4A5568] uppercase tracking-wider">{new Date(s.lastActive).toLocaleDateString()}</p>
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
								)}
							</div>
							<button
								onClick={startNewSession} disabled={isLoading}
								className="flex items-center justify-center lg:justify-start gap-2 h-11 px-4 lg:px-6 bg-[#D4AF37] hover:bg-[#C4A030] text-black rounded-full text-sm font-bold transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-[#D4AF37]/10"
							>
								<HiPlus className="text-base" />
								<span className="hidden lg:inline">New Chat</span>
							</button>
						</div>
					</header>

					<main className="flex-1 min-h-0">
						<ChatInterface
							key={activeSessionId}
							sessionId={activeSessionId}
							messages={currentSession?.messages || []}
							setMessages={(msgs) => updateActiveSession(curr => ({ messages: typeof msgs === 'function' ? msgs(curr.messages) : msgs }))}
							selectedCollections={currentSession?.selectedCollections || []}
							setSelectedCollections={(cols) => updateActiveSession(curr => ({ selectedCollections: typeof cols === 'function' ? cols(curr.selectedCollections) : cols }))}
						/>
					</main>
				</div>
			</div>

			<nav className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-[340px] bg-[#0F1319]/80 backdrop-blur-xl border border-white/5 rounded-2xl h-[68px] flex items-center justify-around px-4 z-[50] shadow-2xl">
				<button onClick={() => setActiveTab('feed')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'feed' ? 'text-[#D4AF37]' : 'text-[#8A94A6] hover:text-white'}`}>
					<div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${activeTab === 'feed' ? 'bg-[#D4AF37]/10' : 'bg-transparent'}`}>
						<HiOutlineCollection className="text-xl" />
					</div>
					<span className="text-[10px] font-bold uppercase tracking-[0.1em]">Feed</span>
				</button>
				<div className="w-[1px] h-8 bg-white/5"></div>
				<button onClick={() => setActiveTab('chat')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'chat' ? 'text-[#38B28E]' : 'text-[#8A94A6] hover:text-white'}`}>
					<div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${activeTab === 'chat' ? 'bg-[#38B28E]/10' : 'bg-transparent'}`}>
						<HiChatAlt2 className="text-xl" />
					</div>
					<span className="text-[10px] font-bold uppercase tracking-[0.1em]">Workspace</span>
				</button>
			</nav>
		</div>
	);
}

export default App;

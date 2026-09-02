import { HiShieldCheck, HiEye, HiEyeOff, HiInformationCircle, HiPlus, HiChartBar } from 'react-icons/hi';
import { FiClock } from 'react-icons/fi';

export default function Header({ 
	activeTab,
	setActiveTab,
	privacyMode, 
	setPrivacyMode, 
	customQdrantUrl, 
	setCustomQdrantUrl, 
	showUrl, 
	setShowUrl, 
	setIsPrivacyModalOpen, 
	isHistoryOpen, 
	setIsHistoryOpen, 
	sessionList, 
	isLoading, 
	startNewSession 
}) {
	// Hide header element on eval page per design specification
	if (activeTab === 'evals') return null;

	return (
		<header className="h-[60px] flex items-center justify-between px-4 sm:px-6 border-b border-[#1f2229] shrink-0 bg-[#101216] z-20">
			<div className="flex items-center gap-3">
				{/* Privacy Mode Toggle */}
				<div className="flex items-center gap-2">
					<button 
						onClick={() => setPrivacyMode(!privacyMode)}
						className={`group flex items-center gap-2 px-2.5 py-1 rounded-md transition-all border text-xs font-mono ${
							privacyMode 
								? 'bg-[#3b82f6]/10 border-[#3b82f6]/50 text-[#60a5fa] opacity-100 shadow-[0_0_12px_rgba(59,130,246,0.15)]' 
								: 'bg-[#08090b]/40 border-[#1f2229]/60 text-[#6b7280] opacity-50 hover:opacity-90 hover:text-[#9ca3af] hover:border-[#2a2d36]'
						}`}
					>
						<HiShieldCheck className={privacyMode ? 'text-[#3b82f6]' : 'text-[#454952]'} size={15} />
						<span className="text-[11px] uppercase tracking-wider font-semibold">
							{privacyMode ? 'Privacy Mode On' : 'Privacy Mode Off'}
						</span>
					</button>

					{privacyMode && (
						<div className="flex items-center bg-[#08090b] border border-[#2a2d36] rounded-md px-1.5 py-0.5 ml-1 font-mono">
							<div className="relative flex items-center">
								<input 
									type={showUrl ? "text" : "password"}
									value={customQdrantUrl}
									onChange={(e) => setCustomQdrantUrl(e.target.value)}
									placeholder="Qdrant URL..."
									className="bg-transparent pl-2 pr-16 py-1 text-xs text-[#eef0f3] placeholder-[#454952] outline-none w-36 focus:w-52 transition-all font-mono"
								/>
								<div className="absolute right-1 flex items-center gap-1">
									<button 
										onMouseDown={(e) => { e.preventDefault(); setShowUrl(!showUrl); }}
										className="p-1 text-[#6b7280] hover:text-[#9ca3af] transition-colors"
										title={showUrl ? "Hide URL" : "Show URL"}
									>
										{showUrl ? <HiEyeOff size={13} /> : <HiEye size={13} />}
									</button>
									<div className="w-[1px] h-3 bg-[#1f2229]"></div>
									<button 
										onMouseDown={(e) => { e.preventDefault(); setIsPrivacyModalOpen(true); }}
										className="p-1 text-[#6b7280] hover:text-[#3b82f6] transition-colors"
										title="Setup Instructions"
									>
										<HiInformationCircle size={14} />
									</button>
								</div>
							</div>
							<button 
								onMouseDown={(e) => {
									e.preventDefault();
									localStorage.setItem('knowchain_qdrant_url', customQdrantUrl);
								}}
								className="ml-1 px-2 py-0.5 bg-[#16181d] hover:bg-[#1c1f26] border border-[#2a2d36] text-[10px] font-bold text-[#9ca3af] hover:text-[#3b82f6] rounded transition-all uppercase tracking-wider"
							>
								Save
							</button>
						</div>
					)}
				</div>
			</div>

			{/* Header Right Actions */}
			<div className="flex items-center gap-2">
				<button
					onClick={() => {
						setActiveTab('evals');
						if (window.location.pathname !== '/evals') window.history.pushState({}, '', '/evals');
					}}
					className="btn-ghost-outlined flex items-center justify-center gap-1.5 h-8 px-3 text-xs font-mono font-medium"
				>
					<HiChartBar className="text-[#3b82f6]" size={14} />
					<span className="hidden sm:inline">Evals</span>
				</button>
				<button
					onClick={() => setIsHistoryOpen(!isHistoryOpen)}
					className={`flex items-center justify-center gap-1.5 h-8 px-3 rounded-md text-xs font-mono font-medium border transition-all ${
						isHistoryOpen
							? 'bg-[#3b82f6]/10 border-[#3b82f6]/40 text-[#60a5fa]'
							: 'bg-transparent border-[#2a2d36] text-[#9ca3af] hover:text-[#eef0f3] hover:border-[#3a3e4a]'
					}`}
				>
					<FiClock size={13} />
					<span className="hidden sm:inline font-sans">History</span>
					{sessionList.length > 0 && (
						<span className="px-1.5 py-0.2 bg-[#08090b] text-[#9ca3af] text-[11px] rounded border border-[#1f2229] font-mono">{sessionList.length}</span>
					)}
				</button>
				<button
					onClick={startNewSession} disabled={isLoading}
					className="btn-blue-primary flex items-center justify-center gap-1.5 h-8 px-3.5 text-xs font-medium disabled:opacity-50"
				>
					<HiPlus size={14} />
					<span>New Chat</span>
				</button>
			</div>
		</header>
	);
}

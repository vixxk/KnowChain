import { HiShieldCheck, HiEye, HiEyeOff, HiInformationCircle, HiPlus } from 'react-icons/hi';
import { FiClock } from 'react-icons/fi';

export default function Header({ 
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
	return (
		<header className="h-[72px] flex items-center justify-between px-6 lg:px-8 border-b border-white/5 shrink-0 relative">
			<div className="flex items-center gap-3">
				<div className="hidden lg:block">
					<span className="font-bold text-xl tracking-tight text-white">KnowChain v2</span>
				</div>
				<div className="h-6 w-[1px] bg-white/10 hidden lg:block mx-2"></div>
				
				{/* Privacy Mode Toggle */}
				<div className="flex items-center gap-2">
					<button 
						onClick={() => setPrivacyMode(!privacyMode)}
						className={`group flex items-center gap-2.5 px-4 py-2 rounded-full transition-all duration-500 border shadow-lg ${
							privacyMode 
								? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-emerald-500/10' 
								: 'bg-white/[0.03] border-white/10 text-[#8A94A6] hover:bg-white/[0.06] hover:border-[#D4AF37]/30 hover:text-white hover:shadow-[#D4AF37]/5'
						}`}
					>
						<div className={`transition-all duration-500 ${privacyMode ? 'scale-110' : 'group-hover:scale-110 group-hover:rotate-[15deg]'}`}>
							<HiShieldCheck className={privacyMode ? 'text-emerald-400' : 'text-[#4A5568] group-hover:text-[#D4AF37]'} size={18} />
						</div>
						<span className={`text-[10px] font-extrabold uppercase tracking-[0.15em] hidden sm:inline transition-colors duration-500 ${privacyMode ? 'text-emerald-400' : 'text-[#8A94A6] group-hover:text-white'}`}>
							{privacyMode ? 'Privacy Active' : 'Privacy Mode'}
						</span>
					</button>
					{privacyMode && (
						<div className="flex items-center animate-fade-in bg-white/[0.02] border border-white/5 rounded-xl px-1.5 py-1 ml-1 group/container">
							<div className="relative flex items-center">
								<input 
									type={showUrl ? "text" : "password"}
									value={customQdrantUrl}
									onChange={(e) => setCustomQdrantUrl(e.target.value)}
									placeholder="Qdrant DB URL..."
									className="bg-transparent rounded-lg pl-3 pr-20 py-1.5 text-xs text-white placeholder-[#4A5568] outline-none w-40 focus:w-64 transition-all duration-500 font-mono"
								/>
								<div className="absolute right-1 flex items-center gap-1">
									<button 
										onMouseDown={(e) => { e.preventDefault(); setShowUrl(!showUrl); }}
										className="p-1 text-[#4A5568] hover:text-white transition-colors"
										title={showUrl ? "Hide URL" : "Show URL"}
									>
										{showUrl ? <HiEyeOff size={14} /> : <HiEye size={14} />}
									</button>
									<div className="w-[1px] h-3 bg-white/10 mx-0.5"></div>
									<button 
										onMouseDown={(e) => { e.preventDefault(); setIsPrivacyModalOpen(true); }}
										className="p-1 text-[#4A5568] hover:text-[#D4AF37] transition-all hover:scale-110"
										title="Setup Instructions"
									>
										<HiInformationCircle size={16} />
									</button>
								</div>
							</div>
							<button 
								onMouseDown={(e) => {
									e.preventDefault();
									localStorage.setItem('knowchain_qdrant_url', customQdrantUrl);
									const btn = document.getElementById('save-db-url');
									if (btn) {
										btn.classList.add('bg-emerald-500/20', 'text-emerald-400');
										setTimeout(() => btn.classList.remove('bg-emerald-500/20', 'text-emerald-400'), 2000);
									}
								}}
								id="save-db-url"
								className="ml-1 px-3 py-1.5 bg-white/5 hover:bg-[#D4AF37]/10 border border-white/10 hover:border-[#D4AF37]/30 text-[10px] font-bold text-[#8A94A6] hover:text-[#D4AF37] rounded-lg transition-all uppercase tracking-wider flex items-center gap-1.5"
							>
								<HiShieldCheck size={14} />
								<span>Save</span>
							</button>
						</div>
					)}
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
	);
}

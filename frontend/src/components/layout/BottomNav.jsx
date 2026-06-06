import { HiOutlineCollection, HiChatAlt2 } from 'react-icons/hi';

export default function BottomNav({ activeTab, setActiveTab, isNavVisible }) {
	return (
		<nav className={`lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-[340px] bg-[#0F1319]/80 backdrop-blur-xl border border-white/5 rounded-3xl h-[72px] flex items-center justify-around px-4 z-[50] shadow-2xl transition-all duration-500 ${isNavVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-24 opacity-0 scale-90 pointer-events-none'}`}>
			<button onClick={() => setActiveTab('feed')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'feed' ? 'text-[#D4AF37]' : 'text-[#8A94A6] hover:text-white'}`}>
				<div className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${activeTab === 'feed' ? 'bg-[#D4AF37]/10' : 'bg-transparent'}`}>
					<HiOutlineCollection className="text-2xl" />
				</div>
				<span className="text-[10px] font-bold uppercase tracking-[0.15em]">Neural Feed</span>
			</button>
			<div className="w-[1px] h-10 bg-white/5"></div>
			<button onClick={() => setActiveTab('chat')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'chat' ? 'text-[#38B28E]' : 'text-[#8A94A6] hover:text-white'}`}>
				<div className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${activeTab === 'chat' ? 'bg-[#38B28E]/10' : 'bg-transparent'}`}>
					<HiChatAlt2 className="text-2xl" />
				</div>
				<span className="text-[10px] font-bold uppercase tracking-[0.15em]">Workspace</span>
			</button>
		</nav>
	);
}

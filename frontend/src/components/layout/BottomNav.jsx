import { HiOutlineCollection, HiChatAlt2, HiChartBar } from 'react-icons/hi';

export default function BottomNav({ activeTab, setActiveTab, isNavVisible }) {
	return (
		<nav className={`sm:hidden fixed bottom-4 left-1/2 -translate-x-1/2 w-[92%] max-w-[340px] bg-[#101216] border border-[#1f2229] rounded-full h-[52px] flex items-center justify-around px-3 z-[80] shadow-lg transition-all ${isNavVisible ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0 pointer-events-none'}`}>
			<button onClick={() => setActiveTab('feed')} className={`flex flex-col items-center gap-0.5 transition-all ${activeTab === 'feed' ? 'text-[#3b82f6]' : 'text-[#6b7280] hover:text-[#eef0f3]'}`}>
				<div className={`w-7 h-7 rounded-full flex items-center justify-center ${activeTab === 'feed' ? 'bg-[#3b82f6]/10' : ''}`}>
					<HiOutlineCollection className="text-sm" />
				</div>
				<span className="text-[9px] font-mono font-semibold uppercase tracking-wider">Feed</span>
			</button>
			<div className="w-[1px] h-4 bg-[#1f2229]"></div>
			<button onClick={() => setActiveTab('chat')} className={`flex flex-col items-center gap-0.5 transition-all ${activeTab === 'chat' ? 'text-[#3b82f6]' : 'text-[#6b7280] hover:text-[#eef0f3]'}`}>
				<div className={`w-7 h-7 rounded-full flex items-center justify-center ${activeTab === 'chat' ? 'bg-[#3b82f6]/10' : ''}`}>
					<HiChatAlt2 className="text-sm" />
				</div>
				<span className="text-[9px] font-mono font-semibold uppercase tracking-wider">Chat</span>
			</button>
			<div className="w-[1px] h-4 bg-[#1f2229]"></div>
			<button onClick={() => setActiveTab('evals')} className={`flex flex-col items-center gap-0.5 transition-all ${activeTab === 'evals' ? 'text-[#3b82f6]' : 'text-[#6b7280] hover:text-[#eef0f3]'}`}>
				<div className={`w-7 h-7 rounded-full flex items-center justify-center ${activeTab === 'evals' ? 'bg-[#3b82f6]/10' : ''}`}>
					<HiChartBar className="text-sm" />
				</div>
				<span className="text-[9px] font-mono font-semibold uppercase tracking-wider">Evals</span>
			</button>
		</nav>
	);
}

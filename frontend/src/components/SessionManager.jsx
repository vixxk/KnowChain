import DocumentUpload from './DocumentUpload';
import { HiOutlineDatabase, HiOutlineGlobeAlt, HiOutlineCube, HiX, HiOutlineDocumentText } from 'react-icons/hi';

export default function SessionManager({ sessions, setSessions, activeSessionId, setActiveSessionId, updateActiveSession, cleanupSessionOnServer }) {
    const currentSession = sessions[activeSessionId] || { documents: [], selectedCollections: [] };
    const { documents, selectedCollections } = currentSession;
    const sessionId = activeSessionId;

    const addDocument = (doc) => {
        updateActiveSession(curr => ({
            documents: [...curr.documents, { ...doc, id: Date.now() }],
            selectedCollections: [doc.collection]
        }));
    };

    const removeDocument = (id) => {
        updateActiveSession(curr => {
            const doc = curr.documents.find(d => d.id === id);
            return {
                documents: curr.documents.filter(d => d.id !== id),
                selectedCollections: curr.selectedCollections.filter(c => c !== doc?.collection)
            };
        });
    };

    const toggleCollection = (col) => {
        updateActiveSession(curr => ({
            selectedCollections: curr.selectedCollections.includes(col)
                ? curr.selectedCollections.filter(c => c !== col)
                : [...curr.selectedCollections, col]
        }));
    };

    const getIcon = (t) => {
        if (t === 'pdf') return <HiOutlineDatabase />;
        if (t === 'web') return <HiOutlineGlobeAlt />;
        if (t === 'text') return <HiOutlineDocumentText />;
        return <HiOutlineCube />;
    };

    return (
        <div className="flex flex-col gap-0 p-5 animate-fade-in">
            <div className="mb-6">
                <h3 className="text-xs font-bold text-[#8A94A6] uppercase tracking-[0.15em] mb-4 flex items-center gap-2">
                    <HiOutlineDatabase className="text-[#D4AF37] text-sm" />
                    Sources
                </h3>
                <div className="bg-[#111720] border border-white/[0.06] rounded-2xl p-5">
                    <DocumentUpload sessionId={sessionId} onDocumentAdded={addDocument} />
                </div>
            </div>
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold text-[#8A94A6] uppercase tracking-[0.15em] flex items-center gap-2">
                        Neural Feed
                    </h3>
                    <span className="px-2.5 py-1 bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-md text-[10px] text-[#D4AF37] font-bold tracking-wider">
                        {selectedCollections.length}/{documents.length} ACTIVE
                    </span>
                </div>
                <div className="bg-[#111720] border border-white/[0.06] rounded-2xl p-5">
                    {documents.length > 0 && (
                        <div className="flex gap-2 mb-4">
                            <button
                                onClick={() => updateActiveSession(c => ({ selectedCollections: c.documents.map(d => d.collection) }))}
                                className="flex-1 py-2.5 text-xs font-bold text-black bg-[#D4AF37] rounded-xl uppercase tracking-wider hover:brightness-110 transition-all"
                            >Select All</button>
                            <button
                                onClick={() => updateActiveSession(() => ({ selectedCollections: [] }))}
                                className="flex-1 py-2.5 text-xs font-bold text-[#8A94A6] bg-white/[0.03] border border-white/[0.06] rounded-xl uppercase tracking-wider hover:bg-white/[0.06] transition-all"
                            >Clear All</button>
                        </div>
                    )}
                    <div className="space-y-2.5 max-h-[40vh] overflow-y-auto scrollbar-hide">
                        {documents.length === 0 ? (
                            <div className="py-10 text-center">
                                <HiOutlineCube className="text-3xl text-[#4A5568] mx-auto mb-3" />
                                <p className="text-sm text-[#4A5568]">Your feed is empty.</p>
                            </div>
                        ) : documents.map(doc => {
                            const sel = selectedCollections.includes(doc.collection);
                            return (
                                <div key={doc.id} className={`flex items-center gap-4 p-4 rounded-xl border transition-all group cursor-pointer ${sel ? 'bg-[#D4AF37]/5 border-[#D4AF37]/20' : 'bg-white/[0.01] border-white/[0.04] hover:border-white/10'}`}>
                                    <button
                                        onClick={() => toggleCollection(doc.collection)}
                                        className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${sel ? 'bg-[#D4AF37] border-[#D4AF37]' : 'border-white/15 group-hover:border-[#D4AF37]/40'}`}
                                    >
                                        {sel && <svg className="w-3 h-3 text-black" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                                    </button>
                                    <div className="flex items-center gap-3 flex-1 min-w-0" onClick={() => updateActiveSession(() => ({ selectedCollections: [doc.collection] }))}>
                                        <span className={`text-lg ${sel ? 'text-[#D4AF37]' : 'text-[#4A5568]'}`}>{getIcon(doc.type)}</span>
                                        <div className="truncate">
                                            <p className="text-sm font-semibold text-white truncate">{doc.name}</p>
                                            <p className="text-xs text-[#4A5568] mt-0.5">{doc.type} • {doc.size || 'Auto'}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => removeDocument(doc.id)} className="p-1.5 text-[#4A5568] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                                        <HiX size={14} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

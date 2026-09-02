import DocumentUpload from './DocumentUpload';
import { HiOutlineDatabase, HiOutlineGlobeAlt, HiOutlineCube, HiX, HiOutlineDocumentText } from 'react-icons/hi';

export default function SessionManager({ sessions, setSessions, activeSessionId, setActiveSessionId, updateActiveSession, cleanupSessionOnServer, privacyMode, customQdrantUrl, onLoadingStateChange }) {
    const currentSession = sessions[activeSessionId] || { documents: [], selectedCollections: [] };
    const { documents, selectedCollections } = currentSession;
    const sessionId = activeSessionId;

    const addDocument = (doc) => {
        updateActiveSession(curr => ({
            documents: [...curr.documents, { ...doc, id: Date.now() }],
            selectedCollections: [...curr.selectedCollections, doc.collection]
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

    const isAllSelected = documents.length > 0 && selectedCollections.length === documents.length;

    const deleteAllDocuments = () => {
        updateActiveSession(() => ({
            documents: [],
            selectedCollections: []
        }));
    };

    return (
        <div className="flex flex-col gap-5 p-4 animate-fade-in">
            <div>
                <h3 className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-2.5 flex items-center gap-1.5 font-mono">
                    <HiOutlineDatabase className="text-[#3b82f6]" size={13} />
                    <span>Sync Unit</span>
                </h3>
                <div className="tech-card p-3">
                    <DocumentUpload 
                        sessionId={sessionId} 
                        onDocumentAdded={addDocument} 
                        privacyMode={privacyMode} 
                        customQdrantUrl={customQdrantUrl} 
                        onLoadingStateChange={onLoadingStateChange}
                    />
                </div>
            </div>

            <div>
                <div className="flex items-center justify-between mb-2.5">
                    <h3 className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider font-mono">
                        Neural Feed
                    </h3>
                    <span className="px-2 py-0.5 bg-[#08090b] border border-[#1f2229] rounded text-[10px] text-[#9ca3af] font-mono">
                        {selectedCollections.length}/{documents.length} ACTIVE
                    </span>
                </div>

                <div className="bg-[#16181d] border border-[#1f2229] rounded-lg p-2.5 space-y-2">
                    {documents.length > 0 && (
                        <div className="flex items-center justify-between px-1 pb-2 border-b border-[#1f2229]">
                            <button
                                onClick={() => {
                                    if (isAllSelected) {
                                        updateActiveSession(() => ({ selectedCollections: [] }));
                                    } else {
                                        updateActiveSession(c => ({ selectedCollections: c.documents.map(d => d.collection) }));
                                    }
                                }}
                                className="text-[11px] uppercase tracking-wider text-[#6b7280] hover:text-[#3b82f6] transition-colors font-mono font-medium"
                            >
                                {isAllSelected ? 'DESELECT ALL' : 'SELECT ALL'}
                            </button>
                            <span className="text-[#2a2d36] text-[10px]">|</span>
                            <button
                                onClick={deleteAllDocuments}
                                className="text-[11px] uppercase tracking-wider text-[#6b7280] hover:text-[#f87171] transition-colors font-mono font-medium"
                            >
                                DELETE ALL
                            </button>
                        </div>
                    )}

                    <div className="space-y-1 max-h-[42vh] overflow-y-auto">
                        {documents.length === 0 ? (
                            <div className="py-6 text-center">
                                <HiOutlineCube className="text-2xl text-[#454952] mx-auto mb-1.5" />
                                <p className="text-xs text-[#6b7280] font-mono">Neural feed empty</p>
                            </div>
                        ) : documents.map(doc => {
                            const sel = selectedCollections.includes(doc.collection);
                            return (
                                <div 
                                    key={doc.id} 
                                    className={`flex items-center gap-2.5 p-2 rounded-md transition-all group cursor-pointer ${
                                        sel 
                                            ? 'bg-[#3b82f6]/10 border-l-2 border-l-[#3b82f6] border-t border-r border-b border-t-[#2a2d36] border-r-[#2a2d36] border-b-[#2a2d36]' 
                                            : 'bg-[#101216] border border-[#1f2229] hover:bg-[#1c1f26] hover:border-[#2a2d36]'
                                    }`}
                                >
                                    <button
                                        onClick={() => toggleCollection(doc.collection)}
                                        className={`w-3.5 h-3.5 rounded-[3px] border flex items-center justify-center shrink-0 transition-all ${
                                            sel ? 'bg-[#3b82f6] border-[#3b82f6]' : 'border-[#2a2d36] group-hover:border-[#3a3e4a]'
                                        }`}
                                    >
                                        {sel && <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                                    </button>

                                    <div className="flex items-center gap-2 flex-1 min-w-0" onClick={() => updateActiveSession(() => ({ selectedCollections: [doc.collection] }))}>
                                        <span className={`text-sm ${sel ? 'text-[#60a5fa]' : 'text-[#6b7280]'}`}>{getIcon(doc.type)}</span>
                                        <div className="truncate">
                                            <p className="text-xs font-medium text-[#eef0f3] truncate leading-tight">{doc.name}</p>
                                            <p className="text-[10px] text-[#6b7280] font-mono mt-0.5">{doc.type} • {doc.size || 'Auto'}</p>
                                        </div>
                                    </div>

                                    <button onClick={() => removeDocument(doc.id)} className="p-1 text-[#6b7280] hover:text-[#f87171] opacity-0 group-hover:opacity-100 transition-all">
                                        <HiX size={13} />
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

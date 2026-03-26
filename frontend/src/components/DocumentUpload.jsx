import { useState, useRef } from 'react';
import { HiCloudUpload, HiLink, HiCheckCircle, HiXCircle } from 'react-icons/hi';
import axios from 'axios';
import API_BASE_URL from '../api/config';

export default function DocumentUpload({ sessionId, onDocumentAdded }) {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState(null);
    const [urlInput, setUrlInput] = useState('');
    const [textInput, setTextInput] = useState('');
    const [isDragActive, setIsDragActive] = useState(false);
    const fileInputRef = useRef(null);

    const handleFileUpload = async (file) => {
        if (!file || file.type !== 'application/pdf') { setUploadStatus({ type: 'error', message: 'PDF only.' }); return; }
        setIsUploading(true); setUploadStatus(null);
        const formData = new FormData(); formData.append('file', file); formData.append('sessionId', sessionId);
        try {
            const res = await axios.post(`${API_BASE_URL}/chat/index/pdf`, formData);
            onDocumentAdded({ name: file.name, type: 'pdf', size: (file.size / 1024 / 1024).toFixed(2) + ' MB', collection: res.data.collectionName });
            setUploadStatus({ type: 'success', message: 'Synced.' }); setTimeout(() => setUploadStatus(null), 3000);
        } catch (e) { setUploadStatus({ type: 'error', message: e.response?.data?.error || 'Failed.' }); }
        finally { setIsUploading(false); }
    };

    const handleUrlSubmit = async (e) => {
        e.preventDefault(); if (!urlInput.trim() || isUploading) return;
        setIsUploading(true); setUploadStatus(null);
        try {
            const res = await axios.post(`${API_BASE_URL}/chat/index/web`, { url: urlInput, sessionId });
            onDocumentAdded({ name: new URL(urlInput).hostname, type: 'web', collection: res.data.collectionName });
            setUrlInput(''); setUploadStatus({ type: 'success', message: 'Linked.' }); setTimeout(() => setUploadStatus(null), 3000);
        } catch (e) { setUploadStatus({ type: 'error', message: e.response?.data?.error || 'Failed.' }); }
        finally { setIsUploading(false); }
    };

    const handleTextSubmit = async (e) => {
        e.preventDefault(); if (!textInput.trim() || isUploading) return;
        setIsUploading(true); setUploadStatus(null);
        try {
            const res = await axios.post(`${API_BASE_URL}/chat/index/text`, { text: textInput, sessionId });
            onDocumentAdded({ name: 'Snippet ' + new Date().toLocaleTimeString(), type: 'text', collection: res.data.collectionName });
            setTextInput(''); setUploadStatus({ type: 'success', message: 'Ingested.' }); setTimeout(() => setUploadStatus(null), 3000);
        } catch (e) { setUploadStatus({ type: 'error', message: e.response?.data?.error || 'Failed.' }); }
        finally { setIsUploading(false); }
    };

    return (
        <div className="space-y-4">
            <div
                onDragOver={(e) => { e.preventDefault(); setIsDragActive(true); }}
                onDragLeave={() => setIsDragActive(false)}
                onDrop={(e) => { e.preventDefault(); setIsDragActive(false); if (e.dataTransfer.files[0]) handleFileUpload(e.dataTransfer.files[0]); }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${isDragActive ? 'border-[#D4AF37] bg-[#D4AF37]/5' : 'border-white/[0.08] hover:border-[#D4AF37]/30'}`}
            >
                {isUploading ? (
                    <div className="flex flex-col items-center py-2">
                        <div className="w-10 h-10 border-2 border-[#D4AF37]/20 border-t-[#D4AF37] rounded-full animate-spin mb-3"></div>
                        <p className="text-xs font-semibold text-[#D4AF37] uppercase tracking-widest">Processing...</p>
                    </div>
                ) : (
                    <div>
                        <HiCloudUpload className="text-3xl text-[#8A94A6] mx-auto mb-2" />
                        <p className="text-sm font-bold text-white">Sync Local Unit</p>
                        <p className="text-xs text-[#4A5568] mt-1">Drag & Drop PDF (Max 20MB)</p>
                    </div>
                )}
                <input type="file" ref={fileInputRef} onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0])} className="hidden" accept=".pdf" />
            </div>

            <input
                type="url" value={urlInput}
                onChange={(e) => { setUrlInput(e.target.value); if (e.target.value) setTextInput(''); }}
                placeholder="Connect Website Node..."
                className="w-full bg-white/[0.03] border border-white/[0.06] focus:border-[#D4AF37]/40 rounded-xl px-4 py-3 text-sm text-white placeholder-[#4A5568] outline-none transition-all"
            />
            <textarea
                value={textInput}
                onChange={(e) => { setTextInput(e.target.value); if (e.target.value) setUrlInput(''); }}
                placeholder="Paste plain text here..."
                rows="3"
                className="w-full bg-white/[0.03] border border-white/[0.06] focus:border-[#D4AF37]/40 rounded-xl px-4 py-3 text-sm text-white placeholder-[#4A5568] outline-none transition-all resize-none scrollbar-hide"
            />
            <button
                onClick={(e) => urlInput.trim() ? handleUrlSubmit(e) : handleTextSubmit(e)}
                disabled={isUploading || (!urlInput.trim() && !textInput.trim())}
                className={`w-full py-3.5 rounded-xl text-xs font-bold uppercase tracking-[0.15em] flex items-center justify-center gap-2 transition-all ${
                    isUploading || (!urlInput.trim() && !textInput.trim()) ? 'bg-white/[0.03] text-[#4A5568]' : 'bg-[#D4AF37] text-black hover:brightness-110 shadow-lg shadow-[#D4AF37]/10'
                }`}
            >
                <span>Sync Neural Feed</span>
            </button>

            {uploadStatus && (
                <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-semibold animate-fade-in ${uploadStatus.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/15' : 'bg-red-500/10 text-red-400 border border-red-500/15'}`}>
                    {uploadStatus.type === 'success' ? <HiCheckCircle className="text-base" /> : <HiXCircle className="text-base" />}
                    <span>{uploadStatus.message}</span>
                </div>
            )}
        </div>
    );
}

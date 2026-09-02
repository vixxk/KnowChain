import { useState, useRef } from 'react';
import { HiCloudUpload, HiCheckCircle, HiXCircle } from 'react-icons/hi';
import axios from 'axios';
import API_BASE_URL from '../api/config';

export default function DocumentUpload({ sessionId, onDocumentAdded, privacyMode, customQdrantUrl, onLoadingStateChange }) {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadType, setUploadType] = useState(null); // 'pdf' | 'web' | 'text' | null
    const [uploadStatus, setUploadStatus] = useState(null);
    const [urlInput, setUrlInput] = useState('');
    const [textInput, setTextInput] = useState('');
    const [isDragActive, setIsDragActive] = useState(false);
    const fileInputRef = useRef(null);

    const qdrantUrl = privacyMode ? customQdrantUrl : null;
    const ONE_REVOLUTION_MS = 5000;

    const startProcessingWithMinRevolution = (type) => {
        setIsUploading(true);
        setUploadType(type);
        setUploadStatus(null);
        if (onLoadingStateChange) onLoadingStateChange(true);
        return Date.now();
    };

    const finishProcessingWithMinRevolution = (startTime, completionFn) => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, ONE_REVOLUTION_MS - elapsed);
        setTimeout(() => {
            setIsUploading(false);
            setUploadType(null);
            if (onLoadingStateChange) onLoadingStateChange(false);
            if (completionFn) completionFn();
        }, remaining);
    };

    const handleFileUpload = async (file) => {
        if (!file || file.type !== 'application/pdf') { setUploadStatus({ type: 'error', message: 'PDF only.' }); return; }
        if (privacyMode && !customQdrantUrl) { setUploadStatus({ type: 'error', message: 'Set Qdrant URL first.' }); return; }
        
        const startTime = startProcessingWithMinRevolution('pdf');
        const formData = new FormData(); 
        formData.append('file', file); 
        formData.append('sessionId', sessionId);
        if (qdrantUrl) formData.append('qdrantUrl', qdrantUrl);

        try {
            const res = await axios.post(`${API_BASE_URL}/chat/index/pdf`, formData);
            onDocumentAdded({ name: file.name, type: 'pdf', size: (file.size / 1024 / 1024).toFixed(2) + ' MB', collection: res.data.collectionName });
            finishProcessingWithMinRevolution(startTime, () => {
                setUploadStatus({ type: 'success', message: 'Synced.' }); 
                setTimeout(() => setUploadStatus(null), 3000);
            });
        } catch (e) { 
            finishProcessingWithMinRevolution(startTime, () => {
                setUploadStatus({ type: 'error', message: e.response?.data?.error || 'Failed.' }); 
            });
        }
    };

    const handleUrlSubmit = async (e) => {
        e.preventDefault(); if (!urlInput.trim() || isUploading) return;
        if (privacyMode && !customQdrantUrl) { setUploadStatus({ type: 'error', message: 'Set Qdrant URL first.' }); return; }
        
        const startTime = startProcessingWithMinRevolution('web');
        try {
            const res = await axios.post(`${API_BASE_URL}/chat/index/web`, { url: urlInput, sessionId, qdrantUrl });
            onDocumentAdded({ name: new URL(urlInput).hostname, type: 'web', collection: res.data.collectionName });
            setUrlInput(''); 
            finishProcessingWithMinRevolution(startTime, () => {
                setUploadStatus({ type: 'success', message: 'Linked.' }); 
                setTimeout(() => setUploadStatus(null), 3000);
            });
        } catch (e) { 
            finishProcessingWithMinRevolution(startTime, () => {
                setUploadStatus({ type: 'error', message: e.response?.data?.error || 'Failed.' }); 
            });
        }
    };

    const handleTextSubmit = async (e) => {
        e.preventDefault(); if (!textInput.trim() || isUploading) return;
        if (privacyMode && !customQdrantUrl) { setUploadStatus({ type: 'error', message: 'Set Qdrant URL first.' }); return; }
        
        const startTime = startProcessingWithMinRevolution('text');
        try {
            const res = await axios.post(`${API_BASE_URL}/chat/index/text`, { text: textInput, sessionId, qdrantUrl });
            onDocumentAdded({ name: 'Snippet ' + new Date().toLocaleTimeString(), type: 'text', collection: res.data.collectionName });
            setTextInput(''); 
            finishProcessingWithMinRevolution(startTime, () => {
                setUploadStatus({ type: 'success', message: 'Ingested.' }); 
                setTimeout(() => setUploadStatus(null), 3000);
            });
        } catch (e) { 
            finishProcessingWithMinRevolution(startTime, () => {
                setUploadStatus({ type: 'error', message: e.response?.data?.error || 'Failed.' }); 
            });
        }
    };

    return (
        <div className="space-y-3">
            {/* PDF Upload Box */}
            <div
                onDragOver={(e) => { e.preventDefault(); setIsDragActive(true); }}
                onDragLeave={() => setIsDragActive(false)}
                onDrop={(e) => { e.preventDefault(); setIsDragActive(false); if (e.dataTransfer.files[0]) handleFileUpload(e.dataTransfer.files[0]); }}
                onClick={() => !isUploading && fileInputRef.current?.click()}
                className={`rounded-lg text-center cursor-pointer transition-all ${
                    isUploading && uploadType === 'pdf'
                        ? 'border-beam-card border-beam-card-slow'
                        : isDragActive 
                            ? 'border border-dashed border-[#3b82f6] bg-[#3b82f6]/10 p-4' 
                            : 'border border-dashed border-[#2a2d36] bg-[#08090b] hover:border-[#3a3e4a] hover:bg-[#101216] p-4'
                }`}
            >
                {isUploading && uploadType === 'pdf' ? (
                    <div className="border-beam-inner bg-[#08090b] p-4 flex flex-col items-center justify-center">
                        <div className="w-6 h-6 border-2 border-[#1f2229] border-t-[#3b82f6] rounded-full animate-spin mb-2"></div>
                        <p className="text-[11px] font-medium text-[#60a5fa] uppercase tracking-wider font-mono">Syncing PDF...</p>
                    </div>
                ) : (
                    <div>
                        <HiCloudUpload className="text-2xl text-[#6b7280] mx-auto mb-1.5" />
                        <p className="text-xs font-medium text-[#eef0f3]">Sync Unit</p>
                        <p className="text-[10px] text-[#6b7280] mt-0.5 font-mono">Drag & Drop PDF (Max 20MB)</p>
                    </div>
                )}
                <input type="file" ref={fileInputRef} onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0])} className="hidden" accept=".pdf" />
            </div>

            {/* Connect Website Node Input Box */}
            <div className={isUploading && uploadType === 'web' ? 'border-beam-card border-beam-card-slow rounded-md' : ''}>
                <div className={isUploading && uploadType === 'web' ? 'border-beam-inner bg-[#08090b]' : ''}>
                    <input
                        type="url" 
                        value={urlInput}
                        onChange={(e) => { setUrlInput(e.target.value); if (e.target.value) setTextInput(''); }}
                        disabled={isUploading}
                        placeholder={isUploading && uploadType === 'web' ? "Syncing Website Node..." : "Connect Website Node..."}
                        className={`w-full bg-[#08090b] rounded-md px-3 py-2 text-xs text-[#eef0f3] placeholder-[#454952] outline-none transition-all font-mono ${
                            isUploading && uploadType === 'web' ? 'border-0 text-[#60a5fa]' : 'border border-[#2a2d36] focus:border-[#3b82f6]'
                        }`}
                    />
                </div>
            </div>

            {/* Paste Plain Text Snippet Textarea */}
            <div className={isUploading && uploadType === 'text' ? 'border-beam-card border-beam-card-slow rounded-md' : ''}>
                <div className={isUploading && uploadType === 'text' ? 'border-beam-inner bg-[#08090b]' : ''}>
                    <textarea
                        value={textInput}
                        onChange={(e) => { setTextInput(e.target.value); if (e.target.value) setUrlInput(''); }}
                        disabled={isUploading}
                        placeholder={isUploading && uploadType === 'text' ? "Syncing Text Snippet..." : "Paste plain text snippet..."}
                        rows="2"
                        className={`w-full bg-[#08090b] rounded-md px-3 py-2 text-xs text-[#eef0f3] placeholder-[#454952] outline-none transition-all resize-none font-mono ${
                            isUploading && uploadType === 'text' ? 'border-0 text-[#60a5fa]' : 'border border-[#2a2d36] focus:border-[#3b82f6]'
                        }`}
                    />
                </div>
            </div>

            {/* Sync Feed Submit Button */}
            <div className={isUploading && (uploadType === 'web' || uploadType === 'text') ? 'border-beam-card border-beam-card-slow rounded-md' : ''}>
                <div className={isUploading && (uploadType === 'web' || uploadType === 'text') ? 'border-beam-inner bg-[#08090b]' : ''}>
                    <button
                        onClick={(e) => urlInput.trim() ? handleUrlSubmit(e) : handleTextSubmit(e)}
                        disabled={isUploading || (!urlInput.trim() && !textInput.trim())}
                        className={`w-full py-2 rounded-md text-xs font-mono font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                            isUploading 
                                ? 'bg-[#101216] text-[#60a5fa] border-0 cursor-wait' 
                                : (!urlInput.trim() && !textInput.trim()) 
                                    ? 'bg-[#101216] text-[#454952] border border-[#1f2229]' 
                                    : 'btn-blue-primary'
                        }`}
                    >
                        {isUploading ? (
                            <>
                                <div className="w-3.5 h-3.5 border-2 border-transparent border-t-[#3b82f6] rounded-full animate-spin"></div>
                                <span>Syncing Feed...</span>
                            </>
                        ) : (
                            <span>Sync Feed</span>
                        )}
                    </button>
                </div>
            </div>

            {uploadStatus && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs font-mono font-medium animate-fade-in ${
                    uploadStatus.type === 'success' ? 'bg-[#34d399]/10 text-[#34d399] border border-[#34d399]/20' : 'bg-[#f87171]/10 text-[#f87171] border border-[#f87171]/20'
                }`}>
                    {uploadStatus.type === 'success' ? <HiCheckCircle className="text-sm shrink-0" /> : <HiXCircle className="text-sm shrink-0" />}
                    <span>{uploadStatus.message}</span>
                </div>
            )}
        </div>
    );
}

import React, { useState } from "react";
import { indexPdf, indexText, indexWeb } from "../api";
import { FileText, Globe, Upload, Loader, CheckCircle, AlertCircle } from "lucide-react";

export default function DataSourcePanel() {
  const [text, setText] = useState("");
  const [textCollection, setTextCollection] = useState("text");
  const [webUrl, setWebUrl] = useState("");
  const [pdfCollection, setPdfCollection] = useState("pdf");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [noteType, setNoteType] = useState("info");

  function showNote(message, type = "info") {
    setNote(message);
    setNoteType(type);
    setTimeout(() => setNote(""), 5000);
  }

  async function handleIndexText() {
    if (!text.trim()) return showNote("Please enter some text to index.", "error");
    setBusy(true);
    showNote("Indexing text... This may take some time for large inputs.", "loading");
    try {
      const res = await indexText(text, textCollection || "text");
      showNote(res.message || "Text indexed successfully!", "success");
      setText("");
    } catch (e) {
      showNote(e?.response?.data?.error || e.message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleIndexWeb() {
    if (!webUrl.trim()) return showNote("Please enter a valid URL.", "error");
    setBusy(true);
    showNote("Indexing website... This may take some time depending on content size.", "loading");
    try {
      const res = await indexWeb(webUrl.trim());
      showNote(res.message || "Website indexed successfully!", "success");
      setWebUrl("");
    } catch (e) {
      showNote(e?.response?.data?.error || e.message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleIndexPdf(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    showNote("Indexing PDF... This may take some time for large documents.", "loading");
    try {
      const res = await indexPdf(file, pdfCollection || "pdf");
      showNote(res.message || "PDF indexed successfully!", "success");
    } catch (e2) {
      showNote(e2?.response?.data?.error || e2.message, "error");
    } finally {
      e.target.value = "";
      setBusy(false);
    }
  }

  return (
    <div className="data-source-container">
      <div className="data-source-header">
        <div className="header-title">
          <Upload className="header-icon" />
          <span>Data Sources</span>
        </div>
        <div className="header-subtitle">Index your content for AI-powered search</div>
      </div>

      <div className="source-section">
        <div className="section-header">
          <FileText size={18} />
          <span>Text Content</span>
        </div>
        
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          className="text-input"
          placeholder="Paste your text content here and index it for AI-powered search..."
          rows={6}
        />
        
        <div className="input-row">
          <input 
            value={textCollection} 
            onChange={e => setTextCollection(e.target.value)} 
            placeholder="Collection name (e.g., text, docs, articles)"
            className="collection-input"
          />
          <button 
            className={`action-button primary ${busy ? 'loading' : ''}`} 
            onClick={handleIndexText} 
            disabled={busy}
          >
            {busy ? <Loader className="spin" size={16} /> : <FileText size={16} />}
            Index Text
          </button>
        </div>
      </div>

      <div className="source-section">
        <div className="section-header">
          <Globe size={18} />
          <span>Website</span>
        </div>
        
        <div className="input-row">
          <input 
            value={webUrl} 
            onChange={e => setWebUrl(e.target.value)} 
            placeholder="https://example.com/docs"
            className="url-input"
          />
          <button 
            className={`action-button ${busy ? 'loading' : ''}`} 
            onClick={handleIndexWeb} 
            disabled={busy}
          >
            {busy ? <Loader className="spin" size={16} /> : <Globe size={16} />}
            Index Website
          </button>
        </div>
      </div>

      <div className="source-section">
        <div className="section-header">
          <Upload size={18} />
          <span>PDF Document</span>
        </div>
        
        <div className="input-row">
          <input 
            value={pdfCollection} 
            onChange={e => setPdfCollection(e.target.value)} 
            placeholder="Collection name (e.g., pdf, manuals)"
            className="collection-input"
          />
          
          <label className="file-upload-button">
            <input 
              type="file" 
              accept="application/pdf" 
              onChange={handleIndexPdf} 
              disabled={busy}
            />
            {busy ? <Loader className="spin" size={16} /> : <Upload size={16} />}
            Upload PDF
          </label>
        </div>
      </div>

      {note && (
        <div className={`notification ${noteType}`}>
          {noteType === 'success' && <CheckCircle size={16} />}
          {noteType === 'error' && <AlertCircle size={16} />}
          {noteType === 'loading' && <Loader className="spin" size={16} />}
          <span>{note}</span>
        </div>
      )}
    </div>
  );
}

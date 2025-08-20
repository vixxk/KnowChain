import React, { useState } from "react";
import { indexPdf, indexText, indexWeb } from "../api";

export default function DataSourcePanel() {
  const [text, setText] = useState("");
  const [textCollection, setTextCollection] = useState("text");
  const [webUrl, setWebUrl] = useState("");
  const [pdfCollection, setPdfCollection] = useState("pdf");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  async function handleIndexText() {
    if (!text.trim()) return setNote("Enter some text to index.");
    setBusy(true); 
    setNote("Indexing text… This may take some time for large inputs.");
    try {
      const res = await indexText(text, textCollection || "text");
      setNote(res.message || "Text indexed successfully.");
      setText("");
    } catch (e) {
      setNote(e?.response?.data?.error || e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleIndexWeb() {
    if (!webUrl.trim()) return setNote("Enter a URL.");
    setBusy(true); 
    setNote("Indexing website… This may take some time depending on content size.");
    try {
      const res = await indexWeb(webUrl.trim());
      setNote(res.message || "Website indexed successfully.");
      setWebUrl("");
    } catch (e) {
      setNote(e?.response?.data?.error || e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleIndexPdf(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true); 
    setNote("Indexing PDF… This may take some time for large documents.");
    try {
      const res = await indexPdf(file, pdfCollection || "pdf");
      setNote(res.message || "PDF indexed successfully.");
    } catch (e2) {
      setNote(e2?.response?.data?.error || e2.message);
    } finally {
      e.target.value = "";
      setBusy(false);
    }
  }

  return (
    <div className="card data-card">
      <div className="card-header">
        <div className="title">Data Source</div>
      </div>

      <div className="section">
        <label className="field full">
          <span>Text Area</span>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={6}
            placeholder="Paste text and index to 'text' collection (or custom)…"
          />
        </label>

        <div className="row">
          <input value={textCollection} onChange={e => setTextCollection(e.target.value)} placeholder="text"/>
          <button className={`btn primary ${busy ? 'loading-btn' : ''}`} onClick={handleIndexText} disabled={busy}>
            {busy ? "Indexing…" : "Submit"}
          </button>
        </div>
      </div>

      <div className="section">
        <div className="row">
          <input value={webUrl} onChange={e => setWebUrl(e.target.value)} placeholder="https://example.com/docs"/>
          <button className={`btn ${busy ? 'loading-btn' : ''}`} onClick={handleIndexWeb} disabled={busy}>
            {busy ? "Indexing…" : "Index Website"}
          </button>
        </div>
      </div>

      <div className="section">
        <div className="row">
          <input value={pdfCollection} onChange={e => setPdfCollection(e.target.value)} placeholder="pdf"/>
          <label className="upload">
            <input type="file" accept="application/pdf" onChange={handleIndexPdf} disabled={busy}/>
            <span>{busy ? "Indexing…" : "Upload PDF"}</span>
          </label>
        </div>
      </div>

      {note && <div className="note">{note}</div>}
    </div>
  );
}

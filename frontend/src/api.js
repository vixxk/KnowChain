import axios from "axios";
import { v4 as uuidv4 } from "uuid";

// Generate one sessionId per page load
const sessionId = uuidv4();

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE?.replace(/\/$/, "") || "http://localhost:5000",
});

// Chat endpoints (include sessionId automatically)
export const chatWeb = (data) => api.post("/chat/web", { ...data, sessionId }).then(r => r.data);
export const chatPdf = (data) => api.post("/chat/pdf", { ...data, sessionId }).then(r => r.data);
export const chatText = (data) => api.post("/chat/text", { ...data, sessionId }).then(r => r.data);

// Indexing endpoints
export const indexWeb = (url) => api.post("/chat/index/web", { url }).then(r => r.data);
export const indexPdf = (file, collectionName) => {
  const form = new FormData();
  form.append("file", file);
  if (collectionName) form.append("collectionName", collectionName);
  return api.post("/chat/index/pdf", form, { headers: { "Content-Type": "multipart/form-data" }})
           .then(r => r.data);
};
export const indexText = (text, collectionName) =>
  api.post("/chat/index/text", { text, collectionName }).then(r => r.data);

export default api;

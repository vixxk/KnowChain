import express from "express";
import multer from "multer";
import fs from "fs";
import { unifiedChatController } from "../controllers/chat/queryController.js";
import { rewriteController } from "../controllers/chat/rewriteController.js";
import { webIndexer } from "../controllers/indexer/webIndexer.js";
import { pdfIndexer } from "../controllers/indexer/pdfIndexer.js";
import { textIndexer } from "../controllers/indexer/textIndexer.js";
import { deleteSessionCollections } from "../controllers/indexer/cleanupController.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

function generateCollectionName(sessionId, typePrefix) {
  return `${sessionId}_${typePrefix}_${Date.now()}`.replace(/[^a-zA-Z0-9_-]/g, "_");
}

router.post("/query", unifiedChatController);
router.post("/rewrite", rewriteController);
router.post("/web", unifiedChatController);
router.post("/pdf", unifiedChatController);
router.post("/text", unifiedChatController);

router.post("/index/web", async (req, res) => {
  try {
    const { url, sessionId } = req.body;
    if (!url || !sessionId) return res.status(400).json({ error: "Missing parameters" });
    const collectionName = generateCollectionName(sessionId, "website");
    await webIndexer(url, collectionName);
    res.json({ message: "Indexed", collectionName });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/index/pdf", upload.single("file"), async (req, res) => {
  try {
    if (!req.file || !req.body.sessionId) return res.status(400).json({ error: "Missing file or session" });
    const collectionName = generateCollectionName(req.body.sessionId, "pdf");
    await pdfIndexer(req.file.path, collectionName);
    fs.unlink(req.file.path, () => {});
    res.json({ message: "Indexed", collectionName });
  } catch (error) {
    if (req.file) fs.unlink(req.file.path, () => {});
    res.status(500).json({ error: error.message });
  }
});

router.post("/index/text", async (req, res) => {
  try {
    const { text, sessionId } = req.body;
    if (!text || !sessionId) return res.status(400).json({ error: "Missing parameters" });
    const collectionName = generateCollectionName(sessionId, "text");
    await textIndexer(text, collectionName);
    res.json({ message: "Indexed", collectionName });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/start-session", (req, res) => {
  res.json({ sessionId: `session_${Date.now()}_${Math.random().toString(36).substring(2, 8)}` });
});

router.post("/cleanup/:sessionId", async (req, res) => {
  try {
    const result = await deleteSessionCollections(req.params.sessionId);
    res.json({ message: "Cleaned up", ...result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

import express from "express";
import multer from "multer";
import fs from "fs";
import { webChatController, pdfChatController, textChatController } from "../controllers/chatController.js";
import { webIndexer, pdfIndexer, textIndexer } from "../utils/indexers.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.post("/web", webChatController);
router.post("/pdf", pdfChatController);
router.post("/text", textChatController);

router.post("/index/web", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL is required" });

    await webIndexer(url);
    res.json({ message: "Website indexed successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Website indexing failed" });
  }
});

router.post("/index/pdf", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "PDF file is required" });

    const collectionName = req.body.collectionName || "pdf";
    await pdfIndexer(req.file.path, collectionName);

    fs.unlink(req.file.path, (err) => {
      if (err) console.error("Failed to delete uploaded PDF:", err);
    });

    res.json({ message: "PDF indexed successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "PDF indexing failed" });
  }
});

router.post("/index/text", async (req, res) => {
  try {
    const { text, collectionName } = req.body;
    if (!text) return res.status(400).json({ error: "Text content is required" });

    await textIndexer(text, collectionName || "text");
    res.json({ message: "Text indexed successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Text indexing failed" });
  }
});

export default router;

import axios from "axios";
import { load } from "cheerio";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { OpenAIEmbeddings } from "@langchain/openai";
import { QdrantVectorStore } from "@langchain/qdrant";
import dotenv from "dotenv";
import { throttleRequest, forceBackoff } from "./throttle.js";
console.log("🛠️ Indexers module loaded [VERSION 2.0]");

const FIREWORKS_API_KEY = process.env.FIREWORKS_API_KEY;
const FW_BASE_URL = "https://api.fireworks.ai/inference/v1";
const EMBED_MODEL = "nomic-ai/nomic-embed-text-v1.5";

async function executeWithRetry(fn, maxRetries = 3, initialDelay = 5000) {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      if (error.status === 429 && attempt < maxRetries) {
        const delay = initialDelay * Math.pow(2, attempt - 1);
        console.warn(`🚨 Rate limit hit. Backing off for ${delay}ms...`);
        forceBackoff(delay);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
}

function chunkArray(array, size) {
  const result = [];
  for (let i = 0; i < array.length; i += size) result.push(array.slice(i, i + size));
  return result;
}

const getEmbeddings = () => new OpenAIEmbeddings({
    model: EMBED_MODEL,
    apiKey: FIREWORKS_API_KEY,
    configuration: { baseURL: FW_BASE_URL },
});

async function runIncrementalIndexing(batches, embeddings, collectionName) {
  let vectorStore;
  for (let i = 0; i < batches.length; i++) {
    await throttleRequest();
    console.log(`📤 Indexing batch ${i + 1}/${batches.length}...`);
    
    await executeWithRetry(async () => {
      if (i === 0) {
        vectorStore = await QdrantVectorStore.fromDocuments(batches[i], embeddings, {
          url: process.env.QDRANT_URL,
          collectionName,
          apiKey: process.env.QDRANT_API_KEY,
          clientConfig: { checkCompatibility: false },
        });
      } else {
        await vectorStore.addDocuments(batches[i]);
      }
    });
  }
}

export async function webIndexer(url, collectionName) {
  console.log(`🌐 [WebIndex] Scraping: ${url}`);
  const response = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }});
  const $ = load(response.data);
  
  // Clean up noisy elements to focus on actual content
  $('nav, footer, aside, header, script, style, .sidebar, .menu').remove();
  
  // Try to find main content or fallback to body
  const contentElement = $('article, main, #content, .content, .markdown').first().length > 0 
    ? $('article, main, #content, .content, .markdown').first() 
    : $('body');
  
  const rawText = contentElement.text().replace(/\n+/g, '\n').replace(/\s{2,}/g, ' ').trim();

  if (!rawText || rawText.length < 50) throw new Error("No significant content extracted from website. Bot protection might be active.");

  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 600, chunkOverlap: 120 });
  const chunks = await splitter.splitText(rawText);
  const docs = chunks.map(chunk => ({ 
    pageContent: `search_document: ${chunk}`,
    metadata: { source: url }
  }));

  console.log(`📦 Web extracted ${rawText.length} chars, created ${docs.length} chunks.`);
  const embeddings = getEmbeddings();
  const batches = chunkArray(docs, parseInt(process.env.BATCH_SIZE) || 100);
  await runIncrementalIndexing(batches, embeddings, collectionName);
  console.log(`✅ Website indexed successfully!`);
}

export async function pdfIndexer(pdfFilePath, collectionName) {
  console.log(`📄 Starting PDF extraction for: ${pdfFilePath}`);
  const loader = new PDFLoader(pdfFilePath, { splitPages: false });
  const rawDocs = await loader.load();

  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 });
  const docs = [];
  for (const doc of rawDocs) {
    const chunks = await splitter.splitText(doc.pageContent || "");
    chunks.forEach(chunk => docs.push({ 
      pageContent: `search_document: ${chunk}`,
      metadata: { source: doc.metadata?.source || "unknown" }
    }));
  }

  const embeddings = getEmbeddings();
  const batches = chunkArray(docs, parseInt(process.env.BATCH_SIZE) || 100);
  console.log(`📦 Processing ${batches.length} batches...`);
  await runIncrementalIndexing(batches, embeddings, collectionName);
  console.log(`✅ PDF indexed successfully!`);
}

export async function textIndexer(textContent, collectionName) {
  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 });
  const chunks = await splitter.splitText(textContent);
  const docs = chunks.map(chunk => ({ 
    pageContent: `search_document: ${chunk}`,
    metadata: { source: "user-uploaded" }
  }));

  const embeddings = getEmbeddings();
  const batches = chunkArray(docs, parseInt(process.env.BATCH_SIZE) || 100);
  console.log(`📦 Processing ${batches.length} batches...`);
  await runIncrementalIndexing(batches, embeddings, collectionName);
  console.log(`✅ Text indexed successfully!`);
}

export async function deleteCollection(sessionId, chatType) {
  const collectionName = `${sessionId}_${chatType}`.replace(/[^a-zA-Z0-9_-]/g, "_");
  try {
    await fetch(`${process.env.QDRANT_URL}/collections/${collectionName}`, {
      method: "DELETE",
      headers: { "api-key": process.env.QDRANT_API_KEY },
    });
    console.log(`🗑️ Collection ${collectionName} deleted`);
  } catch (error) {
    console.error(`Error deleting collection ${collectionName}:`, error.message);
  }
}

/**
 * Delete ALL Qdrant collections that match a session prefix.
 * Handles timestamped collection names like: session_xxx_pdf_1711440000
 */
export async function deleteSessionCollections(sessionId) {
  if (!sessionId) return { deleted: 0 };

  const sanitizedPrefix = sessionId.replace(/[^a-zA-Z0-9_-]/g, "_");
  
  try {
    // List all collections from Qdrant
    const listRes = await fetch(`${process.env.QDRANT_URL}/collections`, {
      headers: { "api-key": process.env.QDRANT_API_KEY },
    });
    const listData = await listRes.json();
    const allCollections = listData?.result?.collections || [];

    // Filter collections belonging to this session
    const toDelete = allCollections
      .map(c => c.name)
      .filter(name => name.startsWith(sanitizedPrefix));

    if (toDelete.length === 0) {
      console.log(`🧹 [Cleanup] No collections found for session: ${sessionId}`);
      return { deleted: 0 };
    }

    console.log(`🧹 [Cleanup] Deleting ${toDelete.length} collection(s) for session ${sessionId.substring(0, 20)}...`);

    // Delete each matching collection
    for (const name of toDelete) {
      try {
        await fetch(`${process.env.QDRANT_URL}/collections/${name}`, {
          method: "DELETE",
          headers: { "api-key": process.env.QDRANT_API_KEY },
        });
        console.log(`  🗑️ Deleted: ${name}`);
      } catch (err) {
        console.error(`  ⚠️ Failed to delete ${name}: ${err.message}`);
      }
    }

    return { deleted: toDelete.length, collections: toDelete };
  } catch (error) {
    console.error(`🧹 [Cleanup] Error listing collections: ${error.message}`);
    return { deleted: 0, error: error.message };
  }
}


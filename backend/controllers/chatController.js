import OpenAI from "openai";
import { OpenAIEmbeddings } from "@langchain/openai";
import { QdrantVectorStore } from "@langchain/qdrant";
import dotenv from "dotenv";
import { throttleRequest, forceBackoff } from "../utils/throttle.js";

const FIREWORKS_API_KEY = process.env.FIREWORKS_API_KEY;
const FW_BASE_URL = "https://api.fireworks.ai/inference/v1";
const CHAT_MODEL = "accounts/fireworks/models/mixtral-8x22b-instruct";
const EMBED_MODEL = "nomic-ai/nomic-embed-text-v1.5";

async function executeWithRetry(fn, maxRetries = 3, initialDelay = 2000) {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      if (error.status === 429 && attempt < maxRetries) {
        const delay = initialDelay * Math.pow(2, attempt - 1);
        console.warn(`🚨 Rate limit hit. Retrying in ${delay}ms... (${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
}

async function rewriteQuery(originalQuery) {
  const fwClient = new OpenAI({ apiKey: FIREWORKS_API_KEY, baseURL: FW_BASE_URL });
  try {
    const response = await fwClient.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        { role: "system", content: "Rewrite the query for vector search. Output ONLY rewritten text." },
        { role: "user", content: originalQuery }
      ],
      temperature: 0.1, max_tokens: 150,
    });
    const rewritten = response.choices[0].message.content.trim();
    console.log(`🧠 [QueryRewrite] "${originalQuery}" -> "${rewritten}"`);
    return rewritten;
  } catch (err) {
    console.error("Rewrite failed:", err.message);
    return originalQuery;
  }
}

/**
 * Retrieve chunks from a SINGLE collection
 */
async function retrieveFromCollection(collectionName, query, embeddings) {
  try {
    const vectorStore = await QdrantVectorStore.fromExistingCollection(embeddings, {
      url: process.env.QDRANT_URL,
      collectionName,
      apiKey: process.env.QDRANT_API_KEY,
      clientConfig: { checkCompatibility: false },
    });

    const retriever = vectorStore.asRetriever({ k: 5 });
    const searchReadyQuery = `search_query: ${query}`;
    const docs = await retriever.invoke(searchReadyQuery);
    
    console.log(`📄 [RAG] ${collectionName}: Found ${docs.length} chunks`);
    return docs.map(doc => ({
      ...doc,
      metadata: { ...doc.metadata, collectionName }
    }));
  } catch (error) {
    console.error(`⚠️ [RAG] Failed to retrieve from ${collectionName}: ${error.message}`);
    return [];
  }
}

/**
 * UNIFIED chat handler. Supports single or multi-collection queries.
 */
export async function unifiedChatController(req, res) {
  try {
    const { query, collectionName, collectionNames, rewrite } = req.body;

    // Support both single (collectionName) and multi (collectionNames) 
    const collections = collectionNames || (collectionName ? [collectionName] : []);

    if (collections.length === 0) {
      return res.status(400).json({ error: "❌ No knowledge unit selected. Please select a source from the Neural Lattice." });
    }
    if (!query) {
      return res.status(400).json({ error: "Query is required." });
    }

    const shouldRewrite = rewrite || false;
    const currentQuery = shouldRewrite ? await rewriteQuery(query) : query;

    console.log(`\n🌀 [RAG] Querying ${collections.length} collection(s): ${collections.map(c => c.substring(0, 30)).join(', ')}`);

    const embeddings = new OpenAIEmbeddings({
      model: EMBED_MODEL,
      apiKey: FIREWORKS_API_KEY,
      configuration: { baseURL: FW_BASE_URL },
    });

    // Query ALL selected collections in parallel and merge results
    const allDocsArrays = await Promise.all(
      collections.map(col => retrieveFromCollection(col, currentQuery, embeddings))
    );
    const allDocs = allDocsArrays.flat();

    const totalChunks = allDocs.length;
    console.log(`📊 [RAG] Total chunks across all collections: ${totalChunks}`);

    if (totalChunks === 0) {
      return res.status(400).json({
        error: "❌ Neural Lattice Empty. No results found in the selected unit(s). Please re-upload or re-index your source."
      });
    }

    // Build clean context WITHOUT raw file paths
    const contextText = allDocs
      .map((doc, i) => {
        return `--- Section ${i + 1} ---\n${doc.pageContent}`;
      })
      .join("\n\n");

    // Extract unique source metadata only (deduplicate by source URL)
    const uniqueSources = [];
    const seenUrls = new Set();
    
    allDocs.forEach((doc) => {
      const srcUrl = doc.metadata?.source || doc.metadata?.url || 'Unknown';
      if (!seenUrls.has(srcUrl)) {
        seenUrls.add(srcUrl);
        uniqueSources.push({
          id: uniqueSources.length + 1,
          source: srcUrl,
          collection: doc.metadata?.collectionName || 'Unknown',
          preview: doc.pageContent?.substring(0, 120)?.trim() + '...',
        });
      }
    });

    const sourcesMeta = uniqueSources;

    const fwClient = new OpenAI({ apiKey: FIREWORKS_API_KEY, baseURL: FW_BASE_URL });

    const SYSTEM_PROMPT = `You are KnowChain AI v2.0, a professional intelligence assistant.

CORE PERSONALITY:
- Be helpful, conversational, and precise.
- You are connected to the user's "Neural Lattice"—a private cognitive workspace.

COGNITIVE FORMATTING RULES:
1. **Citations (CRITICAL)**: ONLY use [Source X] citations when you include an image OR when you are providing information from your general knowledge (third-party info) that is NOT explicitly found in the provided DOCUMENT CONTENT. If you are answering directly from the document content, do NOT add citations.
2. **Visual Anchors (Images)**: When the user asks for images or when explaining complex architecture, include a relevant image using this EXACT format: ![Description](https://picsum.photos/seed/<keyword>/800/400). Replace <keyword> with a single relevant English word (e.g., nodejs, network). Always accompany an image with a [Source X] citation where X corresponds to the primary source.
3. **Architectural Workflows**: When explaining systems or processes, use "Step Headers" (e.g., ### DATA INGESTION) to separate distinct phases.
4. **Highlights**: Use **bold text** to highlight the MOST CRITICAL answers or 'Neural Anchors' so the user can skim the response.
5. **Tone**: Maintain a premium, executive tone.

DOCUMENT CONTENT:
${contextText}`;

    const response = await executeWithRetry(() => fwClient.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: query }
      ],
      temperature: 0.3, max_tokens: 2048,
    }));

    const aiAnswer = response.choices[0].message.content;
    console.log(`📡 [RAG] Response complete (${aiAnswer.length} chars from ${collections.length} source(s))`);

    res.json({
      answer: aiAnswer,
      rewrittenQuery: shouldRewrite ? currentQuery : null,
      sourcesQueried: collections.length,
      chunksFound: totalChunks,
      sources: sourcesMeta
    });

  } catch (error) {
    console.error(`[ChatError] ${error.message}`);
    res.status(500).json({ error: error.message });
  }
}

/**
 * STANDALONE Rewrite handler. Just returns a better version of the query.
 */
export async function rewriteController(req, res) {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: "Query is required." });
    
    const rewritten = await rewriteQuery(query);
    res.json({ original: query, rewritten });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Legacy exports pointing to unified handler
export const webChatController = unifiedChatController;
export const pdfChatController = unifiedChatController;
export const textChatController = unifiedChatController;

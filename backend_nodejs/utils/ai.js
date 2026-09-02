import OpenAI from "openai";
import { OpenAIEmbeddings } from "@langchain/openai";
import axios from "axios";

const getApiKey = () => process.env.FIREWORKS_API_KEY;
const FW_BASE_URL = "https://api.fireworks.ai/inference/v1";
const CHAT_MODEL = "accounts/fireworks/models/deepseek-v4-pro";
const EMBED_MODEL = "nomic-ai/nomic-embed-text-v1.5";

import { refineQuery } from "./promptRefiner.js";

export async function executeWithRetry(fn, maxRetries = 3, initialDelay = 2000) {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      if ((error.status === 429 || error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') && attempt < maxRetries) {
        const delay = initialDelay * Math.pow(2, attempt - 1);
        console.warn(`🚨 API error (${error.status || error.code}). Retrying in ${delay}ms... (${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
}

export async function rewriteQuery(originalQuery) {
  const fwClient = new OpenAI({ apiKey: getApiKey(), baseURL: FW_BASE_URL });
  return await refineQuery(originalQuery, fwClient, CHAT_MODEL);
}

class CustomOpenAIEmbeddings extends OpenAIEmbeddings {
  async embeddingWithRetry(request) {
    const customRequest = {
      ...request,
      encoding_format: "float",
    };
    return super.embeddingWithRetry(customRequest);
  }
}

export const getEmbeddings = () => new CustomOpenAIEmbeddings({
  model: EMBED_MODEL,
  apiKey: getApiKey(),
  configuration: { baseURL: FW_BASE_URL },
});

export const getFwClient = () => new OpenAI({ apiKey: getApiKey(), baseURL: FW_BASE_URL });
export const CHAT_MODEL_NAME = CHAT_MODEL;

export function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter(word => word.length > 0);
}

export function computeBM25(documents, queryTerms) {
  const k1 = 1.5;
  const b = 0.75;
  const N = documents.length;
  if (N === 0) return [];

  const docTokens = documents.map(doc => tokenize(doc.payload?.pageContent || doc.payload?.content || doc.pageContent || doc.content || ""));
  const docLengths = docTokens.map(tokens => tokens.length);
  const avgdl = docLengths.reduce((sum, len) => sum + len, 0) / N || 1;

  const df = {};
  for (const term of queryTerms) {
    df[term] = 0;
    for (const tokens of docTokens) {
      if (tokens.includes(term)) {
        df[term]++;
      }
    }
  }

  const idf = {};
  for (const term of queryTerms) {
    const n = df[term];
    idf[term] = Math.log(1 + (N - n + 0.5) / (n + 0.5));
  }

  const scores = [];
  for (let i = 0; i < N; i++) {
    const tokens = docTokens[i];
    const length = docLengths[i];

    const tf = {};
    for (const term of queryTerms) tf[term] = 0;
    for (const token of tokens) {
      if (token in tf) tf[token]++;
    }

    let score = 0.0;
    for (const term of queryTerms) {
      const termTf = tf[term];
      if (termTf > 0) {
        const idfVal = idf[term];
        const numerator = termTf * (k1 + 1);
        const denominator = termTf + k1 * (1 - b + b * (length / avgdl));
        score += idfVal * (numerator / denominator);
      }
    }
    scores.push(score);
  }
  return scores;
}

export function normalizeScores(scores) {
  if (scores.length === 0) return [];
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const range = max - min;
  if (range === 0) return scores.map(() => 1.0);
  return scores.map(s => (s - min) / range);
}

export async function rerankDocuments(query, documents, topN = 10) {
  if (!documents || documents.length === 0) return [];
  if (documents.length === 1) return documents.slice(0, topN);

  try {
    const apiKey = getApiKey();
    const RERANK_URL = "https://api.fireworks.ai/inference/v1/rerank";
    const docTexts = documents.map(doc => doc.pageContent || doc.content || "");

    const response = await axios.post(
      RERANK_URL,
      {
        model: "fireworks/qwen3-reranker-8b",
        query,
        documents: docTexts,
        top_n: topN,
      },
      {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      }
    );

    const rerankedData = response.data?.data || [];
    const rerankedDocs = rerankedData.map(item => {
      const originalDoc = documents[item.index];
      return {
        ...originalDoc,
        relevanceScore: item.relevance_score,
      };
    });

    console.log(`🎯 [Reranker] Successfully reranked ${documents.length} candidates down to ${rerankedDocs.length}.`);
    return rerankedDocs;
  } catch (error) {
    console.error("⚠️ [Reranker] Reranking failed:", error.response?.data || error.message);
    return documents.slice(0, topN);
  }
}

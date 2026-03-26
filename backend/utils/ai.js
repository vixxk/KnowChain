import OpenAI from "openai";
import { OpenAIEmbeddings } from "@langchain/openai";

const getApiKey = () => process.env.FIREWORKS_API_KEY;
const FW_BASE_URL = "https://api.fireworks.ai/inference/v1";
const CHAT_MODEL = "accounts/fireworks/models/mixtral-8x22b-instruct";
const EMBED_MODEL = "nomic-ai/nomic-embed-text-v1.5";

export async function executeWithRetry(fn, maxRetries = 3, initialDelay = 2000) {
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

export async function rewriteQuery(originalQuery) {
  const fwClient = new OpenAI({ apiKey: getApiKey(), baseURL: FW_BASE_URL });
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

export const getEmbeddings = () => new OpenAIEmbeddings({
  model: EMBED_MODEL,
  apiKey: getApiKey(),
  configuration: { baseURL: FW_BASE_URL },
});

export const getFwClient = () => new OpenAI({ apiKey: getApiKey(), baseURL: FW_BASE_URL });
export const CHAT_MODEL_NAME = CHAT_MODEL;

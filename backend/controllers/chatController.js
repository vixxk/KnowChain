import { OpenAIEmbeddings } from "@langchain/openai";
import { QdrantVectorStore } from "@langchain/qdrant";
import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config({ path: "../.env" });

// In-memory conversation history
const conversationHistory = {};
const SESSION_LIFETIME = 30 * 60 * 1000; // 30 minutes

function saveConversation(sessionId, role, content) {
  if (!conversationHistory[sessionId]) {
    conversationHistory[sessionId] = { messages: [], timer: null };
  }

  conversationHistory[sessionId].messages.push({ role, content });

  if (conversationHistory[sessionId].timer) clearTimeout(conversationHistory[sessionId].timer);
  conversationHistory[sessionId].timer = setTimeout(() => {
    delete conversationHistory[sessionId];
    console.log(`🗑️ Session ${sessionId} expired`);
  }, SESSION_LIFETIME);
}

async function chatWithCollection(sessionId, query, collectionName) {
  const embeddings = new OpenAIEmbeddings({
    model: "text-embedding-004",
    apiKey: process.env.GEMINI_API_KEY,
    configuration: { baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/" },
  });

  const vectorStore = await QdrantVectorStore.fromExistingCollection(embeddings, {
    url: process.env.QDRANT_URL,
    collectionName,
  });

  const retriever = vectorStore.asRetriever({ k: 3 });
  const relevantDocs = await retriever.invoke(query);

  const contextText = relevantDocs
    .map(doc => `Source: ${doc.metadata?.source || "unknown"}\n${doc.pageContent}\n`)
    .join("\n\n");

  const previousMessages = conversationHistory[sessionId]?.messages || [];

  const SYSTEM_PROMPT = `
You are an AI assistant. Answer using the provided context.
Explain answer in a good and easy way.
((Only for website URLs))Try stating topic name or section of the sorce for your reply.
(Only for pdf files)Include sources if possible, page number, line, or topic. (Never mention the file name in your response.)
Context: ${contextText}

Previous conversation:
${previousMessages.map(m => `${m.role}: ${m.content}`).join("\n")}
`;

  const openai = new OpenAI({
    apiKey: process.env.GEMINI_API_KEY,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
  });

  const response = await openai.chat.completions.create({
    model: "gemini-2.0-flash",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: query },
    ],
  });

  const answer = response.choices[0].message.content;

  saveConversation(sessionId, "user", query);
  saveConversation(sessionId, "assistant", answer);

  return answer;
}

export async function webChatController(req, res) {
  try {
    const { sessionId, query } = req.body;
    if (!sessionId) return res.status(400).json({ error: "sessionId is required" });

    const answer = await chatWithCollection(sessionId, query, "website_docs");
    res.json({ answer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
}

export async function pdfChatController(req, res) {
  try {
    const { sessionId, query, collectionName } = req.body;
    if (!sessionId) return res.status(400).json({ error: "sessionId is required" });

    const answer = await chatWithCollection(sessionId, query, collectionName || "pdf");
    res.json({ answer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
}

export async function textChatController(req, res) {
  try {
    const { sessionId, query, collectionName } = req.body;
    if (!sessionId) return res.status(400).json({ error: "sessionId is required" });

    const answer = await chatWithCollection(sessionId, query, collectionName || "text");
    res.json({ answer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
}

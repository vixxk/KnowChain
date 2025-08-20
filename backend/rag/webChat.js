import { OpenAIEmbeddings } from "@langchain/openai";
import { QdrantVectorStore } from "@langchain/qdrant";
import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config({ path: "../.env" });

async function webChat(query) {
  const embeddings = new OpenAIEmbeddings({
    model: "text-embedding-004",
    apiKey: process.env.GEMINI_API_KEY,
    configuration: {
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    },
  });

  const vectorStore = await QdrantVectorStore.fromExistingCollection(
    embeddings,
    {
      url: process.env.QDRANT_URL,
      collectionName: "website_docs",
    }
  );

  const vectorSearcher = vectorStore.asRetriever({ k: 3 });
  const relevantChunks = await vectorSearcher.invoke(query);

  const contextText = relevantChunks
    .map(
      (chunk, i) =>
        `Source: ${chunk.metadata?.source || "unknown"}\n${chunk.pageContent}\n`
    )
    .join("\n\n");

  const SYSTEM_PROMPT = `
    You are an AI assistant designed to answer user queries based on the provided context.  
    The context comes from a website data, along with source or references,etc.  

    Guidelines:
    1. Only answer if the context contains a close or exact match to the query.  
    2. Always include the relevancy and the page number (or source) in your answer.  
    3. If the required context is not available, politely respond: 
   "The context for this query is not available in the provided documents."  

    Context:${contextText}
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

  console.log("🤖 Answer:", response.choices[0].message.content);
}

webChat("How do I install Docker on Linux?");

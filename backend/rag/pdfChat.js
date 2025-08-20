import { OpenAIEmbeddings } from "@langchain/openai";
import { QdrantVectorStore } from "@langchain/qdrant";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config({ path: "../.env" });

async function pdfChat(params) {
  const userQuery = "How to make http request in nodejs";

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
      collectionName: "pdf",
    }
  );

  const vectorSearcher = vectorStore.asRetriever({
    k: 3,
  });

  const relevantChunks = await vectorSearcher.invoke(userQuery);

  const SYSTEM_PROMPT = `
    You are an AI assistant who helps resolving user query based on the 
    context available to you from a PDF file with the content and page number.
    Only answer based on the available context from file only.

    If a very close context is availaible to the query then answer it
    but make sure to give the relevancy and page number.If the context is not
    availaible then answer ploitely that the context is not availaible.

    Context:${JSON.stringify(relevantChunks)}
`;

  const openai = new OpenAI({
    apiKey: process.env.GEMINI_API_KEY,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
  });

  const response = await openai.chat.completions.create({
    model: "gemini-2.0-flash",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: userQuery,
      },
    ],
  });

  console.log(response.choices[0].message.content);
}

pdfChat();
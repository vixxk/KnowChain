import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { OpenAIEmbeddings } from "@langchain/openai";
import { QdrantVectorStore } from "@langchain/qdrant";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import dotenv from "dotenv";
dotenv.config({ path: "../.env" });

function chunkArray(array, size) {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

async function pdfWorker() {

  const pdfFilePath = "./sample.pdf";
  const loader = new PDFLoader(pdfFilePath);
  const rawDocs = await loader.load();

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,    
    chunkOverlap: 200,  
  });

  const docs = await splitter.splitDocuments(rawDocs);
  console.log(`🔹 PDF split into ${docs.length} chunks`);

  const embeddings = new OpenAIEmbeddings({
    model: "text-embedding-004",
    apiKey: process.env.GEMINI_API_KEY,   
    configuration: {
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    },
  });

  // Gemini allows max 100 splits per batch 
  const batches = chunkArray(docs, 100);
  for (const [i, batch] of batches.entries()) {
    await QdrantVectorStore.fromDocuments(
      batch,
      embeddings,
      {
        url: process.env.QDRANT_URL,
        collectionName: "pdf",
      }
    );
    console.log(`✅ Indexed batch ${i + 1} (${batch.length} chunks)`);
  }

  console.log("🎉 All indexing done!");
}

pdfWorker();

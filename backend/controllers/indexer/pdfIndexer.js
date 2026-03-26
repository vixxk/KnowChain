import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { getEmbeddings } from "../../utils/ai.js";
import { chunkArray, runIncrementalIndexing } from "./base.js";

export async function pdfIndexer(pdfFilePath, collectionName) {
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
  const batches = chunkArray(docs, 100);
  await runIncrementalIndexing(batches, embeddings, collectionName);
}

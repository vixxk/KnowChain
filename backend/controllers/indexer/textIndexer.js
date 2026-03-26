import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { getEmbeddings } from "../../utils/ai.js";
import { chunkArray, runIncrementalIndexing } from "./base.js";

export async function textIndexer(textContent, collectionName) {
  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 });
  const docs = (await splitter.splitText(textContent)).map(c => ({ 
    pageContent: `search_document: ${c}`,
    metadata: { source: "user-uploaded" }
  }));

  const embeddings = getEmbeddings();
  const batches = chunkArray(docs, 100);
  await runIncrementalIndexing(batches, embeddings, collectionName);
}

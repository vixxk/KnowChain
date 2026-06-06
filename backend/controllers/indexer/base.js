import { QdrantVectorStore } from "@langchain/qdrant";
import { getEmbeddings, executeWithRetry } from "../../utils/ai.js";
import { throttleRequest, forceBackoff } from "../../utils/throttle.js";

export function chunkArray(array, size) {
  const result = [];
  for (let i = 0; i < array.length; i += size) result.push(array.slice(i, i + size));
  return result;
}

export async function runIncrementalIndexing(batches, embeddings, collectionName, qdrantUrl = null) {
  let vectorStore;
  const effectiveQdrantUrl = (qdrantUrl && qdrantUrl.trim()) ? qdrantUrl.trim() : null;
  let url = effectiveQdrantUrl || process.env.QDRANT_URL;
  if (url && url.endsWith("/")) url = url.slice(0, -1);
  for (let i = 0; i < batches.length; i++) {
    await throttleRequest();
    await executeWithRetry(async () => {
      if (i === 0) {
        vectorStore = await QdrantVectorStore.fromDocuments(batches[i], embeddings, {
          url,
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

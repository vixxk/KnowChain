import { QdrantVectorStore } from "@langchain/qdrant";
import { executeWithRetry, rewriteQuery, getEmbeddings, getFwClient, CHAT_MODEL_NAME } from "../../utils/ai.js";

async function retrieveFromCollection(collectionName, query, embeddings) {
  try {
    const vectorStore = await QdrantVectorStore.fromExistingCollection(embeddings, {
      url: process.env.QDRANT_URL,
      collectionName,
      apiKey: process.env.QDRANT_API_KEY,
      clientConfig: { checkCompatibility: false },
    });

    const retriever = vectorStore.asRetriever({ k: 5 });
    const docs = await retriever.invoke(`search_query: ${query}`);
    
    return docs.map(doc => ({ ...doc, metadata: { ...doc.metadata, collectionName } }));
  } catch (error) {
    console.error(`⚠️ [RAG] Failed to retrieve from ${collectionName}: ${error.message}`);
    return [];
  }
}

export async function unifiedChatController(req, res) {
  try {
    const { query, collectionName, collectionNames, rewrite, history = [] } = req.body;
    const collections = collectionNames || (collectionName ? [collectionName] : []);

    if (collections.length === 0) return res.status(400).json({ error: "❌ No source selected. Select one from Neural Feed." });
    if (!query) return res.status(400).json({ error: "Query is required." });

    const currentQuery = rewrite ? await rewriteQuery(query) : query;
    const embeddings = getEmbeddings();

    const allDocsArrays = await Promise.all(collections.map(col => retrieveFromCollection(col, currentQuery, embeddings)));
    const allDocs = allDocsArrays.flat();

    const contextText = allDocs.map((doc, i) => {
      const url = doc.metadata?.source || doc.metadata?.url || 'Unknown';
      return `--- SOURCE_URL: ${url} ---\n${doc.pageContent}`;
    }).join("\n\n");

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

    const conversation = history.slice(-8).map(m => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: m.text
    }));

    const fwClient = getFwClient();
    const SYSTEM_PROMPT = `You are KnowChain AI v2.0, a professional intelligence assistant.

COGNITIVE FORMATTING:
1. **Citations**: ONLY use [Source X] when you are including an image. 
2. **Images**: ONLY provide images if explicitly requested. Use [![Description](https://picsum.photos/seed/<keyword>/800/400)](<SOURCE_URL>). Replace <keyword> with relevant word and <SOURCE_URL> with the exact URL from the context section.
3. **References**: At the very end of your response, list all sources used for images as: [Source X]: SOURCE_URL.
4. **Highlights**: Use **bold** for key answers.
5. **Sections**: Use ### HEADERS for phases.

DOCUMENT CONTENT:
${contextText}`;

    const response = await executeWithRetry(() => fwClient.chat.completions.create({
      model: CHAT_MODEL_NAME,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...conversation,
        { role: "user", content: query }
      ],
      temperature: 0.3, max_tokens: 2048,
    }));

    res.json({
      answer: response.choices[0].message.content,
      rewrittenQuery: rewrite ? currentQuery : null,
      sourcesQueried: collections.length,
      chunksFound: allDocs.length,
      sources: uniqueSources
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

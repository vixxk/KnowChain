import { QdrantClient } from "@qdrant/js-client-rest";
import { executeWithRetry, rewriteQuery, getEmbeddings, getFwClient, CHAT_MODEL_NAME, tokenize, computeBM25, normalizeScores, rerankDocuments } from "../../utils/ai.js";
import { cleanAiResponse } from "../../utils/promptRefiner.js";

async function retrieveFromCollection(collectionName, query, embeddings, qdrantUrl = null) {
  try {
    // Guard against empty/whitespace strings from privacy mode
    const effectiveQdrantUrl = (qdrantUrl && qdrantUrl.trim()) ? qdrantUrl.trim() : null;
    let url = effectiveQdrantUrl || process.env.QDRANT_URL;
    if (url && url.endsWith("/")) url = url.slice(0, -1);
    
    const client = new QdrantClient({
      url,
      apiKey: process.env.QDRANT_API_KEY,
      checkCompatibility: false,
      timeout: 15000,
    });

    // Nomic v1.5 uses asymmetric prefixes: search_query for queries, search_document for docs
    const searchQuery = `search_query: ${query}`;
    const queryVector = await embeddings.embedQuery(searchQuery);

    try {
      // Scroll all chunks with payload and vectors
      const scrollResult = await client.scroll(collectionName, {
        limit: 1000,
        with_payload: true,
        with_vector: true
      });
      const points = scrollResult.points || [];

      if (points.length === 0) return [];

      // Calculate vector scores using dot product (since embedding is unit-normalized)
      const vectorScores = points.map(point => {
        let docVector = null;
        if (Array.isArray(point.vector)) {
          docVector = point.vector;
        } else if (point.vector && typeof point.vector === 'object') {
          const keys = Object.keys(point.vector);
          if (keys.length > 0) docVector = point.vector[keys[0]];
        }
        
        let score = 0.0;
        if (docVector && queryVector) {
          for (let i = 0; i < queryVector.length; i++) {
            score += queryVector[i] * (docVector[i] || 0.0);
          }
        }
        return score;
      });

      // Calculate BM25 scores
      const queryTerms = tokenize(query);
      const bm25Scores = computeBM25(points, queryTerms);

      // Normalize scores
      const normVectorScores = normalizeScores(vectorScores);
      const normBm25Scores = normalizeScores(bm25Scores);

      // Combine scores (0.7 vector, 0.3 BM25)
      const scoredPoints = points.map((point, index) => {
        const hybridScore = 0.7 * normVectorScores[index] + 0.3 * normBm25Scores[index];
        return { point, hybridScore };
      });

      // Sort and take top 25 candidates for reranking
      scoredPoints.sort((a, b) => b.hybridScore - a.hybridScore);
      const candidates = scoredPoints.slice(0, 25).map(item => ({
        pageContent: (item.point.payload.pageContent || item.point.payload.content || "").replace(/^search_document:\s*/i, ""),
        metadata: { ...item.point.payload.metadata, collectionName }
      }));

      // Rerank candidates using Fireworks AI Reranker down to top 10
      const rerankedDocs = await rerankDocuments(query, candidates, 10);
      console.log(`🧠 [HybridSearch] Retrieved ${points.length} chunks. Reranked top candidates down to ${rerankedDocs.length} results.`);
      return rerankedDocs;
    } catch (scrollError) {
      console.warn(`⚠️ [Hybrid] Scroll failed, falling back to pure vector search:`, scrollError.message);
      const searchResults = await client.search(collectionName, {
        vector: queryVector,
        limit: 10,
        with_payload: true,
      });
      
      return searchResults.map(res => ({
        pageContent: (res.payload.pageContent || res.payload.content || "").replace(/^search_document:\s*/i, ""),
        metadata: { ...res.payload.metadata, collectionName }
      }));
    }
  } catch (error) {
    console.error(`⚠️ [Qdrant] Retrieval failed for ${collectionName}:`, error.message);
    return [];
  }
}

export async function unifiedChatController(req, res) {
  try {
    const { query, collectionName, collectionNames, rewrite, history = [], qdrantUrl } = req.body;
    const collections = collectionNames || (collectionName ? [collectionName] : []);

    if (collections.length === 0) return res.status(400).json({ error: "❌ No source selected." });
    if (!query) return res.status(400).json({ error: "Query is required." });

    const currentQuery = rewrite ? await rewriteQuery(query) : query;
    const embeddings = getEmbeddings();

    const allDocsArrays = await Promise.all(collections.map(col => retrieveFromCollection(col, currentQuery, embeddings, qdrantUrl)));
    const allDocs = allDocsArrays.flat();

    // Graceful fallback when no chunks are found
    if (allDocs.length === 0) {
      return res.json({
        answer: "I couldn't find any relevant content in the uploaded documents for this query. Please make sure your source is properly synced in the Neural Feed and try rephrasing your question.",
        rewrittenQuery: rewrite ? currentQuery : null,
        chunksFound: 0,
      });
    }

    const contextText = allDocs.map((doc, i) => {
      return `--- Section ${i + 1} ---\n${doc.pageContent}`;
    }).join("\n\n");

    const conversation = history.slice(-8).map(m => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: m.text
    }));

    const fwClient = getFwClient();
    // /no_think instructs Qwen3 to skip internal reasoning monologue
    const SYSTEM_PROMPT = `/no_think
You are KnowChain AI v2.0, a precise document-grounded assistant.

INSTRUCTIONS:
- Synthesize facts across different sections of the DOCUMENT CONTENT cohesively to formulate a complete answer.
- Answer the query directly and concisely. Do not use conversational introductions or filler preambles (e.g., "Based on the provided documents..."). Start directly with the answer.
- Rely ONLY on the clear facts stated in the DOCUMENT CONTENT. Do not extrapolate, assume, or fabricate details.
- Use **bold** for key names, exact terms, and critical metrics/numbers.
- Use markdown lists or headers (###) to organize structured or multi-part answers.
- If the answer is not found in or cannot be directly inferred from the DOCUMENT CONTENT, reply exactly with: "This information is not available in the provided documents."

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

    let answer = response.choices[0].message.content;
    answer = cleanAiResponse(answer);

    res.json({
      answer,
      rewrittenQuery: rewrite ? currentQuery : null,
      chunksFound: allDocs.length,
    });

  } catch (error) {
    console.error(`[ChatError] ${error.message}`);
    res.status(500).json({ error: "Something went wrong processing your query. Please try again." });
  }
}

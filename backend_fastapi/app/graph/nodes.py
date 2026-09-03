import re
from typing import Dict, Any, List
from qdrant_client import QdrantClient
from app.config import settings
from app.graph.state import GraphState
from app.utils.ai import (
    get_embeddings,
    get_fw_client,
    execute_with_retry,
    rewrite_query,
    tokenize,
    compute_bm25,
    normalize_scores,
    rerank_documents,
    CHAT_MODEL_NAME,
)
from app.utils.prompt_refiner import clean_ai_response

async def retrieve_from_collection(
    collection_name: str,
    query: str,
    embeddings: Any,
    qdrant_url: str = None
) -> List[Dict[str, Any]]:
    try:
        effective_qdrant_url = (qdrant_url and qdrant_url.strip()) if qdrant_url else None
        url = effective_qdrant_url or settings.QDRANT_URL
        if url and url.endswith("/"):
            url = url[:-1]

        client = QdrantClient(
            url=url,
            api_key=settings.QDRANT_API_KEY,
            timeout=15.0
        )

        search_query = f"search_query: {query}"
        query_vector = await embeddings.aembed_query(search_query)

        try:
            scroll_res = client.scroll(
                collection_name=collection_name,
                limit=1000,
                with_payload=True,
                with_vectors=True
            )
            points, _ = scroll_res

            if not points:
                return []

            vector_scores = []
            for point in points:
                doc_vector = None
                if isinstance(point.vector, list):
                    doc_vector = point.vector
                elif isinstance(point.vector, dict):
                    keys = list(point.vector.keys())
                    if keys:
                        doc_vector = point.vector[keys[0]]

                score = 0.0
                if doc_vector and query_vector:
                    score = sum(q * (doc_vector[i] if i < len(doc_vector) else 0.0) for i, q in enumerate(query_vector))
                vector_scores.append(score)

            query_terms = tokenize(query)
            bm25_scores = compute_bm25(points, query_terms)

            norm_vec_scores = normalizeScores_helper(vector_scores)
            norm_bm25_scores = normalizeScores_helper(bm25_scores)

            scored_points = []
            for idx, point in enumerate(points):
                hybrid_score = 0.7 * norm_vec_scores[idx] + 0.3 * norm_bm25_scores[idx]
                scored_points.append((point, hybrid_score))

            scored_points.sort(key=lambda x: x[1], reverse=True)
            top_candidates = scored_points[:25]

            candidates = []
            for point, _ in top_candidates:
                payload = point.payload or {}
                raw_content = payload.get("pageContent") or payload.get("content") or ""
                content = re.sub(r'^search_document:\s*', '', raw_content, flags=re.IGNORECASE)
                metadata = dict(payload.get("metadata") or {})
                metadata["collectionName"] = collection_name
                candidates.append({
                    "pageContent": content,
                    "metadata": metadata
                })

            reranked_docs = await rerank_documents(query, candidates, top_n=10)
            print(f"🧠 [HybridSearch] Retrieved {len(points)} chunks. Reranked down to {len(reranked_docs)} results.")
            return reranked_docs

        except Exception as scroll_error:
            print(f"⚠️ [Hybrid] Scroll failed, falling back to vector search: {scroll_error}")
            search_results = client.search(
                collection_name=collection_name,
                query_vector=query_vector,
                limit=10,
                with_payload=True
            )
            fallback_docs = []
            for res in search_results:
                payload = res.payload or {}
                raw_content = payload.get("pageContent") or payload.get("content") or ""
                content = re.sub(r'^search_document:\s*', '', raw_content, flags=re.IGNORECASE)
                metadata = dict(payload.get("metadata") or {})
                metadata["collectionName"] = collection_name
                fallback_docs.append({
                    "pageContent": content,
                    "metadata": metadata
                })
            return fallback_docs

    except Exception as error:
        print(f"⚠️ [Qdrant] Retrieval failed for {collection_name}: {error}")
        return []

def normalizeScores_helper(scores: List[float]) -> List[float]:
    return normalize_scores(scores)

async def rewrite_node(state: GraphState) -> Dict[str, Any]:
    query = state.get("query", "")
    should_rewrite = state.get("rewrite", False)

    if should_rewrite and query:
        rewritten = await rewrite_query(query)
    else:
        rewritten = query

    return {"rewritten_query": rewritten}

async def retrieval_node(state: GraphState) -> Dict[str, Any]:
    current_query = state.get("rewritten_query") or state.get("query", "")
    collections = state.get("collection_names") or []
    if not collections and state.get("collection_name"):
        collections = [state["collection_name"]]

    qdrant_url = state.get("qdrant_url")
    embeddings = get_embeddings()

    all_docs = []
    for col in collections:
        docs = await retrieve_from_collection(col, current_query, embeddings, qdrant_url)
        all_docs.extend(docs)

    return {
        "retrieved_docs": all_docs,
        "chunks_found": len(all_docs)
    }

async def generate_node(state: GraphState) -> Dict[str, Any]:
    all_docs = state.get("retrieved_docs", [])
    query = state.get("query", "")
    rewrite = state.get("rewrite", False)
    current_query = state.get("rewritten_query") or query
    history = state.get("history", [])

    if not all_docs:
        return {
            "answer": "I couldn't find any relevant content in the uploaded documents for this query. Please make sure your source is properly synced in the Neural Feed and try rephrasing your question.",
            "chunks_found": 0
        }

    sections = []
    for i, doc in enumerate(all_docs):
        sections.append(f"--- Section {i + 1} ---\n{doc.get('pageContent', '')}")
    context_text = "\n\n".join(sections)

    conversation = []
    for m in history[-8:]:
        role = "user" if m.get("sender") == "user" else "assistant"
        conversation.append({"role": role, "content": m.get("text", "")})

    system_prompt = f"""/no_think
You are KnowChain AI v2.0, a precise document-grounded assistant.

INSTRUCTIONS:
- ANSWER RELEVANCY: Target the user's specific question directly, concisely, and completely. Focus strictly on the exact entities and concepts requested in the query without fluff or unrelated tangents.
- Synthesize facts across different sections of the DOCUMENT CONTENT cohesively to formulate a complete answer.
- Answer the query directly and concisely. Do not use conversational introductions or filler preambles (e.g., "Based on the provided documents..."). Start directly with the answer.
- STRICT GROUNDEDNESS REQUIREMENT: Base every sentence and claim EXCLUSIVELY on facts directly contained in the DOCUMENT CONTENT. Do not extrapolate, assume, or add outside knowledge under any circumstance.
- Use **bold** for key names, exact terms, and critical metrics/numbers.
- Use markdown lists or headers (###) to organize structured or multi-part answers.
- If the answer is not found in or cannot be directly inferred from the DOCUMENT CONTENT, reply exactly with: "This information is not available in the provided documents."

DOCUMENT CONTENT:
{context_text}"""

    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(conversation)
    messages.append({"role": "user", "content": query})

    fw_client = get_fw_client()

    async def call_llm():
        return await fw_client.chat.completions.create(
            model=CHAT_MODEL_NAME,
            messages=messages,
            temperature=0.0,
            max_tokens=2048
        )

    response = await execute_with_retry(call_llm)
    raw_answer = response.choices[0].message.content or ""
    cleaned_answer = clean_ai_response(raw_answer)

    return {
        "answer": cleaned_answer,
        "chunks_found": len(all_docs)
    }

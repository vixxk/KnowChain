import asyncio
import math
import re
from typing import List, Dict, Any, Callable
import httpx
from openai import AsyncOpenAI
from app.config import settings
from app.utils.prompt_refiner import refine_query

def get_api_key() -> str:
    return settings.FIREWORKS_API_KEY

def get_fw_client() -> AsyncOpenAI:
    return AsyncOpenAI(
        api_key=get_api_key(),
        base_url=settings.FW_BASE_URL
    )

class FireworksEmbeddings:
    def __init__(self, model: str = None, api_key: str = None, base_url: str = None):
        self.model = model or settings.EMBED_MODEL
        self.client = AsyncOpenAI(
            api_key=api_key or get_api_key(),
            base_url=base_url or settings.FW_BASE_URL
        )

    async def aembed_documents(self, texts: List[str]) -> List[List[float]]:
        if not texts:
            return []
        res = await self.client.embeddings.create(
            model=self.model,
            input=texts
        )
        return [data.embedding for data in res.data]

    async def aembed_query(self, text: str) -> List[float]:
        res = await self.client.embeddings.create(
            model=self.model,
            input=[text]
        )
        return res.data[0].embedding

def get_embeddings() -> FireworksEmbeddings:
    return FireworksEmbeddings()

CHAT_MODEL_NAME = settings.CHAT_MODEL

async def execute_with_retry(fn: Callable, max_retries: int = 3, initial_delay: float = 2.0) -> Any:
    attempt = 0
    while attempt < max_retries:
        try:
            return await fn()
        except Exception as error:
            attempt += 1
            status_code = getattr(error, 'status_code', getattr(error, 'status', None))
            if (status_code == 429 or 'ECONNRESET' in str(error) or 'ETIMEDOUT' in str(error)) and attempt < max_retries:
                delay = initial_delay * (2 ** (attempt - 1))
                print(f"🚨 API error ({status_code or error}). Retrying in {int(delay * 1000)}ms... ({attempt}/{max_retries})")
                await asyncio.sleep(delay)
                continue
            raise error

async def rewrite_query(original_query: str) -> str:
    fw_client = get_fw_client()
    return await refine_query(original_query, fw_client, CHAT_MODEL_NAME)

def tokenize(text: str) -> List[str]:
    text_lower = text.lower()
    clean_text = re.sub(r'[^\w\s]', ' ', text_lower)
    tokens = clean_text.split()
    return [word for word in tokens if len(word) > 0]

def compute_bm25(documents: List[Any], query_terms: List[str]) -> List[float]:
    k1 = 1.5
    b = 0.75
    N = len(documents)
    if N == 0:
        return []

    doc_tokens = []
    for doc in documents:
        content = ""
        if isinstance(doc, dict):
            payload = doc.get("payload", doc)
            content = payload.get("pageContent") or payload.get("content") or doc.get("pageContent") or doc.get("content") or ""
        elif hasattr(doc, "payload"):
            payload = doc.payload or {}
            content = payload.get("pageContent") or payload.get("content") or getattr(doc, "pageContent", "")
        elif hasattr(doc, "pageContent"):
            content = doc.pageContent or ""
        doc_tokens.append(tokenize(content))

    doc_lengths = [len(tokens) for tokens in doc_tokens]
    avgdl = (sum(doc_lengths) / N) if N > 0 else 1.0
    if avgdl == 0:
        avgdl = 1.0

    df: Dict[str, int] = {}
    for term in query_terms:
        df[term] = 0
        for tokens in doc_tokens:
            if term in tokens:
                df[term] += 1

    idf: Dict[str, float] = {}
    for term in query_terms:
        n = df[term]
        idf[term] = math.log(1 + (N - n + 0.5) / (n + 0.5))

    scores = []
    for i in range(N):
        tokens = doc_tokens[i]
        length = doc_lengths[i]

        tf: Dict[str, int] = {term: 0 for term in query_terms}
        for token in tokens:
            if token in tf:
                tf[token] += 1

        score = 0.0
        for term in query_terms:
            term_tf = tf[term]
            if term_tf > 0:
                idf_val = idf[term]
                numerator = term_tf * (k1 + 1)
                denominator = term_tf + k1 * (1 - b + b * (length / avgdl))
                score += idf_val * (numerator / denominator)
        scores.append(score)

    return scores

def normalize_scores(scores: List[float]) -> List[float]:
    if not scores:
        return []
    min_score = min(scores)
    max_score = max(scores)
    score_range = max_score - min_score
    if score_range == 0:
        return [1.0 for _ in scores]
    return [(s - min_score) / score_range for s in scores]

async def rerank_documents(query: str, documents: List[Dict[str, Any]], top_n: int = 10) -> List[Dict[str, Any]]:
    if not documents:
        return []
    if len(documents) == 1:
        return documents[:top_n]

    try:
        api_key = get_api_key()
        rerank_url = "https://api.fireworks.ai/inference/v1/rerank"
        doc_texts = [doc.get("pageContent") or doc.get("content") or "" for doc in documents]

        async with httpx.AsyncClient() as client:
            response = await client.post(
                rerank_url,
                json={
                    "model": "fireworks/qwen3-reranker-8b",
                    "query": query,
                    "documents": doc_texts,
                    "top_n": top_n,
                },
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                timeout=10.0,
            )

        if response.status_code == 200:
            data = response.json()
            reranked_data = data.get("data", [])
            reranked_docs = []
            for item in reranked_data:
                idx = item.get("index")
                if idx is not None and idx < len(documents):
                    original_doc = dict(documents[idx])
                    original_doc["relevanceScore"] = item.get("relevance_score")
                    reranked_docs.append(original_doc)

            print(f"🎯 [Reranker] Successfully reranked {len(documents)} candidates down to {len(reranked_docs)}.")
            return reranked_docs
        else:
            print(f"⚠️ [Reranker] Reranking failed status {response.status_code}: {response.text}")
            return documents[:top_n]

    except Exception as error:
        print(f"⚠️ [Reranker] Reranking failed: {error}")
        return documents[:top_n]

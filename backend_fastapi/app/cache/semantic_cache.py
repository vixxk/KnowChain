import json
import logging
from typing import Optional, List, Dict, Any
from app.config import settings

logger = logging.getLogger("knowchain.cache")

class SemanticCacheManager:
    """
    Semantic Caching Manager powered by RedisVL and a local Hugging Face Vectorizer.
    
    Features:
    - Offline local vectorization (default: sentence-transformers/all-MiniLM-L6-v2)
    - Collection-scoped semantic matching to avoid cross-document contamination
    - Configurable similarity distance threshold and TTL
    - Graceful degradation: chat pipeline continues uninterrupted if Redis/RediSearch is offline
    """

    def __init__(self):
        self._cache = None
        self._vectorizer = None
        self._is_ready = False
        self._initialization_attempted = False
        self._unavailable_reason: Optional[str] = None

    def _init_cache(self) -> bool:
        if self._initialization_attempted:
            return self._is_ready

        self._initialization_attempted = True

        if not settings.SEMANTIC_CACHE_ENABLED:
            self._unavailable_reason = "Semantic cache disabled in config (SEMANTIC_CACHE_ENABLED=False)"
            logger.info(f"[SemanticCache] {self._unavailable_reason}")
            return False

        try:
            from redisvl.extensions.llmcache import SemanticCache
            from redisvl.utils.vectorize import HFTextVectorizer
        except ImportError as e:
            self._unavailable_reason = f"Missing required dependencies (redisvl / sentence-transformers): {e}"
            logger.warning(f"[SemanticCache] {self._unavailable_reason}")
            return False

        try:
            logger.info(f"[SemanticCache] Loading Hugging Face vectorizer: {settings.SEMANTIC_CACHE_MODEL}...")
            self._vectorizer = HFTextVectorizer(model=settings.SEMANTIC_CACHE_MODEL)

            logger.info(f"[SemanticCache] Connecting to Redis at {settings.REDIS_URL}...")
            self._cache = SemanticCache(
                name="knowchain_semantic_cache",
                redis_url=settings.REDIS_URL,
                distance_threshold=settings.SEMANTIC_CACHE_THRESHOLD,
                ttl=settings.SEMANTIC_CACHE_TTL,
                vectorizer=self._vectorizer
            )
            self._is_ready = True
            logger.info("✅ [SemanticCache] Successfully initialized RedisVL Semantic Cache with HF vectorizer.")
            return True
        except Exception as e:
            err_msg = str(e)
            if "unknown command 'ft." in err_msg.lower():
                self._unavailable_reason = (
                    "Redis server is running without the RediSearch module. "
                    "Start Redis Stack (e.g. `docker run -d -p 6379:6379 redis/redis-stack:latest`) to enable vector caching."
                )
            else:
                self._unavailable_reason = f"Redis connection error: {err_msg}"
            
            logger.warning(f"[SemanticCache] Disabled: {self._unavailable_reason}")
            self._is_ready = False
            return False

    def _format_prompt(self, query: str, collections: Optional[List[str]] = None) -> str:
        """
        Scope prompt by document collections to prevent cross-collection contamination.
        """
        clean_query = query.strip()
        if collections:
            sorted_cols = ",".join(sorted(set(collections)))
            return f"[{sorted_cols}] {clean_query}"
        return clean_query

    def check(self, query: str, collections: Optional[List[str]] = None) -> Optional[Dict[str, Any]]:
        """
        Check if semantically similar prompt exists in cache.
        Returns dict with cached answer and metadata, or None if miss / cache unavailable.
        """
        if not self._init_cache():
            return None

        formatted_prompt = self._format_prompt(query, collections)

        try:
            results = self._cache.check(prompt=formatted_prompt, num_results=1)
            if results and len(results) > 0:
                hit = results[0]
                response_text = hit.get("response", "")
                metadata_raw = hit.get("metadata")
                metadata = {}
                if metadata_raw:
                    if isinstance(metadata_raw, str):
                        try:
                            metadata = json.loads(metadata_raw)
                        except Exception:
                            metadata = {}
                    elif isinstance(metadata_raw, dict):
                        metadata = metadata_raw

                logger.info(f"⚡ [SemanticCache] HIT for query: '{query[:40]}...' (vector distance match)")
                return {
                    "answer": response_text,
                    "sources": metadata.get("sources", []),
                    "chunks_found": metadata.get("chunks_found", 0),
                    "cached": True
                }
            return None
        except Exception as e:
            logger.debug(f"[SemanticCache] Error during cache lookup: {e}")
            return None

    def store(
        self,
        query: str,
        answer: str,
        collections: Optional[List[str]] = None,
        sources: Optional[List[Any]] = None,
        chunks_found: int = 0
    ) -> bool:
        """
        Store a query and its generated answer in the semantic cache.
        """
        if not self._init_cache():
            return False

        if not query or not answer:
            return False

        formatted_prompt = self._format_prompt(query, collections)
        metadata = {
            "sources": sources or [],
            "chunks_found": chunks_found,
            "collections": collections or []
        }

        try:
            self._cache.store(
                prompt=formatted_prompt,
                response=answer,
                metadata=json.dumps(metadata)
            )
            logger.info(f"💾 [SemanticCache] Stored response for query: '{query[:40]}...'")
            return True
        except Exception as e:
            logger.debug(f"[SemanticCache] Error storing entry in cache: {e}")
            return False

    def clear(self) -> bool:
        """
        Clear all cached entries.
        """
        if not self._init_cache():
            return False
        try:
            self._cache.clear()
            logger.info("🧹 [SemanticCache] Cache cleared.")
            return True
        except Exception as e:
            logger.error(f"[SemanticCache] Failed to clear cache: {e}")
            return False

    def get_status(self) -> Dict[str, Any]:
        """
        Return the operational status of the semantic cache.
        """
        self._init_cache()
        return {
            "enabled": settings.SEMANTIC_CACHE_ENABLED,
            "ready": self._is_ready,
            "redis_url": settings.REDIS_URL,
            "model": settings.SEMANTIC_CACHE_MODEL,
            "threshold": settings.SEMANTIC_CACHE_THRESHOLD,
            "ttl": settings.SEMANTIC_CACHE_TTL,
            "unavailable_reason": self._unavailable_reason if not self._is_ready else None
        }

semantic_cache = SemanticCacheManager()

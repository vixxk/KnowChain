import uuid
from typing import List, Dict, Any
from qdrant_client import QdrantClient
from qdrant_client.http import models
from app.config import settings
from app.utils.ai import get_embeddings, execute_with_retry
from app.utils.throttle import throttle_request

def chunk_array(array: list, size: int) -> list:
    return [array[i:i + size] for i in range(0, len(array), size)]

async def run_incremental_indexing(
    batches: List[List[Dict[str, Any]]],
    embeddings: Any,
    collection_name: str,
    qdrant_url: str = None
):
    effective_qdrant_url = (qdrant_url and qdrant_url.strip()) if qdrant_url else None
    url = effective_qdrant_url or settings.QDRANT_URL
    if url and url.endswith("/"):
        url = url[:-1]

    client = QdrantClient(
        url=url,
        api_key=settings.QDRANT_API_KEY,
        timeout=30.0
    )

    for i, batch in enumerate(batches):
        await throttle_request()

        # Prepare texts to embed
        texts = [doc["pageContent"] for doc in batch]
        vectors = await embeddings.aembed_documents(texts)
        vector_size = len(vectors[0]) if vectors else 768

        async def index_batch():
            # Ensure collection exists
            collections_res = client.get_collections()
            collection_names = [c.name for c in collections_res.collections]
            if collection_name not in collection_names:
                client.create_collection(
                    collection_name=collection_name,
                    vectors_config=models.VectorParams(
                        size=vector_size,
                        distance=models.Distance.COSINE
                    )
                )

            points = []
            for idx, doc in enumerate(batch):
                point_id = str(uuid.uuid4())
                points.append(
                    models.PointStruct(
                        id=point_id,
                        vector=vectors[idx],
                        payload={
                            "pageContent": doc["pageContent"],
                            "metadata": doc.get("metadata", {})
                        }
                    )
                )

            client.upsert(
                collection_name=collection_name,
                points=points
            )

        await execute_with_retry(index_batch)

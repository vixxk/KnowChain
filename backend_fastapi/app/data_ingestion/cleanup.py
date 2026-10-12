import re
from typing import Dict, Any
from qdrant_client import QdrantClient
from app.config import settings

async def delete_session_collections(session_id: str, qdrant_url: str = None) -> Dict[str, Any]:
    if not session_id:
        return {"deleted": 0}

    sanitized_prefix = re.sub(r'[^a-zA-Z0-9_-]', '_', session_id)
    effective_qdrant_url = (qdrant_url and qdrant_url.strip()) if qdrant_url else None
    url = effective_qdrant_url or settings.QDRANT_URL
    if url and url.endswith("/"):
        url = url[:-1]

    try:
        client = QdrantClient(
            url=url,
            api_key=settings.QDRANT_API_KEY,
            timeout=15.0
        )

        collections_res = client.get_collections()
        all_collections = [c.name for c in collections_res.collections]

        to_delete = [name for name in all_collections if name.startswith(sanitized_prefix)]

        for name in to_delete:
            try:
                client.delete_collection(collection_name=name)
                print(f"  🗑️ Deleted collection: {name}")
            except Exception as e:
                print(f"  ⚠️ Failed to delete collection {name}: {e}")

        return {"deleted": len(to_delete), "collections": to_delete}

    except Exception as error:
        print(f"🧹 [Cleanup] Error deleting session collections: {error}")
        return {"deleted": 0, "error": str(error)}

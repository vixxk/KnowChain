export async function deleteSessionCollections(sessionId, qdrantUrl = null) {
  if (!sessionId) return { deleted: 0 };
  const sanitizedPrefix = sessionId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const effectiveQdrantUrl = (qdrantUrl && qdrantUrl.trim()) ? qdrantUrl.trim() : null;
  const url = effectiveQdrantUrl || process.env.QDRANT_URL;
  
  try {
    const listRes = await fetch(`${url}/collections`, {
      headers: { "api-key": process.env.QDRANT_API_KEY },
    });
    const listData = await listRes.json();
    const allCollections = listData?.result?.collections || [];

    const toDelete = allCollections
      .map(c => c.name)
      .filter(name => name.startsWith(sanitizedPrefix));

    for (const name of toDelete) {
      await fetch(`${url}/collections/${name}`, {
        method: "DELETE",
        headers: { "api-key": process.env.QDRANT_API_KEY },
      });
    }

    return { deleted: toDelete.length, collections: toDelete };
  } catch (error) {
    return { deleted: 0, error: error.message };
  }
}

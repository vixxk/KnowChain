from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.utils.ai import get_embeddings
from app.indexers.base import chunk_array, run_incremental_indexing

async def text_indexer(text_content: str, collection_name: str, qdrant_url: str = None):
    splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    chunks = splitter.split_text(text_content)

    docs = [{
        "pageContent": f"search_document: {c}",
        "metadata": {"source": "user-uploaded"}
    } for c in chunks]

    embeddings = get_embeddings()
    batches = chunk_array(docs, 100)
    await run_incremental_indexing(batches, embeddings, collection_name, qdrant_url)

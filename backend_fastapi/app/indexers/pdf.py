from pypdf import PdfReader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.utils.ai import get_embeddings
from app.indexers.base import chunk_array, run_incremental_indexing

async def pdf_indexer(pdf_file_path: str, collection_name: str, qdrant_url: str = None):
    reader = PdfReader(pdf_file_path)
    page_texts = []
    for page in reader.pages:
        txt = page.extract_text() or ""
        if txt:
            page_texts.append(txt)

    full_text = "\n".join(page_texts)
    splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    chunks = splitter.split_text(full_text)

    docs = [{
        "pageContent": f"search_document: {c}",
        "metadata": {"source": pdf_file_path}
    } for c in chunks]

    embeddings = get_embeddings()
    batches = chunk_array(docs, 100)
    await run_incremental_indexing(batches, embeddings, collection_name, qdrant_url)

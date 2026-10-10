import re
import pymupdf
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.utils.ai import get_embeddings
from app.indexers.base import chunk_array, run_incremental_indexing

async def pdf_indexer(pdf_file_path: str, collection_name: str, qdrant_url: str = None):
    doc = pymupdf.open(pdf_file_path)
    total_pages = len(doc)
    splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)

    docs = []
    try:
        for page_idx in range(total_pages):
            page = doc[page_idx]
            # Extract text with sort=True to preserve reading order (columns/blocks)
            raw_text = page.get_text("text", sort=True) or ""
            text = raw_text.strip()
            if not text:
                continue

            # Normalize redundant whitespace while keeping paragraph separation
            cleaned_text = re.sub(r'[ \t]+', ' ', text)
            cleaned_text = re.sub(r'\n{3,}', '\n\n', cleaned_text)

            chunks = splitter.split_text(cleaned_text)
            for c in chunks:
                docs.append({
                    "pageContent": f"search_document: {c}",
                    "metadata": {
                        "source": pdf_file_path,
                        "page": page_idx + 1,
                        "total_pages": total_pages
                    }
                })
    finally:
        doc.close()

    if not docs:
        print(f"⚠️ [PyMuPDF] No extractable text found in {pdf_file_path}")
        return

    embeddings = get_embeddings()
    batches = chunk_array(docs, 100)
    await run_incremental_indexing(batches, embeddings, collection_name, qdrant_url)


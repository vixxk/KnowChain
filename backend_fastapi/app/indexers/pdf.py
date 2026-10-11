import re
import pymupdf
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.utils.ai import get_embeddings
from app.indexers.base import chunk_array, run_incremental_indexing
from app.utils.ocr import ocr_pymupdf_page_async, extract_and_ocr_embedded_images

async def pdf_indexer(pdf_file_path: str, collection_name: str, qdrant_url: str = None):
    doc = pymupdf.open(pdf_file_path)
    total_pages = len(doc)
    splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)

    docs = []
    try:
        for page_idx in range(total_pages):
            page = doc[page_idx]
            # 1. Extract digital text preserving natural reading order
            raw_text = page.get_text("text", sort=True) or ""
            text = raw_text.strip()
            is_ocr = False

            # 2. Scanned Page Fallback: if digital text is empty or sparse, run OCR
            if len(text) < 50:
                ocr_text = await ocr_pymupdf_page_async(page, dpi=200)
                if ocr_text:
                    text = ocr_text
                    is_ocr = True
            else:
                # 3. Hybrid Inspection: check embedded diagrams / charts for text
                embedded_texts = await extract_and_ocr_embedded_images(page, doc)
                if embedded_texts:
                    figures_text = "\n\n".join([f"[Visual Context]: {et}" for et in embedded_texts])
                    text = f"{text}\n\n{figures_text}"

            if not text:
                continue

            # Normalize redundant whitespace while keeping paragraphs intact
            cleaned_text = re.sub(r'[ \t]+', ' ', text)
            cleaned_text = re.sub(r'\n{3,}', '\n\n', cleaned_text)

            chunks = splitter.split_text(cleaned_text)
            for c in chunks:
                docs.append({
                    "pageContent": f"search_document: {c}",
                    "metadata": {
                        "source": pdf_file_path,
                        "page": page_idx + 1,
                        "total_pages": total_pages,
                        "is_ocr": is_ocr
                    }
                })
    finally:
        doc.close()

    if not docs:
        print(f"⚠️ [PyMuPDF + OCR] No extractable text found in {pdf_file_path}")
        return

    embeddings = get_embeddings()
    batches = chunk_array(docs, 100)
    await run_incremental_indexing(batches, embeddings, collection_name, qdrant_url)



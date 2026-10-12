import re
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.utils.ai import get_embeddings
from app.data_ingestion.base import chunk_array, run_incremental_indexing
from app.data_ingestion.ocr import extract_text_from_image_async

async def image_indexer(image_file_path: str, collection_name: str, qdrant_url: str = None):
    """
    Ingests and indexes standalone image files (PNG, JPG, JPEG, WEBP, TIFF)
    using Tesseract OCR.
    """
    text = await extract_text_from_image_async(image_file_path)
    text = text.strip() if text else ""

    if not text:
        raise ValueError("No readable text detected in the provided image.")

    cleaned_text = re.sub(r'[ \t]+', ' ', text)
    cleaned_text = re.sub(r'\n{3,}', '\n\n', cleaned_text)

    splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    chunks = splitter.split_text(cleaned_text)

    docs = [{
        "pageContent": f"search_document: {c}",
        "metadata": {
            "source": image_file_path,
            "file_type": "image",
            "is_ocr": True
        }
    } for c in chunks]

    embeddings = get_embeddings()
    batches = chunk_array(docs, 100)
    await run_incremental_indexing(batches, embeddings, collection_name, qdrant_url)

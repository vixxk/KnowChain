import re
import httpx
from bs4 import BeautifulSoup
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.utils.ai import get_embeddings
from app.indexers.base import chunk_array, run_incremental_indexing

async def web_indexer(url: str, collection_name: str, qdrant_url: str = None):
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'max-age=0'
    }

    async with httpx.AsyncClient(follow_redirects=True, timeout=15.0) as client:
        response = await client.get(url, headers=headers)
        response.raise_for_status()

    soup = BeautifulSoup(response.text, 'html.parser')

    for element in soup(['nav', 'footer', 'aside', 'header', 'script', 'style']):
        element.decompose()

    content_el = (
        soup.find('article') or
        soup.find('main') or
        soup.find(id='content') or
        soup.find(class_='content') or
        soup.find('body')
    )

    text = content_el.get_text() if content_el else soup.get_text()
    clean_text = re.sub(r'\s{2,}', ' ', text).strip()

    if len(clean_text) < 50:
        raise ValueError("No readability found.")

    splitter = RecursiveCharacterTextSplitter(chunk_size=600, chunk_overlap=120)
    chunks = splitter.split_text(clean_text)

    docs = [{
        "pageContent": f"search_document: {c}",
        "metadata": {"source": url}
    } for c in chunks]

    embeddings = get_embeddings()
    batches = chunk_array(docs, 100)
    await run_incremental_indexing(batches, embeddings, collection_name, qdrant_url)

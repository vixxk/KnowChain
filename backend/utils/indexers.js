import axios from "axios";
import { load } from "cheerio";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { OpenAIEmbeddings } from "@langchain/openai";
import { QdrantVectorStore } from "@langchain/qdrant";

const visited = new Set();

function chunkArray(array, size) {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

// Retryable fetch for web crawling
async function fetchWithRetry(url, retries = 3, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await axios.get(url, {
        timeout: 15000,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; KnowChainBot/1.0)" },
      });
    } catch (err) {
      if (i === retries - 1) throw err;
      console.log(`Retrying ${url} (${i + 1})...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

export async function webIndexer(url) {
  const baseDomain = new URL(url).origin;
  if (visited.has(url)) return;
  visited.add(url);

  let urlsToCrawl = [url];

  try {
    const res = await fetchWithRetry(url);
    const $ = load(res.data);

    $("a").each((_, a) => {
      const href = $(a).attr("href");
      if (!href) return;
      let absoluteUrl = href.startsWith("http") ? href : new URL(href, url).href;
      if (
        absoluteUrl.startsWith(baseDomain) &&
        !visited.has(absoluteUrl) &&
        !absoluteUrl.endsWith(".pdf") &&
        !absoluteUrl.endsWith(".jpg") &&
        !absoluteUrl.endsWith(".png")
      ) {
        urlsToCrawl.push(absoluteUrl);
        visited.add(absoluteUrl);
      }
    });
  } catch (err) {
    console.log(`⚠️ Failed to crawl ${url}: ${err.message}`);
  }

  const loaderPromises = urlsToCrawl.map(async pageUrl => {
    const loader = new CheerioWebBaseLoader(pageUrl);
    return loader.load();
  });

  const rawDocsArray = await Promise.all(loaderPromises);
  const rawDocs = rawDocsArray.flat();

  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 });
  const docs = [];
  for (const doc of rawDocs) {
    const chunks = await splitter.splitText(doc.pageContent || "");
    chunks.forEach(chunk => docs.push({ pageContent: chunk }));
  }

  const embeddings = new OpenAIEmbeddings({
    model: "text-embedding-004",
    apiKey: process.env.GEMINI_API_KEY,
    configuration: { baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/" },
  });

  const batches = chunkArray(docs, 100);
  for (const batch of batches) {
    await QdrantVectorStore.fromDocuments(batch, embeddings, {
      url: process.env.QDRANT_URL,
      collectionName: "website_docs",
    });
  }

  console.log("🌐 Web indexing done!");
}

export async function pdfIndexer(pdfFilePath, collectionName = "pdf") {
  const loader = new PDFLoader(pdfFilePath);
  const rawDocs = await loader.load();

  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 });
  const docs = [];
  for (const doc of rawDocs) {
    const chunks = await splitter.splitText(doc.pageContent || "");
    chunks.forEach(chunk => docs.push({ pageContent: chunk }));
  }

  const embeddings = new OpenAIEmbeddings({
    model: "text-embedding-004",
    apiKey: process.env.GEMINI_API_KEY,
    configuration: { baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/" },
  });

  const batches = chunkArray(docs, 100);
  for (const batch of batches) {
    await QdrantVectorStore.fromDocuments(batch, embeddings, {
      url: process.env.QDRANT_URL,
      collectionName,
    });
  }

  console.log("📄 PDF indexing done!");
}

export const textIndexer = async (textContent, collectionName = "text") => {
  try {
    console.log(`📝 Starting text indexing for collection: ${collectionName}`);

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const chunks = await splitter.splitText(textContent);
    const docs = chunks.map(chunk => ({ pageContent: chunk }));

    console.log(`📊 Split text into ${docs.length} chunks`);

    const embeddings = new OpenAIEmbeddings({
      model: "text-embedding-004",
      apiKey: process.env.GEMINI_API_KEY,
      configuration: { baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/" },
    });

    const batches = chunkArray(docs, 100);
    for (const batch of batches) {
      await QdrantVectorStore.fromDocuments(batch, embeddings, {
        url: process.env.QDRANT_URL,
        collectionName,
      });
    }

    console.log(`✅ Text indexing completed for collection: ${collectionName}`);
  } catch (err) {
    console.error("❌ Text indexing failed:", err);
    throw err;
  }
};

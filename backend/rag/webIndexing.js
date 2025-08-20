import axios from "axios";
import * as cheerio from "cheerio";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { OpenAIEmbeddings } from "@langchain/openai";
import { QdrantVectorStore } from "@langchain/qdrant";
import dotenv from "dotenv";
dotenv.config({ path: "../.env" });

const visited = new Set();

async function crawlSite(url, baseDomain) {
  if (visited.has(url)) return [];
  visited.add(url);

  try {
    const res = await axios.get(url);
    const $ = cheerio.load(res.data);

    const links = [];
    $("a").each((_, a) => {
      const href = $(a).attr("href");
      if (!href) return;

      // Convert relative URLs to absolute
      let absoluteUrl = href.startsWith("http") ? href : new URL(href, url).href;

      // Only crawl same domain or subdomain
      if (absoluteUrl.startsWith(baseDomain) && !visited.has(absoluteUrl)) {
        links.push(absoluteUrl);
      }
    });

    return [url, ...links];
  } catch (err) {
    console.log(`⚠️ Failed to crawl ${url}: ${err.message}`);
    return [];
  }
}

async function webWorker(url) {
  const baseDomain = new URL(url).origin;
  const urlsToCrawl = await crawlSite(url, baseDomain);

  console.log(`🌍 Found ${urlsToCrawl.length} pages to load`);

  const loaderPromises = urlsToCrawl.map(async (pageUrl) => {
    const loader = new CheerioWebBaseLoader(pageUrl);
    return loader.load();
  });

  const rawDocsArray = await Promise.all(loaderPromises);
  const rawDocs = rawDocsArray.flat();

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });

  const docs = await splitter.splitDocuments(rawDocs);
  console.log(`🔹 Website split into ${docs.length} chunks`);

  const embeddings = new OpenAIEmbeddings({
    model: "text-embedding-004",
    apiKey: process.env.GEMINI_API_KEY,
    configuration: {
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    },
  });

  // Gemini allows max 100 splits per batch
  const batchSize = 100;
  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = docs.slice(i, i + batchSize);
    await QdrantVectorStore.fromDocuments(batch, embeddings, {
      url: process.env.QDRANT_URL,
      collectionName: "website_docs",
    });
    console.log(`✅ Indexed batch ${Math.floor(i / batchSize) + 1} (${batch.length} chunks)`);
  }

  console.log("🎉 Website indexing done!");
}

webWorker("https://docs.docker.com/get-started");

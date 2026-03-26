import axios from "axios";
import { load } from "cheerio";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { getEmbeddings } from "../../utils/ai.js";
import { chunkArray, runIncrementalIndexing } from "./base.js";

export async function webIndexer(url, collectionName) {
  const response = await axios.get(url, { 
    headers: { 
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Cache-Control': 'max-age=0'
    }
  });
  const $ = load(response.data);
  $('nav, footer, aside, header, script, style').remove();
  
  const content = $('article, main, #content, .content').first().length > 0 
    ? $('article, main, #content, .content').first() 
    : $('body');
  
  const text = content.text().replace(/\s{2,}/g, ' ').trim();
  if (text.length < 50) throw new Error("No readability found.");

  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 600, chunkOverlap: 120 });
  const docs = (await splitter.splitText(text)).map(c => ({ 
    pageContent: `search_document: ${c}`,
    metadata: { source: url }
  }));

  const embeddings = getEmbeddings();
  const batches = chunkArray(docs, 100);
  await runIncrementalIndexing(batches, embeddings, collectionName);
}

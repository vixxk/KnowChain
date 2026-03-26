import axios from "axios";
import { load } from "cheerio";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { getEmbeddings } from "../../utils/ai.js";
import { chunkArray, runIncrementalIndexing } from "./base.js";

export async function webIndexer(url, collectionName) {
  const response = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }});
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

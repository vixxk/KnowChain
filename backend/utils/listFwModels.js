import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config({ path: "../.env" });
const openai = new OpenAI({ apiKey: process.env.FIREWORKS_API_KEY, baseURL: "https://api.fireworks.ai/inference/v1" });
async function l() {
  try {
    const list = await openai.models.list();
    const ids = list.data.map(m => m.id);
    console.log("QWEN:", ids.filter(i => i.toLowerCase().includes("qwen")));
    console.log("NOMIC:", ids.filter(i => i.toLowerCase().includes("nomic")));
    console.log("ALL:", ids.length);
  } catch (err) { console.error(err.message); }
}
l();

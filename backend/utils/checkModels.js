import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config({ path: "../.env" });
async function l() {
  const k = process.env.GEMINI_API_KEY;
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${k}`);
    const d = await r.json();
    console.log("GEMINI EMBED MODELS:");
    d.models.filter(m => m.supportedMethods.includes("embedContent")).forEach(m => console.log(`- ${m.name}`));
  } catch (err) { console.error(err); }
}
l();

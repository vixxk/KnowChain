import { rewriteQuery } from "../../utils/ai.js";

export async function rewriteController(req, res) {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: "Query is required." });
    
    const rewritten = await rewriteQuery(query);
    res.json({ original: query, rewritten });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

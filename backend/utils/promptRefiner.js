/**
 * Robust utility for cleaning and refining AI-generated prompts.
 * Handles reasoning models (DeepSeek, Qwen) that leak internal monologue.
 */

export function cleanAiResponse(text) {
  if (!text) return "";
  
  let cleaned = text;

  // 1. Remove <think>...</think> blocks (including unclosed, nested, multiline)
  cleaned = cleaned.replace(/<think[\s\S]*?(?:<\/think>|$)/gi, "");

  // 2. Remove <thought>...</thought> blocks
  cleaned = cleaned.replace(/<thought[\s\S]*?(?:<\/thought>|$)/gi, "");

  // 3. Remove standalone opening/closing tags that survived
  cleaned = cleaned.replace(/<\/?think>/gi, "");
  cleaned = cleaned.replace(/<\/?thought>/gi, "");

  // 4. Remove "Thought: ..." or "Thinking: ..." style blocks at the beginning
  cleaned = cleaned.replace(/^(?:Thought|Thinking|Internal reasoning):\s*[\s\S]*?\n\n/i, "");

  // 5. Remove any leading/trailing quotes that models sometimes add
  cleaned = cleaned.replace(/^["']|["']$/g, "");

  // 6. Remove [Source X] citations and file path references
  cleaned = cleaned.replace(/\[Source \d+\]\s*:?\s*uploads\/[^\s\n]+/g, '');
  cleaned = cleaned.replace(/\[Source \d+\]/g, '');

  // 7. Collapse excessive newlines
  cleaned = cleaned.replace(/\n{4,}/g, "\n\n\n");

  return cleaned.trim();
}

/**
 * Refines a user query for better vector search performance.
 */
export async function refineQuery(originalQuery, aiClient, modelName) {
  try {
    const response = await aiClient.chat.completions.create({
      model: modelName,
      messages: [
        { 
          role: "system", 
          content: "/no_think\nYou are a professional prompt engineer. Rewrite the user's query to be highly descriptive and optimized for vector-based semantic search. Maintain the original intent. Output ONLY the refined query text without any explanations or thoughts." 
        },
        { role: "user", content: originalQuery }
      ],
      temperature: 0.2,
      max_tokens: 500,
    });

    const rawResult = response.choices[0].message.content;
    const refined = cleanAiResponse(rawResult);

    return refined || originalQuery;
  } catch (error) {
    console.error("❌ [PromptRefiner] Failed to refine query:", error.message);
    return originalQuery;
  }
}

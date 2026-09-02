import re
from typing import Any

def clean_ai_response(text: str) -> str:
    if not text:
        return ""
    
    cleaned = text

    # 1. Remove <think>...</think> blocks (including unclosed/multiline)
    cleaned = re.sub(r'<think[\s\S]*?(?:</think>|$)', '', cleaned, flags=re.IGNORECASE)

    # 2. Remove <thought>...</thought> blocks
    cleaned = re.sub(r'<thought[\s\S]*?(?:</thought>|$)', '', cleaned, flags=re.IGNORECASE)

    # 3. Remove standalone tags
    cleaned = re.sub(r'</?(?:think|thought)>', '', cleaned, flags=re.IGNORECASE)

    # 4. Remove Thought/Thinking preambles at beginning
    cleaned = re.sub(r'^(?:Thought|Thinking|Internal reasoning):\s*[\s\S]*?\n\n', '', cleaned, flags=re.IGNORECASE)

    # 5. Remove leading/trailing quotes
    cleaned = re.sub(r'^["\']|["\']$', '', cleaned)

    # 6. Remove [Source X] citations and file path references
    cleaned = re.sub(r'\[Source \d+\]\s*:?\s*uploads/[^\s\n]+', '', cleaned)
    cleaned = re.sub(r'\[Source \d+\]', '', cleaned)

    # 7. Collapse excessive newlines
    cleaned = re.sub(r'\n{4,}', '\n\n\n', cleaned)

    return cleaned.strip()

async def refine_query(original_query: str, ai_client: Any, model_name: str) -> str:
    try:
        response = await ai_client.chat.completions.create(
            model=model_name,
            messages=[
                {
                    "role": "system",
                    "content": "/no_think\nYou are a professional prompt engineer. Rewrite the user's query to be highly descriptive and optimized for vector-based semantic search. Maintain the original intent. Output ONLY the refined query text without any explanations or thoughts."
                },
                {"role": "user", "content": original_query}
            ],
            temperature=0.2,
            max_tokens=500,
        )
        raw_result = response.choices[0].message.content or ""
        refined = clean_ai_response(raw_result)
        return refined if refined else original_query
    except Exception as error:
        print(f"❌ [PromptRefiner] Failed to refine query: {error}")
        return original_query

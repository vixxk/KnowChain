from langgraph.graph import StateGraph, START, END
from app.graph.state import GraphState
from app.graph.nodes import rewrite_node, retrieval_node, generate_node

# Build state graph
workflow = StateGraph(GraphState)

# Add nodes
workflow.add_node("rewrite", rewrite_node)
workflow.add_node("retrieve", retrieval_node)
workflow.add_node("generate", generate_node)

# Add edges
workflow.add_edge(START, "rewrite")
workflow.add_edge("rewrite", "retrieve")
workflow.add_edge("retrieve", "generate")
workflow.add_edge("generate", END)

# Compile graph
rag_app = workflow.compile()

async def run_rag_pipeline(
    query: str,
    collection_name: str = None,
    collection_names: list = None,
    rewrite: bool = False,
    history: list = None,
    qdrant_url: str = None
) -> dict:
    initial_state: GraphState = {
        "query": query,
        "collection_name": collection_name,
        "collection_names": collection_names or [],
        "rewrite": rewrite,
        "history": history or [],
        "qdrant_url": qdrant_url,
        "rewritten_query": None,
        "retrieved_docs": [],
        "chunks_found": 0,
        "answer": ""
    }

    final_state = await rag_app.ainvoke(initial_state)
    return final_state

async def stream_rag_pipeline(
    query: str,
    collection_name: str = None,
    collection_names: list = None,
    rewrite: bool = False,
    history: list = None,
    qdrant_url: str = None
):
    from app.utils.ai import rewrite_query, get_embeddings, get_fw_client, CHAT_MODEL_NAME
    from app.graph.nodes import retrieve_from_collection, extract_sources

    current_query = query
    rewritten_query = None
    if rewrite and query:
        rewritten_query = await rewrite_query(query)
        current_query = rewritten_query

    collections = collection_names or ([collection_name] if collection_name else [])
    embeddings = get_embeddings()
    all_docs = []
    for col in collections:
        docs = await retrieve_from_collection(col, current_query, embeddings, qdrant_url)
        all_docs.extend(docs)

    unique_sources = extract_sources(all_docs)

    if not all_docs:
        yield {
            "type": "start",
            "chunksFound": 0,
            "sources": [],
            "rewrittenQuery": rewritten_query
        }
        yield {
            "type": "token",
            "token": "I couldn't find any relevant content in the uploaded documents for this query. Please make sure your source is properly synced in the Neural Feed and try rephrasing your question."
        }
        yield {
            "type": "done",
            "chunksFound": 0,
            "sources": [],
            "rewrittenQuery": rewritten_query
        }
        return

    # Yield start event with sources and metadata
    yield {
        "type": "start",
        "chunksFound": len(all_docs),
        "sources": unique_sources,
        "rewrittenQuery": rewritten_query
    }

    sections = [f"--- Section {i + 1} ---\n{doc.get('pageContent', '')}" for i, doc in enumerate(all_docs)]
    context_text = "\n\n".join(sections)

    conversation = []
    for m in (history or [])[-8:]:
        role = "user" if m.get("sender") == "user" else "assistant"
        conversation.append({"role": role, "content": m.get("text", "")})

    system_prompt = f"""/no_think
You are KnowChain AI, a precise document-grounded assistant.

INSTRUCTIONS:
- ANSWER RELEVANCY: Target the user's specific question directly, concisely, and completely. Focus strictly on the exact entities and concepts requested in the query without fluff or unrelated tangents.
- Synthesize facts across different sections of the DOCUMENT CONTENT cohesively to formulate a complete answer.
- Answer the query directly and concisely. Do not use conversational introductions or filler preambles (e.g., "Based on the provided documents..."). Start directly with the answer.
- STRICT GROUNDEDNESS REQUIREMENT: Base every sentence and claim EXCLUSIVELY on facts directly contained in the DOCUMENT CONTENT. Do not extrapolate, assume, or add outside knowledge under any circumstance.
- Use **bold** for key names, exact terms, and critical metrics/numbers.
- Use markdown lists or headers (###) to organize structured or multi-part answers.
- If the answer is not found in or cannot be directly inferred from the DOCUMENT CONTENT, reply exactly with: "This information is not available in the provided documents."

DOCUMENT CONTENT:
{context_text}"""

    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(conversation)
    messages.append({"role": "user", "content": query})

    fw_client = get_fw_client()

    response_stream = await fw_client.chat.completions.create(
        model=CHAT_MODEL_NAME,
        messages=messages,
        temperature=0.0,
        max_tokens=2048,
        stream=True
    )

    in_think_block = False
    think_buffer = ""

    async for chunk in response_stream:
        if chunk.choices and len(chunk.choices) > 0:
            delta = chunk.choices[0].delta
            content = delta.content or ""
            if not content:
                continue

            if "<think>" in content or in_think_block:
                think_buffer += content
                if "<think>" in think_buffer and "</think>" not in think_buffer:
                    in_think_block = True
                    continue
                elif "</think>" in think_buffer:
                    after_think = think_buffer.split("</think>")[-1]
                    in_think_block = False
                    think_buffer = ""
                    if after_think:
                        yield {"type": "token", "token": after_think}
                    continue

            yield {"type": "token", "token": content}

    yield {
        "type": "done",
        "chunksFound": len(all_docs),
        "sources": unique_sources,
        "rewrittenQuery": rewritten_query
    }


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

from typing import TypedDict, List, Dict, Any, Optional

class GraphState(TypedDict):
    query: str
    collection_name: Optional[str]
    collection_names: List[str]
    rewrite: bool
    history: List[Dict[str, Any]]
    qdrant_url: Optional[str]
    rewritten_query: Optional[str]
    retrieved_docs: List[Dict[str, Any]]
    chunks_found: int
    answer: str

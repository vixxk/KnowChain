import os
import re
import time
import random
import string
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.graph.rag_graph import run_rag_pipeline
from app.utils.ai import rewrite_query
from app.indexers.web import web_indexer
from app.indexers.pdf import pdf_indexer
from app.indexers.text import text_indexer
from app.indexers.cleanup import delete_session_collections

router = APIRouter(prefix="/chat", tags=["Chat & Indexing"])

def generate_collection_name(session_id: str, type_prefix: str) -> str:
    timestamp_ms = int(time.time() * 1000)
    raw_name = f"{session_id}_{type_prefix}_{timestamp_ms}"
    return re.sub(r'[^a-zA-Z0-9_-]', '_', raw_name)

class ChatQueryRequest(BaseModel):
    query: Optional[str] = None
    collectionName: Optional[str] = None
    collectionNames: Optional[List[str]] = None
    rewrite: Optional[bool] = False
    history: Optional[List[Dict[str, Any]]] = []
    qdrantUrl: Optional[str] = None

class RewriteRequest(BaseModel):
    query: Optional[str] = None

class WebIndexRequest(BaseModel):
    url: Optional[str] = None
    sessionId: Optional[str] = None
    qdrantUrl: Optional[str] = None

class TextIndexRequest(BaseModel):
    text: Optional[str] = None
    sessionId: Optional[str] = None
    qdrantUrl: Optional[str] = None

class CleanupRequest(BaseModel):
    qdrantUrl: Optional[str] = None

@router.post("/query")
async def unified_chat(req: ChatQueryRequest):
    collections = req.collectionNames or ([req.collectionName] if req.collectionName else [])
    if not collections:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": "❌ No source selected."}
        )
    if not req.query:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": "Query is required."}
        )

    try:
        result = await run_rag_pipeline(
            query=req.query,
            collection_name=req.collectionName,
            collection_names=collections,
            rewrite=bool(req.rewrite),
            history=req.history or [],
            qdrant_url=req.qdrantUrl
        )

        return {
            "answer": result.get("answer", ""),
            "rewrittenQuery": result.get("rewritten_query") if req.rewrite else None,
            "chunksFound": result.get("chunks_found", 0)
        }
    except Exception as e:
        print(f"[ChatError] {e}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"error": "Something went wrong processing your query. Please try again."}
        )

@router.post("/rewrite")
async def rewrite_endpoint(req: RewriteRequest):
    if not req.query:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": "Query is required."}
        )
    try:
        rewritten = await rewrite_query(req.query)
        return {"original": req.query, "rewritten": rewritten}
    except Exception as e:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"error": str(e)}
        )

@router.post("/web")
async def web_chat_alias(req: ChatQueryRequest):
    return await unified_chat(req)

@router.post("/pdf")
async def pdf_chat_alias(req: ChatQueryRequest):
    return await unified_chat(req)

@router.post("/text")
async def text_chat_alias(req: ChatQueryRequest):
    return await unified_chat(req)

@router.post("/index/web")
async def index_web(req: WebIndexRequest):
    if not req.url or not req.sessionId:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": "Missing parameters"}
        )
    try:
        collection_name = generate_collection_name(req.sessionId, "website")
        await web_indexer(req.url, collection_name, req.qdrantUrl)
        return {"message": "Indexed", "collectionName": collection_name}
    except Exception as e:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"error": str(e)}
        )

@router.post("/index/pdf")
async def index_pdf(
    file: Optional[UploadFile] = File(None),
    sessionId: Optional[str] = Form(None),
    qdrantUrl: Optional[str] = Form(None)
):
    if not file or not sessionId:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": "Missing file or session"}
        )
    try:
        uploads_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
        os.makedirs(uploads_dir, exist_ok=True)
        file_path = os.path.join(uploads_dir, file.filename)

        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)

        collection_name = generate_collection_name(sessionId, "pdf")
        await pdf_indexer(file_path, collection_name, qdrantUrl)
        return {"message": "Indexed", "collectionName": collection_name}
    except Exception as e:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"error": str(e)}
        )

@router.post("/index/text")
async def index_text(req: TextIndexRequest):
    if not req.text or not req.sessionId:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": "Missing parameters"}
        )
    try:
        collection_name = generate_collection_name(req.sessionId, "text")
        await text_indexer(req.text, collection_name, req.qdrantUrl)
        return {"message": "Indexed", "collectionName": collection_name}
    except Exception as e:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"error": str(e)}
        )

@router.post("/start-session")
async def start_session():
    timestamp_ms = int(time.time() * 1000)
    random_str = ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))
    session_id = f"session_{timestamp_ms}_{random_str}"
    return {"sessionId": session_id}

@router.post("/cleanup/{session_id}")
async def cleanup_session(session_id: str, req: Optional[CleanupRequest] = None):
    try:
        qdrant_url = req.qdrantUrl if req else None
        res = await delete_session_collections(session_id, qdrant_url)
        return {
            "message": "Cleaned up",
            "deleted": res.get("deleted", 0),
            "collections": res.get("collections", [])
        }
    except Exception as e:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"error": str(e)}
        )

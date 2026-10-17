import os
import re
import time
import random
import string
from typing import Optional, List, Dict, Any
import json
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, status
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel

from app.graph.rag_graph import run_rag_pipeline, stream_rag_pipeline
from app.utils.ai import rewrite_query
from app.data_ingestion import (
    web_indexer,
    pdf_indexer,
    image_indexer,
    text_indexer,
    delete_session_collections
)
from app.cache.semantic_cache import semantic_cache
from app.services.s3 import s3_service


router = APIRouter(prefix="/chat", tags=["Chat & Indexing"])

@router.get("/cache/status")
async def get_cache_status():
    """Get operational status and stats of the semantic cache."""
    return semantic_cache.get_status()

@router.post("/cache/clear")
async def clear_cache():
    """Clear all entries from the semantic cache."""
    success = semantic_cache.clear()
    return {"status": "cleared" if success else "failed"}

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
    stream: Optional[bool] = False

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

    # 1. Check Semantic Cache first
    cached_result = semantic_cache.check(query=req.query, collections=collections)
    if cached_result:
        if req.stream:
            async def cached_event_stream():
                yield f"data: {json.dumps({'type': 'status', 'message': '⚡ Retrieved from Semantic Cache'})}\n\n"
                if cached_result.get("sources"):
                    yield f"data: {json.dumps({'type': 'sources', 'sources': cached_result['sources']})}\n\n"
                yield f"data: {json.dumps({'type': 'token', 'token': cached_result.get('answer', '')})}\n\n"
                yield f"data: {json.dumps({'type': 'done', 'chunks_found': cached_result.get('chunks_found', 0), 'cached': True})}\n\n"

            return StreamingResponse(
                cached_event_stream(),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "X-Accel-Buffering": "no"
                }
            )
        else:
            return {
                "answer": cached_result.get("answer", ""),
                "rewrittenQuery": None,
                "chunksFound": cached_result.get("chunks_found", 0),
                "sources": cached_result.get("sources", []),
                "cached": True
            }

    # 2. Handle streaming response (Cache Miss)
    if req.stream:
        async def event_stream():
            full_answer_chunks = []
            final_sources = []
            chunks_found_count = 0
            try:
                async for event in stream_rag_pipeline(
                    query=req.query,
                    collection_name=req.collectionName,
                    collection_names=collections,
                    rewrite=bool(req.rewrite),
                    history=req.history or [],
                    qdrant_url=req.qdrantUrl
                ):
                    event_type = event.get("type")
                    if event_type == "token":
                        full_answer_chunks.append(event.get("token", ""))
                    elif event_type == "sources":
                        final_sources = event.get("sources", [])
                    elif event_type == "done":
                        chunks_found_count = event.get("chunks_found", 0)

                    yield f"data: {json.dumps(event)}\n\n"

                # Store complete answer in semantic cache upon stream finish
                full_answer = "".join(full_answer_chunks)
                if full_answer and not full_answer.startswith("⚠️"):
                    semantic_cache.store(
                        query=req.query,
                        answer=full_answer,
                        collections=collections,
                        sources=final_sources,
                        chunks_found=chunks_found_count
                    )
            except Exception as e:
                print(f"[ChatStreamError] {e}")
                err_data = {"type": "error", "error": "Something went wrong processing your query. Please try again."}
                yield f"data: {json.dumps(err_data)}\n\n"

        return StreamingResponse(
            event_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"
            }
        )

    # 3. Handle non-streaming response (Cache Miss)
    try:
        result = await run_rag_pipeline(
            query=req.query,
            collection_name=req.collectionName,
            collection_names=collections,
            rewrite=bool(req.rewrite),
            history=req.history or [],
            qdrant_url=req.qdrantUrl
        )

        answer = result.get("answer", "")
        if answer and not answer.startswith("⚠️"):
            semantic_cache.store(
                query=req.query,
                answer=answer,
                collections=collections,
                sources=result.get("sources", []),
                chunks_found=result.get("chunks_found", 0)
            )

        return {
            "answer": answer,
            "rewrittenQuery": result.get("rewritten_query") if req.rewrite else None,
            "chunksFound": result.get("chunks_found", 0),
            "sources": result.get("sources", []),
            "cached": False
        }
    except Exception as e:
        print(f"[ChatError] {e}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"error": "Something went wrong processing your query. Please try again."}
        )

@router.post("/stream")
async def stream_chat_alias(req: ChatQueryRequest):
    req.stream = True
    return await unified_chat(req)

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
        content = await file.read()
        filename = file.filename or "document.pdf"
        s3_meta = None

        if s3_service.is_configured():
            # Stream directly to AWS S3 without persisting to local server disk
            s3_meta = await s3_service.upload_file_async(
                file_content=content,
                filename=filename,
                content_type=file.content_type,
                session_id=sessionId
            )
            source_identifier = s3_meta["key"]
        else:
            # Fallback to local server disk storage if S3 bucket is not yet configured in .env
            uploads_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
            os.makedirs(uploads_dir, exist_ok=True)
            file_path = os.path.join(uploads_dir, filename)
            with open(file_path, "wb") as f:
                f.write(content)
            source_identifier = f"uploads/{filename}"

        # Smart routing: if an image is uploaded to the document endpoint, use OCR image indexer
        if filename.lower().endswith(('.png', '.jpg', '.jpeg', '.webp', '.bmp', '.tiff')):
            collection_name = generate_collection_name(sessionId, "image")
            await image_indexer(content, collection_name, qdrantUrl, source_identifier=source_identifier)
            return {
                "message": "Indexed",
                "collectionName": collection_name,
                "storage": "s3" if s3_meta else "local",
                "source": source_identifier,
                "s3Url": s3_meta.get("url") if s3_meta else None,
                "presignedUrl": s3_meta.get("presigned_url") if s3_meta else None
            }

        collection_name = generate_collection_name(sessionId, "pdf")
        await pdf_indexer(content, collection_name, qdrantUrl, source_identifier=source_identifier)
        return {
            "message": "Indexed",
            "collectionName": collection_name,
            "storage": "s3" if s3_meta else "local",
            "source": source_identifier,
            "s3Url": s3_meta.get("url") if s3_meta else None,
            "presignedUrl": s3_meta.get("presigned_url") if s3_meta else None
        }
    except Exception as e:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"error": str(e)}
        )

@router.post("/index/image")
async def index_image(
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
        content = await file.read()
        filename = file.filename or "image.png"
        s3_meta = None

        if s3_service.is_configured():
            s3_meta = await s3_service.upload_file_async(
                file_content=content,
                filename=filename,
                content_type=file.content_type,
                session_id=sessionId
            )
            source_identifier = s3_meta["key"]
        else:
            uploads_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
            os.makedirs(uploads_dir, exist_ok=True)
            file_path = os.path.join(uploads_dir, filename)
            with open(file_path, "wb") as f:
                f.write(content)
            source_identifier = f"uploads/{filename}"

        collection_name = generate_collection_name(sessionId, "image")
        await image_indexer(content, collection_name, qdrantUrl, source_identifier=source_identifier)
        return {
            "message": "Indexed",
            "collectionName": collection_name,
            "storage": "s3" if s3_meta else "local",
            "source": source_identifier,
            "s3Url": s3_meta.get("url") if s3_meta else None,
            "presignedUrl": s3_meta.get("presigned_url") if s3_meta else None
        }
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

        # Purge session files from S3 if configured
        s3_deleted = 0
        if s3_service.is_configured():
            s3_deleted = await s3_service.delete_session_files_async(session_id)

        return {
            "message": "Cleaned up",
            "deleted": res.get("deleted", 0),
            "collections": res.get("collections", []),
            "s3_deleted_files": s3_deleted
        }
    except Exception as e:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"error": str(e)}
        )

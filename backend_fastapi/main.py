import os
import time
from datetime import datetime, timezone
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import PlainTextResponse, JSONResponse, RedirectResponse, FileResponse
import uvicorn

from app.config import settings
from app.services.s3 import s3_service
from app.api.chat import router as chat_router
from app.api.evals import router as evals_router

start_time = time.time()

app = FastAPI(
    title="KnowChain LLM API",
    version="1.0.0",
    docs_url="/api-docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dynamic uploads resolver: generates S3 presigned URLs on-the-fly or serves local fallback
uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(uploads_dir, exist_ok=True)

@app.get("/uploads/{file_path:path}")
async def serve_uploaded_document(file_path: str):
    # 1. If AWS S3 is configured, check if object exists in S3 (exact key or search under uploads/)
    if s3_service.is_configured():
        s3_key = s3_service.find_object_key(file_path)
        if s3_key:
            presigned_url = s3_service.generate_presigned_url(s3_key)
            if presigned_url:
                return RedirectResponse(url=presigned_url, status_code=307)

    # 2. Local filesystem fallback (if file was stored locally prior to S3 activation)
    local_path = os.path.join(uploads_dir, file_path)
    if os.path.exists(local_path) and os.path.isfile(local_path):
        return FileResponse(local_path)

    # Check by filename in local uploads directory as well
    basename_path = os.path.join(uploads_dir, os.path.basename(file_path))
    if os.path.exists(basename_path) and os.path.isfile(basename_path):
        return FileResponse(basename_path)

    raise HTTPException(status_code=404, detail="Document not found")

# Include routers
app.include_router(chat_router)
app.include_router(evals_router)

@app.get("/", response_class=PlainTextResponse)
async def root():
    return "✅ KnowChain LLM Backend running"

@app.get("/health")
async def health():
    uptime_seconds = round(time.time() - start_time, 2)
    iso_timestamp = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    return {
        "status": "healthy",
        "timestamp": iso_timestamp,
        "uptime": uptime_seconds,
        "storage": {
            "s3_enabled": s3_service.is_configured(),
            "bucket": s3_service.bucket_name if s3_service.is_configured() else None,
            "region": s3_service.region if s3_service.is_configured() else None
        }
    }

if __name__ == "__main__":
    port = settings.PORT
    print(f"🚀 Server running on port {port} [FastAPI LangGraph]")
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)

import os
import time
from datetime import datetime, timezone
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import PlainTextResponse, JSONResponse
import uvicorn

from app.config import settings
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

# Mount static uploads directory
uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

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
        "uptime": uptime_seconds
    }

if __name__ == "__main__":
    port = settings.PORT
    print(f"🚀 Server running on port {port} [VERSION 2.0 - FastAPI LangGraph]")
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)

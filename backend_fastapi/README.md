# KnowChain FastAPI Backend (LangGraph RAG)

This is the high-performance Python FastAPI backend for KnowChain, replacing the legacy Node.js backend. It leverages **FastAPI** for low-latency asynchronous API routing and **LangGraph** for structured, stateful Retrieval-Augmented Generation (RAG) workflows.

---

## 🚀 Features

- **LangGraph State Machine**: State-driven RAG execution pipeline (`rewrite` ➔ `retrieve` ➔ `generate`).
- **Hybrid Retrieval**: Dense vector search via **Qdrant Vector Database** combined with sparse **BM25 keyword search** and **Fireworks AI Reranker (`fireworks/qwen3-reranker-8b`)**.
- **Multi-Source Ingestion**:
  - Web scraping & text extraction (`BeautifulSoup4`).
  - PDF document processing (`PyPDF`).
  - Raw text document indexing.
- **FastAPI Core**: Automatic OpenAPI / Swagger UI docs accessible at `/api-docs`.
- **CORS & Static Files**: Built-in support for `/uploads` and cross-origin frontend requests.

---

## 🛠️ Setup & Running Locally

1. **Activate Virtual Environment** (or create one):
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

2. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Environment Variables (`.env`)**:
   Ensure `.env` contains the required keys (`FIREWORKS_API_KEY`, `QDRANT_URL`, `QDRANT_API_KEY`, `PORT`, etc.).

4. **Run the Server**:
   ```bash
   python main.py
   ```
   Or using uvicorn directly:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 5000 --reload
   ```

---

## 📌 API Endpoints

- `GET /`: Health status message (`✅ KnowChain LLM Backend running`).
- `GET /health`: Health metrics endpoint.
- `GET /api-docs`: Interactive Swagger UI documentation.
- `POST /chat/query`: Main unified RAG chat endpoint (executes LangGraph workflow).
- `POST /chat/rewrite`: Standalone query rewrite endpoint.
- `POST /chat/index/web`: Index website contents into Qdrant.
- `POST /chat/index/pdf`: Upload and index PDF documents into Qdrant.
- `POST /chat/index/text`: Index raw text snippets into Qdrant.
- `POST /chat/start-session`: Generate a unique session ID.
- `POST /chat/cleanup/{session_id}`: Delete Qdrant vector collections associated with a session.

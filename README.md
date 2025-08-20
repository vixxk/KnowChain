# KnowChain - RAG Playground

KnowChain is a **Retrieval-Augmented Generation (RAG)** playground where you can index PDFs, websites, or plain text and chat with the indexed content. Built with **React.js frontend** and **Node.js/Express backend**, it uses LangChain-based pipelines for vector storage and querying.

---

## Features

- Upload and index **PDFs**, **text**, and **website URLs**.
- Chat with your indexed data using a **retrieval-augmented LLM**.
- Supports live indexing with progress indicators.
- Fixed-size chat panel with scrollable messages.
- PDF uploads and text inputs are fully styled with proper buttons.
- Notes shown for indexing duration for large documents.
- Backend RAG pipeline located in `backend/rag`.
- Gemini model supports only **100 chunks**, so automatic division of data is handled.

---

## Project Structure

```
KnowChain/
│
├─ backend/
│  ├─ controllers/
│  │  └─ chatController.js
│  ├─ rag/ # RAG related logic
│  ├─ routes/
│  ├─ uploads/
│  ├─ utils/
│  │  └─ indexers.js # PDF, text, web indexing
│  ├─ .env
│  ├─ server.js
│  └─ package.json
│
├─ frontend/
│  ├─ public/
│  ├─ src/
│  │  ├─ assets/
│  │  ├─ components/
│  │  │  ├─ ChatPanel.jsx
│  │  │  └─ DataSourcePanel.jsx
│  │  ├─ api.js # frontend API calls
│  │  ├─ App.jsx
│  │  ├─ App.css
│  │  ├─ index.css
│  │  └─ main.jsx
│  ├─ .env
│  └─ package.json
│
└─ .gitignore
```

---

## Installation

### Backend

```bash
cd backend
npm install
```

Create a `.env` file in backend:

```env
PORT=5000
GEMINI_API_KEY=your_gemini_key
```

Start the backend:

```bash
node server.js
```

### Frontend

```bash
cd frontend
npm install
```

Create a `.env` in frontend:

```env
VITE_API_URL=http://localhost:5000
```

Start the frontend:

```bash
npm run dev
```

---

## Usage

Open the frontend in your browser (http://localhost:5173 by default).

In the **Data Source Panel**, you can:

- Paste text to index.
- Enter a website URL to index.
- Upload a PDF file.
- Click the Submit / Index Website / Upload PDF buttons.

> Note: Large documents may take time to index.

Use the **Chat Panel** to ask questions about your indexed data.

---

## Notes

- If you want to check just the RAG part, explore the `backend/rag` folder.
- Gemini model only accepts 100 chunks per request, so the project automatically splits content into smaller chunks for processing.

---

## Dependencies

**Backend:**

- Express
- Multer (for file uploads)
- OpenAI SDK
- LangChain
- Other packages mentioned in `package.json`

**Frontend:**

- React.js
- Vite
- Axios for API calls
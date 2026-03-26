# KnowChain AI v2.0 - Intelligence Workspace

KnowChain is a high-fidelity, private RAG (Retrieval-Augmented Generation) application designed for high-performance intelligence analysis. It allows users to "sync" websites, PDFs, and text snippets into a **Neural Feed**, creating a private knowledge layer for local interaction.

## 🚀 Key Features

- **Neural Feed (RAG)**: Multi-source retrieval engine that allows querying across multiple websites and documents simultaneously.
- **Smart Web Scraping**: Advanced content extraction that filters out navigation, footers, and sidebars to focus on relevant text.
- **Neural Rewrite/Enhance**: Automatic prompt optimization using AI to improve search relevance before querying.
- **Architectural Visualization**: Automatic image generation for complex concepts using smart visual anchors.
- **Dual-Session Management**: Maintains multiple chat contexts with independent knowledge units.
- **Privacy First**: All active session data is stored in **local storage**, ensuring zero server-side state for user history.
- **Mobile Responsive**: Floating bottom navigation and optimized hub for desktop-to-mobile parity.

## 🛠️ Technical Stack

- **Large Language Model (LLM)**: `Mixtral-8x22B-Instruct` via Fireworks AI.
- **Embedding Model**: `nomic-embed-text-v1.5` for high-precision vectorization.
- **Vector Database**: `Qdrant` (High-performance vector storage and retrieval).
- **Web Scraping**: `Cheerio` + `Axios` with custom content extraction rules.
- **Frontend**: `React` + `Tailwind CSS` for a premium, glass-morphism aesthetic.
- **Backend**: `Node.js` + `Express` with partitioned RAG workflows.

## ⚙️ Configuration

Create a `.env` file in the `backend` directory with the following:

```env
FIREWORKS_API_KEY=your_fireworks_api_key
QDRANT_URL=your_qdrant_url
QDRANT_API_KEY=your_qdrant_api_key
PORT=5000
```

## 📦 Installation

1. **Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

2. **Backend**:
   ```bash
   cd backend
   npm install
   npm start
   ```

## 🔒 Security & Privacy

KnowChain is built to be secure by design:
- **Zero-Storage Logic**: The backend generates temporary session IDs but stores no chat history. All conversation logs and UI states are maintained in the user's **Local Storage**.
- **Ephemeral Context**: Session-specific knowledge units (Qdrant collections) are automatically cleaned up when the session is closed from the UI.
# Workspace Rules & Architecture Guidelines

This file defines the project design system, stack selections, and rules for coding assistants working in this repository. Follow these specifications to avoid repeating architectural planning.

---

## 1. Core Architecture Stack

* **Frontend**: Vite + React (JavaScript) located in the `/frontend` directory.
  * **Port**: Runs on `http://localhost:5173`
  * **Styling**: Modern, premium Vanilla CSS only (defined in `frontend/src/index.css`). **Avoid TailwindCSS** unless explicitly requested.
  * **Libraries**: React standard hooks, inline SVGs, and `lucide-react` for dashboard icons.
* **Backend**: FastAPI (Python 3.14) located in the `/backend` directory.
  * **Port**: Runs on `http://localhost:8000`
  * **Service Runner**: Uvicorn.
  * **Environment**: Local python virtual environment (located in the scratch directory or local workspace configuration).

---

## 2. RAG & Vector Database Standards

* **Vector DB**: **ChromaDB** is the project's vector store standard.
  * **Persistence**: Client operates as a persistent database saving files in `backend/chroma_db/`.
  * **Embedding Model**: Default SentenceTransformers `all-MiniLM-L6-v2` ONNX model downloaded locally. Do not replace this with other embedding APIs unless instructed.
  * **Safe Collection Purging**: To reload the database, always query the collection items and clear them using `collection.delete(ids=...)` rather than deleting the collection namespace. This prevents SQLite lock exceptions.
* **LLM Integration**: **DeepSeek API** (`deepseek-chat` model) in a **hybrid setup**.
  * **Endpoint**: OpenAI-compatible client connecting to `https://api.deepseek.com/v1`.
  * **Credentials**: Configured dynamically via client-supplied header or backend `.env` (`DEEPSEEK_API_KEY`).

---

## 3. Dynamic Re-indexing Mechanics

* **Reload Endpoint**: Backend exposes `/api/reload` (POST) to reload and re-index resource documents.
* **Synchronization Policy**: When documents inside the `resources/` folder are added, updated, or removed, the UI calls `/api/reload` to drop previous IDs and re-index current files. The backend automatically reflects these changes on the fly. Do not require application restarts for document updates.

---

## 4. Coding & Behavior Constraints

* **No Redundant Plans**: Do not write new implementation plans proposing alternative vector stores (like Pinecone/FAISS) or frameworks (like LangChain/LlamaIndex). The ChromaDB + FastAPI + React hybrid architecture is established.
* **File Types**: Continue to support `.xlsx` (using `openpyxl`), `.docx` (using `python-docx`), `.pptx` (using `python-pptx`), and `.pdf` (using `pypdf`) parsing.
* **Aesthetics**: Maintain the glassmorphism dark theme layout inside `index.css`.

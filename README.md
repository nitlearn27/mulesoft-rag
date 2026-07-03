# Integration Architect AI — MuleSoft RAG Agent & MCP Server

**Integration Architect AI** is an enterprise RAG (Retrieval-Augmented Generation) AI assistant designed to index, query, audit, and debug MuleSoft integration architecture, development guidelines, design schemas, and operations logs. 

This repository functions as a full-stack web application (FastAPI + React) and also exposes a standard **Model Context Protocol (MCP)** server interface, allowing Claude Desktop or other MCP-compatible clients to directly query your enterprise integration knowledge base.

---

## Architecture Overview

* **Frontend (`/frontend`)**: React + Vite application providing an interactive glassmorphism UI for chatting with the agent, uploading/managing files, viewing database schemas, generating architecture diagrams, debugging error logs, and running Domain-Driven Design (DDD) compliance audits.
* **Backend (`/backend`)**: FastAPI server providing API endpoints, orchestrating RAG queries, managing document uploads/deletions, and running the vector database.
* **Vector Database**: **ChromaDB** is used as a local persistent database (`backend/chroma_db/`).
* **Embeddings**: SentenceTransformers `all-MiniLM-L6-v2` runs locally to compute vector representations.
* **LLM Setup**: OpenAI-compatible Python client connecting to **DeepSeek API** (`deepseek-chat` model).
* **Document Parsing**: Standard supports for `.xlsx` (using `openpyxl`), `.docx` (using `python-docx`), `.pptx` (using `python-pptx`), and `.pdf` (using `pypdf`) parsing. Embedded images (e.g. architecture diagrams) are OCR-indexed via `rapidocr` as "reference diagram" chunks, so diagram generation can mirror the reference architectures in your documents. Re-run indexing (Reload) after upgrading to pick up images in existing documents.
* **Dynamic Indexing**: Auto-indexes all files located in the `resources/` folder upon server startup or dynamically via the `/api/reload` endpoint.

---

## Prerequisites

* **Python**: Python 3.10+ (Python 3.14+ fully supported with PyO3 compatibility flags).
* **Node.js**: Node 18+ and `npm`.
* **API Key**: A valid `DEEPSEEK_API_KEY` (required only if running the full-stack web application).

---

## Installation & Setup

### 1. Clone the Repository
Clone this repository to your local machine:
```bash
git clone https://github.com/nitlearn27/mulesoft-rag.git
cd mulesoft-rag
```

### 2. Setup the Python Virtual Environment
You can either run the automated setup script or set up the environment manually.

#### Option A: Run the Automated Setup Script (Recommended)
This script automatically detects mature Python candidates (like Python 3.12 or 3.13) to avoid compilation issues, sets up the virtual environment, and installs all dependencies:
```bash
# Run the setup script from the workspace directory
bash /path/to/your/workspace/mulesoft-rag/setup_venv.sh

# Or run using your local developer path:
bash /Users/niteshmahto/Documents/ClaudeCode/Custom-MCP/mulesoft-rag/setup_venv.sh
```

#### Option B: Manual Setup
Create and activate a virtual environment manually, then install the required backend dependencies:
```bash
# Create the virtual environment
python3 -m venv .venv

# Activate it (macOS/Linux)
source .venv/bin/activate

# Activate it (Windows PowerShell)
# .venv\Scripts\Activate.ps1

# Install dependencies
pip install -r backend/requirements.txt
```


---

## Quick Start: Test the Web Dashboard Locally

If setup is already done (`.venv` exists and `frontend/node_modules` installed), start both servers from the repository root:

```bash
# Terminal 1 — Backend (http://localhost:8000)
.venv/bin/python -m uvicorn backend.main:app --reload --port 8000

# Terminal 2 — Frontend (http://localhost:5173)
cd frontend && npm run dev
```

Then open **http://localhost:5173** in your browser.

Sanity checks:
```bash
curl http://localhost:8000/api/status   # should report "healthy" with chunks_loaded > 0
```

> [!TIP]
> `RESOURCES_DIR` in `backend/.env` controls which folder gets indexed. It should point to this repo's `resources/` folder — if `/api/status` shows a different `resources_dir`, fix it there and restart the backend.

To stop the servers, press `Ctrl+C` in each terminal.

---

## Running the Full-Stack Web Application

### 1. Start the Backend Server
1. Create a `backend/.env` file in the backend folder:
   ```env
   DEEPSEEK_API_KEY=your_deepseek_api_key_here
   ```
2. Run the FastAPI backend using Uvicorn:
   ```bash
   # From the repository root
   python -m uvicorn backend.main:app --reload --port 8000
   ```
   * The API will be available at `http://localhost:8000`.

### 2. Start the Frontend Server
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install npm dependencies and run the server:
   ```bash
   npm install
   npm run dev
   ```
   * The UI dashboard will be available at `http://localhost:5173`.

---

## Architecture Diagram Studio

The **Architecture Diagrams** tab generates professional, document-grounded **Mermaid** diagrams from a plain-language description of an integration flow. The backend retrieves relevant architecture context from the vector database and prompts the LLM to draw the flow using MuleSoft API-led conventions (Experience / Process / System layer subgraphs, real API names from your documents, per-layer styling).

* **Diagram types**: Flowchart, Sequence, C4 Context, Component.
* **Exports**: Copy Mermaid source, download `.mmd` / `.svg` / `.png`, or open directly in the Mermaid Live editor.
* **draw.io**: paste the copied Mermaid via *Insert → Advanced → Mermaid*.
* **Lucidchart**: use *Import → Mermaid* and paste the copied code.
* Diagrams also render inline in **Architect Chat** whenever the agent responds with a ```` ```mermaid ```` code block (e.g. "draw the patient enrollment flow as a diagram").
* If a generated diagram has a syntax error, the app automatically asks the LLM to repair it once before falling back to showing the raw Mermaid source.

---

## Using as a Model Context Protocol (MCP) Server

This project implements the Model Context Protocol (MCP) using the python `mcp` SDK. By adding it to your Claude Desktop configuration, you can empower Claude to search your MuleSoft documentation, audit API specifications, or debug error logs.

> [!NOTE]
> When using as an MCP server, **no DeepSeek API key is required**. Claude Desktop will use its own native reasoning engine to perform audits and debug logs based on local document context retrieved by the server.

### Exposed MCP Tools

1. **`list_indexed_documents()`**
   * Lists all documents currently indexed in the vector database and the number of text chunks created for each file.
2. **`reload_index()`**
   * Forces a re-scan of the `resources/` folder, parsing any new or updated files and updating ChromaDB.
3. **`search_integration_docs(query: str, limit: int = 5)`**
   * Searches the vector database for matching enterprise MuleSoft design guidelines, naming conventions, and architecture standards.
4. **`retrieve_ddd_rules_for_audit(api_name: str, description: str, endpoints: list[str], systems_connected: list[str])`**
   * Retrieves relevant Domain-Driven Design (DDD) guidelines from the vector database for the proposed API and returns them along with instructions. Claude Desktop will perform the audit using its own reasoning.
5. **`retrieve_error_handling_standards(log: str)`**
   * Retrieves corporate error handling standards matching the raw log. Claude Desktop will analyze the log and generate the operational remediation and mappings.
6. **`retrieve_diagram_context(description: str, diagram_type: str = "flowchart")`**
   * Retrieves integration architecture context for the described flow along with Mermaid generation rules. Claude Desktop will draw a professional, document-grounded architecture diagram (flowchart, sequence, C4 context, or component).



### Setting Up with Claude Desktop

To register this server with Claude Desktop, edit your local `claude_desktop_config.json` configuration file:

* **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
* **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

Add the server configuration to the `mcpServers` object, replacing `/path/to/your/workspace/mulesoft-rag` with the **absolute path** to your cloned repository:

```json
{
  "mcpServers": {
    "mulesoft-rag-mcp": {
      "command": "/path/to/your/workspace/mulesoft-rag/.venv/bin/python",
      "args": [
        "/path/to/your/workspace/mulesoft-rag/backend/mcp_server.py"
      ],
      "env": {
        "RESOURCES_DIR": "/path/to/your/workspace/mulesoft-rag/resources"
      }
    }
  }
}
```

> [!IMPORTANT]
> The paths under `command`, `args`, and `env.RESOURCES_DIR` **must be absolute paths**. Make sure to replace `/path/to/your/workspace/mulesoft-rag` with your actual local repository path.

### Testing the MCP Server Directly

You can test the MCP server in your terminal via the `mcp dev` tool (part of the MCP SDK):

```bash
# Make sure your virtual environment is active
source .venv/bin/activate
export RESOURCES_DIR="/path/to/your/workspace/mulesoft-rag/resources"
mcp dev backend/mcp_server.py
```
This launches a development console to inspect the tools and trigger executions directly.

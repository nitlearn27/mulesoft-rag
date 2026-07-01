# MuleSoft Integration RAG AI Agent & MCP Server

An enterprise RAG (Retrieval-Augmented Generation) AI assistant designed to index, query, audit, and debug MuleSoft integration architecture, development guidelines, design schemas, and operations logs. 

This repository functions as a full-stack web application (FastAPI + React) and also exposes a standard **Model Context Protocol (MCP)** server interface, allowing Claude Desktop or other MCP-compatible clients to directly query your enterprise integration knowledge base.

---

## Architecture Overview

* **Frontend (`/frontend`)**: React + Vite application providing an interactive glassmorphism UI for chatting with the agent, uploading/managing files, viewing database schemas, debugging error logs, and running Domain-Driven Design (DDD) compliance audits.
* **Backend (`/backend`)**: FastAPI server providing API endpoints, orchestrating RAG queries, managing document uploads/deletions, and running the vector database.
* **Vector Database**: **ChromaDB** is used as a local persistent database (`backend/chroma_db/`).
* **Embeddings**: SentenceTransformers `all-MiniLM-L6-v2` runs locally to compute vector representations.
* **LLM Setup**: OpenAI-compatible Python client connecting to **DeepSeek API** (`deepseek-chat` model).
* **Document Parsing**: Standard supports for `.xlsx` (using `openpyxl`), `.docx` (using `python-docx`), `.pptx` (using `python-pptx`), and `.pdf` (using `pypdf`) parsing.
* **Dynamic Indexing**: Auto-indexes all files located in the [resources/](file:///Users/niteshmahto/Documents/ClaudeWorkspace/Mulesoft-RAG/resources) folder upon server startup or dynamically via the `/api/reload` endpoint.

---

## Prerequisites

* **Python**: Python 3.14+ (System Python 3.9+ works, but 3.14.5+ is fully configured with PyO3 compatibility flags).
* **Node.js**: Node 18+ and `npm`.
* **API Key**: A valid `DEEPSEEK_API_KEY` defined in `backend/.env`.

---

## 1. Running as a Full-Stack Web Application

### Backend Startup

1. Navigate to the root directory and activate your virtual environment:
   ```bash
   cd /Users/niteshmahto/Documents/ClaudeWorkspace/Mulesoft-RAG
   source .venv/bin/activate
   ```
2. Install Python dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```
3. Create a `backend/.env` file with your DeepSeek key:
   ```env
   DEEPSEEK_API_KEY=your_deepseek_api_key_here
   ```
4. Start the backend server:
   ```bash
   python -m uvicorn backend.main:app --reload --port 8000
   ```
   * The API will be available at `http://localhost:8000`.

### Frontend Startup

1. Open a new terminal tab and navigate to the frontend directory:
   ```bash
   cd /Users/niteshmahto/Documents/ClaudeWorkspace/Mulesoft-RAG/frontend
   ```
2. Install Node dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
   * The UI will be available at `http://localhost:5173`.

---

## 2. Using as a Model Context Protocol (MCP) Server

This project implements the Model Context Protocol (MCP) using the python `mcp` SDK. By adding it to your Claude Desktop configuration, you can empower Claude to search your MuleSoft documentation, audit API specifications, or debug error logs.

### Exposed MCP Tools

1. **`search_integration_docs(query: str, limit: int = 5)`**
   * Searches the vector database for matching enterprise MuleSoft design guidelines, naming conventions, and architecture standards.
2. **`audit_api_design(api_name: str, description: str, endpoints: list[str], systems_connected: list[str])`**
   * Run a proposed API schema against enterprise Domain-Driven Design (DDD) specifications (systems decoupling, noun-based naming, canonical models, and ingestion/processing split).
3. **`debug_mule_error(log: str)`**
   * Paste a raw error log, trace, or JSON payload to retrieve operation recommendations (Business vs Platform recovery) and suggested DataWeave or Mule XML configuration fixes.

### Setting Up with Claude Desktop

To register this server with Claude Desktop, edit your local `claude_desktop_config.json` configuration file:

* **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
* **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

Add the server config to the `mcpServers` object:

```json
{
  "mcpServers": {
    "mulesoft-rag-mcp": {
      "command": "/Users/niteshmahto/Documents/ClaudeWorkspace/Mulesoft-RAG/.venv/bin/python",
      "args": [
        "/Users/niteshmahto/Documents/ClaudeWorkspace/Mulesoft-RAG/backend/mcp_server.py"
      ],
      "env": {
        "DEEPSEEK_API_KEY": "your_deepseek_api_key_here",
        "RESOURCES_DIR": "/Users/niteshmahto/Documents/ClaudeWorkspace/Mulesoft-RAG/resources"
      }
    }
  }
}
```

> [!IMPORTANT]
> Make sure to replace `your_deepseek_api_key_here` with your actual DeepSeek API Key. Ensure that absolute paths point to your actual local workspace directories.

### Testing the MCP Server Directly

You can test the MCP server in your terminal via the `mcp dev` tool (part of the MCP SDK):

```bash
source .venv/bin/activate
export DEEPSEEK_API_KEY="your_api_key"
export RESOURCES_DIR="/Users/niteshmahto/Documents/ClaudeWorkspace/Mulesoft-RAG/resources"
mcp dev backend/mcp_server.py
```
This launches a development console on `http://localhost:5173` (or another available port) to inspect the tools and trigger executions directly.

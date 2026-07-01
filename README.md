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
Create and activate a virtual environment, then install the required backend dependencies:
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

## Using as a Model Context Protocol (MCP) Server

This project implements the Model Context Protocol (MCP) using the python `mcp` SDK. By adding it to your Claude Desktop configuration, you can empower Claude to search your MuleSoft documentation, audit API specifications, or debug error logs.

> [!NOTE]
> When using as an MCP server, **no DeepSeek API key is required**. Claude Desktop will use its own native reasoning engine to perform audits and debug logs based on local document context retrieved by the server.

### Exposed MCP Tools

1. **`search_integration_docs(query: str, limit: int = 5)`**
   * Searches the vector database for matching enterprise MuleSoft design guidelines, naming conventions, and architecture standards.
2. **`retrieve_ddd_rules_for_audit(api_name: str, description: str, endpoints: list[str], systems_connected: list[str])`**
   * Retrieves relevant Domain-Driven Design (DDD) guidelines from the vector database for the proposed API and returns them along with instructions. Claude Desktop will perform the audit using its own reasoning.
3. **`retrieve_error_handling_standards(log: str)`**
   * Retrieves corporate error handling standards matching the raw log. Claude Desktop will analyze the log and generate the operational remediation and mappings.

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

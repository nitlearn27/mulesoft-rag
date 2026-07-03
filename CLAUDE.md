# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"Integration Architect AI" — an enterprise RAG assistant for MuleSoft integration documentation. One shared RAG engine is exposed through two independent entry points:

1. **FastAPI web app** (`backend/main.py`) — full-stack app with a React frontend; uses the DeepSeek LLM to generate answers (requires `DEEPSEEK_API_KEY`).
2. **MCP server** (`backend/mcp_server.py`) — FastMCP stdio server for Claude Desktop; retrieval-only, no LLM key needed (the MCP tools return retrieved context + instructions and let the client model do the reasoning).

## Commands

```bash
# One-time setup (recreates .venv; picks python3.12/3.13 over 3.14 due to pinned-dep compatibility)
bash setup_venv.sh

# Backend — run from repo root (imports use the backend.* package path)
source .venv/bin/activate
python -m uvicorn backend.main:app --reload --port 8000

# Frontend (http://localhost:5173)
cd frontend && npm install && npm run dev
npm run lint        # oxlint
npm run build       # vite build

# RAG engine smoke test (no test framework in this repo)
python backend/test_search.py

# MCP server dev console
export RESOURCES_DIR="$(pwd)/resources"
mcp dev backend/mcp_server.py
```

## Architecture

```
resources/*.{xlsx,docx,pptx,pdf}          (gitignored source documents)
        │  incrementally synced on startup / reload (mtime+size fingerprint)
        ▼
backend/rag_engine.py  ── ChromaSearchEngine (module-level singleton `engine`)
        │  persists to backend/chroma_db/, collection "integration_repository"
        │  embeddings: Chroma default SentenceTransformer (all-MiniLM-L6-v2, local)
        ├──► backend/main.py       FastAPI endpoints (/api/chat, /api/search,
        │                          /api/debug-error, /api/audit-ddd, /api/generate-diagram,
        │                          upload/delete/reload)
        │                          → ask_deepseek_llm() calls DeepSeek chat API via httpx
        └──► backend/mcp_server.py FastMCP tools (search_integration_docs,
                                   retrieve_ddd_rules_for_audit,
                                   retrieve_error_handling_standards,
                                   retrieve_diagram_context,
                                   list_indexed_documents, reload_index)
```

- **`rag_engine.py` is the core** — document parsing (per-format `_parse_*` methods with format-specific chunking), ChromaDB init, and vector search all live here. Both entry points call `get_engine(force_reload=...)`; a load/reload is an **incremental sync** against the persisted collection — only files whose mtime+size fingerprint changed are re-parsed/re-OCR'd/re-embedded (chunk ids are `{filename}::{n}`), deleted files' chunks are removed, everything else is reused as-is. Delete `backend/chroma_db/` to force a full rebuild. CPU is capped at `RAG_MAX_THREADS` (default 4) threads for BLAS/onnxruntime (OCR + embeddings), and images are downscaled to ≤2000px before OCR.
- **Frontend** (`frontend/src/`): React 19 + Vite, single `App.jsx` shell with tab components in `src/components/` (Chat, Auditor, Debugger, Visualizer, DocExplorer, Diagram). API base URL `http://localhost:8000` is hardcoded in the components — there is no proxy or env config.
- **Diagrams**: `/api/generate-diagram` and the MCP `retrieve_diagram_context` tool share `MERMAID_RULES` in `rag_engine.py` (Mermaid output contract: one fence, API-led layer subgraphs, per-layer classDefs). Embedded images in documents are OCR-indexed (rapidocr, lazy-loaded) as chunks with metadata `type: "diagram"`; diagram generation merges a `where={"type": "diagram"}` search ahead of the standard search so reference diagrams get mirrored rather than invented. The frontend renders Mermaid via `MermaidDiagram.jsx` (also used for ```mermaid fences in chat) with a one-shot LLM syntax-repair retry driven by `DiagramTab.jsx`.
- `/api/mapping-visualizer` reads a specific hardcoded file: `resources/Enterprise_API_Directory_and_Data_Mappings.xlsx`.

## Gotchas

- **`RESOURCES_DIR` env var**: `rag_engine.py` falls back to a stale hardcoded absolute path if unset. When running the MCP server or backend outside the original machine layout, set `RESOURCES_DIR` explicitly (Claude Desktop config passes it via `env`).
- Config lives in `backend/.env` (`DEEPSEEK_API_KEY`, optional `DEEPSEEK_API_BASE`); the UI can also supply a per-request `apiKey` that overrides the env key.
- `resources/` and `backend/chroma_db/` are local state — untracked/ignored; don't commit them.
- Claude Desktop MCP registration requires **absolute paths** for the venv python, `mcp_server.py`, and `RESOURCES_DIR` (see README for the config snippet).

import os
import re
import httpx
import json
import numpy as np
import openpyxl
from docx import Document
from pptx import Presentation
from pypdf import PdfReader
from dotenv import load_dotenv
import chromadb
from chromadb.utils import embedding_functions

load_dotenv()

RESOURCES_DIR = os.getenv("RESOURCES_DIR", "/Users/niteshmahto/Documents/ClaudeWorkspace/Test/RAG-test1/resources")
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
DEEPSEEK_API_BASE = os.getenv("DEEPSEEK_API_BASE", "https://api.deepseek.com/v1")
CHROMA_DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "chroma_db")

class DocumentChunk:
    def __init__(self, chunk_id, filename, content, metadata=None):
        self.id = chunk_id
        self.filename = filename
        self.content = content
        self.metadata = metadata or {}

class ChromaSearchEngine:
    def __init__(self):
        self.chunks = []
        self.client = None
        self.collection = None
        self.embedding_function = None

    def initialize_chroma(self):
        if self.client is not None:
            return
            
        print(f"Initializing Persistent ChromaDB Client at: {CHROMA_DB_PATH}")
        self.client = chromadb.PersistentClient(path=CHROMA_DB_PATH)
        
        # Use default lightweight SentenceTransformer embeddings (downloads all-MiniLM-L6-v2)
        print("Loading default Chroma SentenceTransformer embedding function...")
        self.embedding_function = embedding_functions.DefaultEmbeddingFunction()
        
        # Get or create collection
        self.collection = self.client.get_or_create_collection(
            name="integration_repository",
            embedding_function=self.embedding_function
        )

    def load_and_index_documents(self):
        self.initialize_chroma()
        self.chunks = []
        
        if not os.path.exists(RESOURCES_DIR):
            print(f"Resources directory not found: {RESOURCES_DIR}")
            return
            
        files = os.listdir(RESOURCES_DIR)
        chunk_counter = 0
        
        for filename in files:
            filepath = os.path.join(RESOURCES_DIR, filename)
            if os.path.isdir(filepath) or filename.startswith('.'):
                continue
                
            ext = os.path.splitext(filename)[1].lower()
            try:
                if ext == '.xlsx':
                    self._parse_xlsx(filename, filepath, chunk_counter)
                elif ext == '.docx':
                    self._parse_docx(filename, filepath, chunk_counter)
                elif ext == '.pptx':
                    self._parse_pptx(filename, filepath, chunk_counter)
                elif ext == '.pdf':
                    self._parse_pdf(filename, filepath, chunk_counter)
                chunk_counter = len(self.chunks)
            except Exception as e:
                print(f"Error parsing {filename}: {e}")
                
        print(f"Parsed {len(self.chunks)} chunks from resources.")
        
        # Re-populate Chroma Collection
        if len(self.chunks) > 0:
            print("Resetting and inserting chunks into ChromaDB collection...")
            try:
                self.collection = self.client.get_collection(
                    name="integration_repository",
                    embedding_function=self.embedding_function
                )
                existing = self.collection.get()
                if existing and 'ids' in existing and len(existing['ids']) > 0:
                    self.collection.delete(ids=existing['ids'])
            except Exception:
                self.collection = self.client.get_or_create_collection(
                    name="integration_repository",
                    embedding_function=self.embedding_function
                )
            
            # Prepare arrays for insertion
            documents = []
            metadatas = []
            ids = []
            
            for chunk in self.chunks:
                # Add filename to metadata
                chunk.metadata["filename"] = chunk.filename
                
                documents.append(chunk.content)
                metadatas.append(chunk.metadata)
                ids.append(chunk.id)
                
            # Insert in batches of 100 to avoid limits
            batch_size = 100
            for i in range(0, len(documents), batch_size):
                end_idx = i + batch_size
                self.collection.add(
                    documents=documents[i:end_idx],
                    metadatas=metadatas[i:end_idx],
                    ids=ids[i:end_idx]
                )
            print(f"Successfully indexed {len(self.chunks)} chunks in ChromaDB vector store.")

    def _parse_xlsx(self, filename, filepath, start_idx):
        wb = openpyxl.load_workbook(filepath, read_only=True)
        idx = start_idx
        for sheetname in wb.sheetnames:
            sheet = wb[sheetname]
            rows = []
            for r_idx, row in enumerate(sheet.iter_rows(values_only=True)):
                if any(c is not None for c in row):
                    row_str = " | ".join(str(c) if c is not None else "" for c in row)
                    rows.append(f"Row {r_idx+1}: {row_str}")
            
            chunk_size = 15
            for i in range(0, len(rows), chunk_size):
                chunk_rows = rows[i:i+chunk_size]
                content = f"Document: {filename}\nSheet: {sheetname}\n" + "\n".join(chunk_rows)
                metadata = {
                    "sheet": sheetname,
                    "type": "spreadsheet",
                    "rows": f"{i+1}-{i+len(chunk_rows)}"
                }
                self.chunks.append(DocumentChunk(f"chunk_{idx}", filename, content, metadata))
                idx += 1

    def _parse_docx(self, filename, filepath, start_idx):
        doc = Document(filepath)
        paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
        
        for t_idx, table in enumerate(doc.tables):
            table_rows = []
            for r_idx, row in enumerate(table.rows):
                cells = [cell.text.strip() for cell in row.cells]
                table_rows.append(" | ".join(cells))
            paragraphs.append(f"[Table {t_idx+1} Content]:\n" + "\n".join(table_rows))
            
        idx = start_idx
        current_chunk = []
        current_len = 0
        
        for p in paragraphs:
            current_chunk.append(p)
            current_len += len(p)
            if current_len >= 1200:
                content = f"Document: {filename}\n" + "\n\n".join(current_chunk)
                self.chunks.append(DocumentChunk(f"chunk_{idx}", filename, content, {"type": "document"}))
                idx += 1
                current_chunk = current_chunk[-1:]
                current_len = len(current_chunk[0])
                
        if current_chunk:
            content = f"Document: {filename}\n" + "\n\n".join(current_chunk)
            self.chunks.append(DocumentChunk(f"chunk_{idx}", filename, content, {"type": "document"}))

    def _parse_pptx(self, filename, filepath, start_idx):
        prs = Presentation(filepath)
        idx = start_idx
        for s_idx, slide in enumerate(prs.slides):
            slide_text = []
            title = f"Slide {s_idx+1}"
            if slide.shapes.title:
                title = slide.shapes.title.text
                slide_text.append(f"Title: {title}")
            for shape in slide.shapes:
                if hasattr(shape, "text") and shape.text.strip():
                    if slide.shapes.title and shape.text == slide.shapes.title.text:
                        continue
                    slide_text.append(shape.text.strip())
            
            content = f"Document: {filename}\nSlide {s_idx+1}: {title}\n" + "\n".join(slide_text)
            self.chunks.append(DocumentChunk(f"chunk_{idx}", filename, content, {
                "slide": s_idx+1,
                "title": title,
                "type": "presentation"
            }))
            idx += 1

    def _parse_pdf(self, filename, filepath, start_idx):
        reader = PdfReader(filepath)
        idx = start_idx
        for p_idx, page in enumerate(reader.pages):
            text = page.extract_text()
            if not text or not text.strip():
                continue
            content = f"Document: {filename}\nPage {p_idx+1}:\n{text}"
            self.chunks.append(DocumentChunk(f"chunk_{idx}", filename, content, {
                "page": p_idx+1,
                "type": "pdf"
            }))
            idx += 1

    def search(self, query, top_k=5):
        self.initialize_chroma()
        if not self.collection:
            return []
            
        try:
            results = self.collection.query(
                query_texts=[query],
                n_results=top_k
            )
            
            retrieved_chunks = []
            if results and 'documents' in results and len(results['documents']) > 0:
                docs = results['documents'][0]
                metadatas = results['metadatas'][0]
                ids = results['ids'][0]
                
                for idx in range(len(docs)):
                    meta = metadatas[idx]
                    filename = meta.get("filename", "unknown")
                    # Recreate DocumentChunk object
                    retrieved_chunks.append(DocumentChunk(
                        chunk_id=ids[idx],
                        filename=filename,
                        content=docs[idx],
                        metadata=meta
                    ))
            return retrieved_chunks
        except Exception as e:
            print(f"Error querying ChromaDB: {e}")
            return []

engine = ChromaSearchEngine()

def get_engine(force_reload=False):
    global engine
    if force_reload or not engine.chunks:
        engine.load_and_index_documents()
    return engine

MERMAID_RULES = """Rules for the Mermaid diagram:
1. Output exactly ONE mermaid code block (```mermaid ... ```). You may add a short 'Notes' section after the block explaining key design decisions; output nothing else before the block.
2. The code must be valid Mermaid syntax. Diagram type mapping: 'flowchart' -> `flowchart LR` (or TD for deep hierarchies), 'sequence' -> `sequenceDiagram`, 'c4' -> `C4Context`, 'component' -> `flowchart TB` with one subgraph per component group.
3. Start the code block with a YAML frontmatter title naming the flow, e.g.:
   ---
   title: Patient Enrollment - Salesforce to Epic FHIR
   ---
4. Follow MuleSoft API-led conventions: group nodes into subgraphs for the Experience Layer, Process Layer, System Layer, and External Systems. Give each subgraph an id and a quoted display label: subgraph EXP["Experience Layer"].
5. Use the real API and system names found in the provided context (kebab-case like sys-epic-patients-v1). Do NOT invent systems or APIs that are not in the context.
6. Use semantic node shapes in flowcharts: rectangles for APIs, cylinders `[("Database")]` for databases, stadiums `(["SaaS Platform"])` for external SaaS systems, and subroutine boxes `[["queue-name"]]` for message queues / topics.
7. For flowcharts, style nodes per layer with these exact classDefs and assign every node a class:
   classDef experience fill:#0e7490,stroke:#22d3ee,stroke-width:1.5px,color:#ffffff
   classDef process fill:#1d4ed8,stroke:#60a5fa,stroke-width:1.5px,color:#ffffff
   classDef system fill:#6d28d9,stroke:#a78bfa,stroke-width:1.5px,color:#ffffff
   classDef external fill:#334155,stroke:#94a3b8,stroke-width:1.5px,color:#e2e8f0
   classDef datastore fill:#065f46,stroke:#34d399,stroke-width:1.5px,color:#ffffff
8. Label every edge with a short protocol/payload/queue tag (e.g. |HTTPS/JSON|, |JMS patient.enroll.q|, |FHIR R4|). Keep edge labels under 25 characters.
9. Node labels: two lines max using <br/> (name on line 1, role on line 2, e.g. A["sys-epic-patients-v1<br/>System API"]). Always quote labels containing special characters; never use parentheses or slashes in unquoted labels.
10. In sequence diagrams: declare participants with short aliases, use activate/deactivate on the main process, `alt`/`opt` blocks for error vs success paths, and `Note over` to call out retry/DLQ policies.
"""

def compute_grounding(response_text: str, context_chunks: list):
    """
    Estimate what share of a response is grounded in the retrieved document chunks
    versus generated from the model's own knowledge.

    Each response segment (sentence or code block) is embedded with the same local
    SentenceTransformer used for indexing; its max cosine similarity against the
    retrieved chunks is mapped onto a 0-1 grounded score, then averaged weighted
    by segment length. This is a heuristic, not an exact attribution.
    """
    try:
        if not response_text or not context_chunks:
            return None
        engine.initialize_chroma()

        segments = []
        for piece in re.split(r'(```[\s\S]*?```)', response_text):
            if piece.startswith('```'):
                body = piece.strip('`').strip()
                if len(body) > 40:
                    segments.append(body[:1000])
            else:
                for sent in re.split(r'(?<=[.!?:])\s+|\n+', piece):
                    sent = re.sub(r'[#*>`]', ' ', sent).strip()
                    if len(sent) > 30:
                        segments.append(sent[:1000])
        if not segments:
            return None

        chunk_texts = [c.content[:2000] for c in context_chunks]
        seg_emb = np.array(engine.embedding_function(segments))
        ctx_emb = np.array(engine.embedding_function(chunk_texts))
        seg_emb = seg_emb / np.linalg.norm(seg_emb, axis=1, keepdims=True)
        ctx_emb = ctx_emb / np.linalg.norm(ctx_emb, axis=1, keepdims=True)
        max_sims = (seg_emb @ ctx_emb.T).max(axis=1)

        # Below LOW cosine similarity a segment counts as pure model knowledge,
        # above HIGH as fully document-grounded; linear in between.
        # Thresholds calibrated against this corpus: unrelated text ~0.05,
        # paraphrased doc content 0.3-0.6, near-verbatim 0.6+.
        LOW, HIGH = 0.20, 0.60
        emb_scores = np.clip((max_sims - LOW) / (HIGH - LOW), 0.0, 1.0)

        # Embeddings under-credit verbatim copies of long chunks (a single copied
        # sentence embeds far from the whole chunk), so also measure word-trigram
        # containment and take the stronger signal per segment.
        def shingles(text):
            words = re.findall(r'[a-z0-9]+', text.lower())
            return set(zip(words, words[1:], words[2:]))

        ctx_shingles = set()
        for c in context_chunks:
            ctx_shingles |= shingles(c.content)

        lex_scores = []
        for s in segments:
            seg_sh = shingles(s)
            lex_scores.append(len(seg_sh & ctx_shingles) / len(seg_sh) if seg_sh else 0.0)

        scores = np.maximum(emb_scores, np.array(lex_scores))
        weights = np.array([min(len(s), 400) for s in segments], dtype=float)
        rag_pct = int(round(float((scores * weights).sum() / weights.sum()) * 100))
        return {
            "rag_pct": rag_pct,
            "model_pct": 100 - rag_pct,
            "segments_scored": len(segments)
        }
    except Exception as e:
        print(f"Error computing grounding score: {e}")
        return None

async def ask_deepseek_llm(query: str, context_chunks: list, user_api_key: str = None, history: list = None) -> str:
    api_key = user_api_key or DEEPSEEK_API_KEY
    if not api_key:
        return "DeepSeek API Key is missing. Please provide your API Key either in the UI settings or backend config."

    context_str = "\n\n---\n\n".join([chunk.content for chunk in context_chunks])
    
    system_prompt = (
        "You are 'Integration Architect AI', an expert integration architect. "
        "Your task is to answer technical questions, design APIs, review compliance, and debug error logs "
        "using only the provided context from the enterprise integration documentation repository.\n\n"
        "Rules:\n"
        "1. Ground your answers strictly in the provided document context. If the document context doesn't contain "
        "the details, state that clearly but provide a reasonable response based on general integration best practices if helpful.\n"
        "2. Provide concrete code snippets (e.g. MuleSoft XML, DataWeave code, JSON schema, or REST endpoints) when requested.\n"
        "3. Maintain a highly professional, expert tone suitable for an Integration Architect.\n"
        "4. Do not mention document chunk IDs or metadata variables unless specifically relevant; refer to files by their actual names.\n"
        "5. When the user asks for an architecture, flow, or sequence diagram, respond with a valid Mermaid diagram "
        "inside a ```mermaid code fence (flowchart LR or sequenceDiagram). Group nodes into subgraphs for the "
        "Experience, Process, and System API layers plus external systems, use the real API/system names from the "
        "context, and label edges with the protocol or queue. The diagram renders on a DARK background: style "
        "flowchart nodes ONLY with these exact classDefs and never invent other fill colors:\n"
        "   classDef experience fill:#0e7490,stroke:#22d3ee,stroke-width:1.5px,color:#ffffff\n"
        "   classDef process fill:#1d4ed8,stroke:#60a5fa,stroke-width:1.5px,color:#ffffff\n"
        "   classDef system fill:#6d28d9,stroke:#a78bfa,stroke-width:1.5px,color:#ffffff\n"
        "   classDef external fill:#334155,stroke:#94a3b8,stroke-width:1.5px,color:#e2e8f0\n"
        "   classDef datastore fill:#065f46,stroke:#34d399,stroke-width:1.5px,color:#ffffff\n\n"
        "CONTEXT FROM ENTERPRISE INTEGRATION REPOSITORY:\n"
        f"{context_str}"
    )

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    messages = [{"role": "system", "content": system_prompt}]
    for m in (history or []):
        role = "assistant" if m.get("role") in ("assistant", "agent") else "user"
        content = m.get("content", "")
        if content:
            messages.append({"role": role, "content": content})
    messages.append({"role": "user", "content": query})

    payload = {
        "model": "deepseek-chat",
        "messages": messages,
        "temperature": 0.2,
        "max_tokens": 2048
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{DEEPSEEK_API_BASE}/chat/completions",
                headers=headers,
                json=payload
            )
            if response.status_code == 200:
                result = response.json()
                return result["choices"][0]["message"]["content"]
            else:
                return f"Error from DeepSeek API (Status Code {response.status_code}): {response.text}"
    except Exception as e:
        return f"Exception occurred while calling DeepSeek API: {str(e)}"

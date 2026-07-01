import os
import sys

# Add parent directory of backend to sys.path so backend module can be imported
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from mcp.server.fastmcp import FastMCP
from backend.rag_engine import get_engine

# Initialize FastMCP Server
mcp = FastMCP("MuleSoft Integration RAG")

@mcp.tool()
async def list_indexed_documents() -> str:
    """
    List all documents currently indexed in the vector database (ChromaDB) and the number of text chunks created for each.
    """
    try:
        engine = get_engine()
        docs = {}
        for chunk in engine.chunks:
            fname = chunk.filename
            if fname not in docs:
                docs[fname] = 0
            docs[fname] += 1
        
        if not docs:
            return "No documents are currently indexed in the vector database."
        
        summary = ["Currently indexed documents in vector database:"]
        for fname, count in docs.items():
            summary.append(f"- {fname} ({count} chunks)")
        return "\n".join(summary)
    except Exception as e:
        return f"Error listing indexed documents: {str(e)}"

@mcp.tool()
async def reload_index() -> str:
    """
    Force a re-scan of the resources directory to index any new, updated, or deleted documents in ChromaDB.
    """
    try:
        engine = get_engine(force_reload=True)
        docs = {}
        for chunk in engine.chunks:
            fname = chunk.filename
            if fname not in docs:
                docs[fname] = 0
            docs[fname] += 1
            
        summary = [f"Successfully re-indexed documents! Current state:"]
        for fname, count in docs.items():
            summary.append(f"- {fname} ({count} chunks)")
        return "\n".join(summary)
    except Exception as e:
        return f"Error reloading index: {str(e)}"

@mcp.tool()
async def search_integration_docs(query: str, limit: int = 5) -> str:
    """
    Search enterprise MuleSoft integration documentation, best practices, and architecture standards in the vector database.
    
    Args:
        query: The search term or architectural question (e.g. "naming conventions", "error handling").
        limit: Max number of relevant source chunks to return.
    """
    try:
        engine = get_engine()
        results = engine.search(query, top_k=limit)
        if not results:
            return "No matching integration guidelines found in the repository."
        
        formatted_results = []
        for r in results:
            formatted_results.append(
                f"=== Source: {r.filename} ===\n"
                f"Content:\n{r.content}\n"
            )
        return "\n---\n".join(formatted_results)
    except Exception as e:
        return f"Error executing document search: {str(e)}"

@mcp.tool()
async def retrieve_ddd_rules_for_audit(api_name: str, description: str, endpoints: list[str], systems_connected: list[str]) -> str:
    """
    Retrieve Domain-Driven Design (DDD) compliance guidelines from the vector database to audit a proposed API design.
    Claude Desktop will use this retrieved context to perform the audit itself.
    
    Args:
        api_name: The name of the API (e.g. "s-salesforce-customer-api").
        description: High-level overview of what the API does.
        endpoints: List of API resource paths (e.g. ["/customers", "/customers/{id}"]).
        systems_connected: Systems of record (e.g. ["Salesforce", "SAP"]).
    """
    try:
        engine = get_engine()
        # Search ChromaDB for relevant DDD architecture guidelines
        search_query = f"Domain Driven Design DDD rules naming convention systems canonical schema {api_name} {description}"
        chunks = engine.search(search_query, top_k=6)
        
        context_blocks = []
        for c in chunks:
            context_blocks.append(f"Source Document: {c.filename}\nContent:\n{c.content}")
            
        proposed_design = (
            f"PROPOSED API DESIGN:\n"
            f"- API Name: {api_name}\n"
            f"- Description: {description}\n"
            f"- Proposed Endpoints: {', '.join(endpoints)}\n"
            f"- Backend Systems Connected: {', '.join(systems_connected)}\n"
        )
        
        return (
            f"{proposed_design}\n"
            f"RELEVANT ENTERPRISE DDD GUIDELINES FROM VECTOR DATABASE:\n"
            f"==========================================================\n"
            + "\n\n---\n\n".join(context_blocks) +
            f"\n==========================================================\n"
            f"Instructions for Claude: Review the proposed API design against the retrieved guidelines. "
            f"Evaluate naming conventions, decoupling layer checks, canonical models, and ingestion/processing splits. "
            f"Provide a compliance score (0-100%), list of violations, and recommended architecture changes."
        )
    except Exception as e:
        return f"Error retrieving DDD guidelines: {str(e)}"

@mcp.tool()
async def retrieve_error_handling_standards(log: str) -> str:
    """
    Retrieve error handling best practices and standards from the vector database to debug a MuleSoft error.
    Claude Desktop will use this retrieved context to analyze the error log and recommend remediations.
    
    Args:
        log: The raw error log, stack trace, or payload representing the error.
    """
    try:
        engine = get_engine()
        # Search ChromaDB for relevant error handling standards
        error_query = f"Error log error handler payload: {log}"
        chunks = engine.search(error_query, top_k=6)
        
        context_blocks = []
        for c in chunks:
            context_blocks.append(f"Source Document: {c.filename}\nContent:\n{c.content}")
            
        return (
            f"USER ERROR LOG TO ANALYZE:\n"
            f"==========================\n"
            f"{log}\n"
            f"==========================\n\n"
            f"RELEVANT ENTERPRISE ERROR HANDLING STANDARDS FROM VECTOR DATABASE:\n"
            f"==================================================================\n"
            + "\n\n---\n\n".join(context_blocks) +
            f"\n==================================================================\n"
            f"Instructions for Claude: Examine the error log. "
            f"1. Identify the Mule Error Type or description.\n"
            f"2. Classify it as a Business/Data Error or System/Transient Error based on the retrieved standards.\n"
            f"3. Recommend standard operations actions (Business remediation vs Platform recovery).\n"
            f"4. Provide recommended DataWeave Mapping or Mule XML Config block (such as redelivery-policy or error-handler structure) relevant to this error."
        )
    except Exception as e:
        return f"Error retrieving error handling standards: {str(e)}"

if __name__ == "__main__":
    mcp.run()

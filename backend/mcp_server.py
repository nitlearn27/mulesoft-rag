import os
import sys

# Add parent directory of backend to sys.path so backend module can be imported
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from mcp.server.fastmcp import FastMCP
from backend.rag_engine import get_engine, ask_deepseek_llm

# Initialize FastMCP Server
mcp = FastMCP("MuleSoft Integration RAG")

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
async def audit_api_design(api_name: str, description: str, endpoints: list[str], systems_connected: list[str]) -> str:
    """
    Audit a proposed API design for Domain-Driven Design (DDD) compliance against enterprise guidelines.
    
    Args:
        api_name: The name of the API (e.g. "s-salesforce-customer-api").
        description: High-level overview of what the API does.
        endpoints: List of API resource paths (e.g. ["/customers", "/customers/{id}"]).
        systems_connected: Systems of record (e.g. ["Salesforce", "SAP"]).
    """
    try:
        engine = get_engine()
        search_query = "Domain Driven Design DDD rules naming convention systems canonical schema"
        chunks = engine.search(search_query, top_k=6)
        
        prompt = (
            "Review this proposed API design against the enterprise Domain-Driven Design (DDD) specifications "
            "laid out in 'Sample Mulesoft docs1.pdf':\n\n"
            f"API Name: {api_name}\n"
            f"Description: {description}\n"
            f"Endpoints: {', '.join(endpoints)}\n"
            f"Backend Systems Connected: {', '.join(systems_connected)}\n\n"
            "Audit the proposal on:\n"
            "1. Naming Conventions: (Is the API noun-based/domain-centric? Are regional identifiers na/emea or system names sf/sap leaked in the API name?)\n"
            "2. System Decoupling: (Does it connect directly to System APIs, or bypass process layers?)\n"
            "3. Canonical Models: (Does it represent a unified business domain case/shipment/order instead of system-specific views?)\n"
            "4. Queueing/Ingestion Split: (Should event ingestion be separated from processing via listener and publisher flows?)\n\n"
            "Provide a compliance score (0-100%), list of violations, and recommended architecture changes in Markdown."
        )
        
        response = await ask_deepseek_llm(prompt, chunks)
        return response
    except Exception as e:
        return f"Error executing API audit: {str(e)}"

@mcp.tool()
async def debug_mule_error(log: str) -> str:
    """
    Analyze a raw MuleSoft error log and return operation/remediation recommendations based on corporate standards.
    
    Args:
        log: The raw error message, stack trace, or payload representing the error.
    """
    try:
        engine = get_engine()
        error_query = f"Error log error handler payload: {log}"
        chunks = engine.search(error_query, top_k=6)
        
        system_prompt = (
            "You are 'Antigravity MuleSoft Error Log Debugger'. Paste and examine the user's raw error log.\n"
            "1. Identify the Mule Error Type (e.g. VALIDATION:INVALID_BOOLEAN, HTTP:CONNECTIVITY, etc.) or description.\n"
            "2. Retrieve details from 'Sample error test 3.pdf' or 'MuleSoft_Development_Best_Practices_and_Standards.docx' "
            "to classify the error category:\n"
            "   - Business / Data Error: Bad input data. Action: ACK message, log payload/message to Salesforce Custom Object Integration_Error__c.\n"
            "   - System / Transient Error: Infrastructure/network down. Action: NACK/Rollback transaction, retry (max 3 times), DLQ on exhaustion.\n"
            "3. Provide the standard operational recommendation (Business remediation vs Platform recovery).\n"
            "4. Output the recommended DataWeave Mapping or Mule XML Config block (such as VM/JMS listener redelivery-policy, or error-handler structure) "
            "relevant to this error.\n"
            "Answer in clean Markdown format."
        )
        
        from backend.rag_engine import DocumentChunk
        dummy_chunk = DocumentChunk("error_analysis", "System context", system_prompt)
        
        context_str = "\n\n---\n\n".join([chunk.content for chunk in chunks])
        full_prompt = (
            f"CONTEXT FROM REPOSITORY:\n{context_str}\n\n"
            f"USER ERROR LOG:\n{log}\n\n"
            "Provide a complete analysis following the instructions."
        )
        
        response = await ask_deepseek_llm(full_prompt, [dummy_chunk])
        return response
    except Exception as e:
        return f"Error executing error debugger: {str(e)}"

if __name__ == "__main__":
    mcp.run()

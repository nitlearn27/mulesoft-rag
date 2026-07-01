import sys
import os

# Append current directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.rag_engine import get_engine

try:
    print("Initializing engine...")
    engine = get_engine()
    print(f"Success! Indexed {len(engine.chunks)} chunks.")
    
    query = "On-Error Continue"
    print(f"\nSearching for: '{query}'")
    results = engine.search(query, top_k=2)
    for idx, r in enumerate(results):
        print(f"\nResult {idx+1} (Source: {r.filename}):")
        print(r.content[:300] + "...")
        
    query2 = "sys-epic-patients-v1"
    print(f"\nSearching for: '{query2}'")
    results2 = engine.search(query2, top_k=2)
    for idx, r in enumerate(results2):
        print(f"\nResult {idx+1} (Source: {r.filename}):")
        print(r.content[:300] + "...")
        
except Exception as e:
    print(f"FAILED: {e}")
    import traceback
    traceback.print_exc()

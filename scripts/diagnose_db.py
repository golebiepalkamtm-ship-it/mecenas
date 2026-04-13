import httpx
import os
from dotenv import load_dotenv

load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

HEADERS = {
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
}

def diagnose():
    url = f"{SUPABASE_URL}/rest/v1/knowledge_base"
    
    try:
        # Fetch categories
        res = httpx.get(f"{url}?select=metadata", headers=HEADERS)
        res.raise_for_status()
        rows = res.json()
        
        counts = {}
        for row in rows:
            meta = row.get('metadata') or {}
            cat = meta.get('category', 'NULL')
            counts[cat] = counts.get(cat, 0) + 1
            
        print("\n📊 Knowledge Base Statistics by Category:")
        for cat, count in counts.items():
            print(f"   - {cat}: {count} chunks")
            
        # Check 'documents' table too
        doc_url = f"{SUPABASE_URL}/rest/v1/documents"
        res_docs = httpx.get(f"{doc_url}?select=id", headers=HEADERS)
        if res_docs.status_code == 200:
            doc_count = len(res_docs.json())
            print(f"   - AI Drafts (documents table): {doc_count} documents")
        else:
            print(f"   - AI Drafts (documents table): Access error or table missing")

    except Exception as e:
        print(f"❌ Error during diagnosis: {e}")

if __name__ == "__main__":
    diagnose()

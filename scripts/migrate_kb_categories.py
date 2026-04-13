import httpx
import json
import os
from dotenv import load_dotenv

# Load config
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    print("❌ Critical: SUPABASE_URL or SUPABASE_ANON_KEY not found in .env")
    exit(1)

HEADERS = {
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

def migrate_missing_categories():
    print("🔍 Fetching documents with missing categories...")
    
    url = f"{SUPABASE_URL}/rest/v1/knowledge_base"
    
    # Query for records where metadata->>category is null
    # PostgREST syntax for filtering JSONB nulls can be tricky, 
    # we'll fetch all and filter locally if needed, or use a clever filter.
    
    params = {
        "select": "id,metadata",
        "metadata->>category": "is.null"
    }

    try:
        response = httpx.get(url, headers=HEADERS, params=params)
        response.raise_for_status()
        docs = response.json()
        
        if not docs:
            print("✅ No documents with missing categories found.")
            return

        print(f"📦 Found {len(docs)} documents to update.")
        
        for doc in docs:
            doc_id = doc['id']
            metadata = doc['metadata'] or {}
            
            # Skip if already has category (redundant check)
            if 'category' in metadata:
                continue
                
            metadata['category'] = 'rag_legal'
            
            print(f"   Updating {doc_id}...")
            
            # PATCH update
            update_res = httpx.patch(
                f"{url}?id=eq.{doc_id}",
                headers=HEADERS,
                json={"metadata": metadata}
            )
            update_res.raise_for_status()
            
        print("🎉 Migration completed successfully.")

    except Exception as e:
        print(f"❌ Migration failed: {e}")

if __name__ == "__main__":
    migrate_missing_categories()

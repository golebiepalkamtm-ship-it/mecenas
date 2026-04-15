#!/usr/bin/env python3
"""
Zarzadzanie wektorami w Supabase using vecs client
"""

import vecs
import os
from dotenv import load_dotenv
from moa.config import SUPABASE_URL, SUPABASE_ANON_KEY

load_dotenv()

def create_vector_client():
    """Tworzy klienta vecs z polaczeniem do Supabase"""
    # Konstruuj connection string bezpiecznie
    db_password = os.getenv("DB_PASSWORD", SUPABASE_ANON_KEY)
    db_host = os.getenv("DB_HOST", "db.dhyvxspgsktpbjonejek.supabase.co")
    db_user = os.getenv("DB_USER", "postgres")
    db_name = os.getenv("DB_NAME", "postgres")
    port = os.getenv("DB_PORT", "5432")
    
    # URL encoded password compatibility
    import urllib.parse
    safe_password = urllib.parse.quote_plus(db_password)
    
    db_url = f"postgresql://{db_user}:{safe_password}@{db_host}:{port}/{db_name}"
    
    # Tworz klienta
    client = vecs.create_client(db_url)
    return client

def check_vector_collection():
    """Sprawdza kolekcje wektorow"""
    client = create_vector_client()
    
    # Pobierz wszystkie kolekcje
    collections = client.list_collections()
    print(f"Dostepne kolekcje: {len(collections)}")
    
    for collection in collections:
        print(f"- {collection.name}: {collection.dimension}D, {collection.count()} rekordow")
    
    return collections

def create_rag_collection():
    """Tworzy kolekcje RAG z 1024 wymiarami"""
    client = create_vector_client()
    
    # Tworz kolekcje dla RAG
    rag_collection = client.get_or_create_collection(
        name="rag_legal", 
        dimension=1024
    )
    
    print(f"Utworzono kolekcje RAG: {rag_collection.name} ({rag_collection.dimension}D)")
    return rag_collection

def migrate_existing_vectors():
    """Migruje istniejace wektory z knowledge_base do kolekcji vecs"""
    client = create_vector_client()
    
    # Pobierz istniejace wektory
    import httpx
    import asyncio
    
    async def get_existing_vectors():
        headers = {
            "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
            "apikey": SUPABASE_ANON_KEY
        }
        
        async with httpx.AsyncClient() as http_client:
            response = await http_client.get(
                f"{SUPABASE_URL}/rest/v1/knowledge_base?select=id,content,metadata,embedding&embedding=not.is.null&limit=1000",
                headers=headers
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                print(f"Blad pobierania wektorow: {response.status_code}")
                return []
    
    # Pobierz wektory
    vectors_data = asyncio.run(get_existing_vectors())
    print(f"Pobrano {len(vectors_data)} wektorow")
    
    if not vectors_data:
        return
    
    # Tworz kolekcje
    rag_collection = create_rag_collection()
    
    # Przygotuj wektory do migracji
    vecs_data = []
    for record in vectors_data:
        if record.get('embedding') and record.get('metadata', {}).get('category') == 'rag_legal':
            vecs_data.append((
                str(record['id']),  # ID jako klucz
                record['embedding'],  # wektor
                record['metadata']   # metadata
            ))
    
    print(f"Przygotowano {len(vecs_data)} wektorow RAG do migracji")
    
    if vecs_data:
        # Wstaw wektory
        rag_collection.upsert(vectors=vecs_data)
        print(f"Zmigrowano {len(vecs_data)} wektorow do kolekcji RAG")
        
        # Sprawdz wynik
        print(f"Kolekcja RAG ma teraz {rag_collection.count()} rekordow")
    else:
        print("Brak wektorow RAG do migracji")

def test_vector_search():
    """Testuje wyszukiwanie wektorowe"""
    client = create_vector_client()
    
    try:
        collection = client.get_collection("rag_legal")
        print(f"Kolekcja RAG: {collection.count()} rekordow")
        
        # Testowy wektor (pierwsze 1024 losowe wartosci)
        import random
        test_vector = [random.random() for _ in range(1024)]
        
        # Wyszukaj podobne wektory
        results = collection.query(
            data=test_vector,
            limit=5,
            filters={"category": {"$eq": "rag_legal"}}
        )
        
        print(f"Znaleziono {len(results)} podobnych wektorow:")
        for i, result in enumerate(results):
            print(f"{i+1}. ID: {result[0]}, Metadata: {result[2].get('filename', 'unknown')}")
            
    except Exception as e:
        print(f"Blad wyszukiwania: {e}")

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "check":
            check_vector_collection()
        elif command == "create":
            create_rag_collection()
        elif command == "migrate":
            migrate_existing_vectors()
        elif command == "test":
            test_vector_search()
        else:
            print("Uzycie: python vector_manager.py [check|create|migrate|test]")
    else:
        print("Dostepne komendy:")
        print("  check  - Sprawdz kolekcje wektorow")
        print("  create - Tworz kolekcje RAG")
        print("  migrate - Migruj istniejace wektory")
        print("  test   - Testuj wyszukiwanie wektorowe")

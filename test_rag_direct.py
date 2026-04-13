#!/usr/bin/env python3
"""
Test RAG with existing vectors from database (no OpenRouter API needed)
"""

import asyncio
import httpx
import json

async def test_rag_direct():
    """Test RAG using existing vector from database"""
    
    # Get existing vector from database
    headers = {
        "Authorization": f"Bearer sb_publishable_8HlO3_J1CxhWN27Vmoq2FA_HzZE0Jac",
        "apikey": "sb_publishable_8HlO3_J1CxhWN27Vmoq2FA_HzZE0Jac"
    }
    
    async with httpx.AsyncClient() as client:
        # Get a vector from database
        response = await client.get(
            "https://dhyvxspgsktpbjonejek.supabase.co/rest/v1/knowledge_base?select=embedding&embedding=not.is.null&metadata->>category=eq.rag_legal&limit=1",
            headers=headers
        )
        
        if response.status_code != 200:
            print(f"Error getting vector: {response.status_code}")
            return
            
        data = response.json()
        if not data:
            print("No vectors found")
            return
            
        embedding_data = data[0]['embedding']
        
        # Parse string vector to list if needed
        if isinstance(embedding_data, str):
            import ast
            existing_vector = ast.literal_eval(embedding_data)
            print(f"Parsed string vector to list with {len(existing_vector)} dimensions")
        else:
            existing_vector = embedding_data
            print(f"Got vector list with {len(existing_vector)} dimensions")
            
        print(f"Vector type: {type(existing_vector)}")
        print(f"First 5 values: {existing_vector[:5]}")
        print(f"Last 5 values: {existing_vector[-5:]}")
        
        # Test RPC call with existing vector
        rpc_payload = {
            "query_embedding": existing_vector,
            "match_threshold": 0.5,
            "match_count": 5
        }
        
        response = await client.post(
            "https://dhyvxspgsktpbjonejek.supabase.co/rest/v1/rpc/match_knowledge",
            json=rpc_payload,
            headers=headers
        )
        
        if response.status_code == 200:
            results = response.json()
            print(f"SUCCESS! Found {len(results)} matches")
            
            for i, result in enumerate(results[:3]):
                filename = result.get('metadata', {}).get('filename', 'unknown')
                similarity = result.get('similarity', 0)
                content_preview = result.get('content', '')[:100]
                print(f"{i+1}. {filename} (similarity: {similarity:.3f}): {content_preview}...")
                
        else:
            print(f"RPC Error: {response.status_code} - {response.text}")

if __name__ == "__main__":
    asyncio.run(test_rag_direct())

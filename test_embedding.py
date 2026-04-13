import asyncio
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

async def test_embedding():
    headers = {
        'Authorization': f'Bearer {os.getenv("OPENROUTER_API_KEY")}',
        'Content-Type': 'application/json'
    }
    payload = {
        'model': 'openai/text-embedding-3-small',
        'input': ['test'],
        'dimensions': 1024
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post('https://openrouter.ai/api/v1/embeddings', json=payload, headers=headers)
        if response.status_code == 200:
            data = response.json()
            embedding = data['data'][0]['embedding']
            print(f'Embedding dimensions: {len(embedding)}')
            print(f'First 5 values: {embedding[:5]}')
            print(f'Last 5 values: {embedding[-5:]}')
            
            # Sprawdzenie czy nie ma zer na koncu
            non_zero_count = sum(1 for x in embedding if x != 0)
            print(f'Non-zero values: {non_zero_count}/{len(embedding)}')
        else:
            print(f'Error: {response.status_code} - {response.text}')

if __name__ == "__main__":
    asyncio.run(test_embedding())

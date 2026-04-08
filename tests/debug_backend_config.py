import asyncio
import httpx

async def debug_backend_config():
    print("Debug backend config...")
    
    async with httpx.AsyncClient(timeout=30) as client:
        # Spróbuję endpointu który może zwrócić info o configu
        try:
            response = await client.get("http://localhost:8003/models/presets")
            print(f"Presets status: {response.status_code}")
            if response.status_code == 200:
                presets = response.json()
                print(f"Presets count: {len(presets)}")
            else:
                print(f"Presets error: {response.text[:200]}")
                
        except Exception as e:
            print(f"Presets exception: {e}")

if __name__ == "__main__":
    asyncio.run(debug_backend_config())

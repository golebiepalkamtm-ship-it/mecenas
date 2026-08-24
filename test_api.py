import asyncio
import httpx
import json

async def main():
    payload = {
        "user_id": "test_user",
        "session_id": "test_session",
        "task": "analysis",
        "mode": "moa",
        "side": "defense",
        "message": "Mam problem z umową najmu, najemca nie płaci od 3 miesięcy. Co robić?",
        "history": [],
        "moa_options": {
            "expert_roles": ["inquisitor", "proceduralist"],
            "aggregator_model": "qwen/qwen3.8-max"
        }
    }
    
    async with httpx.AsyncClient() as client:
        print("Sending request to /chat...")
        response = await client.post("http://127.0.0.1:8003/chat", json=payload, timeout=600.0)
        print("Status:", response.status_code)
        
        # Read streaming response or json depending on endpoint
        async for line in response.aiter_lines():
            if line:
                print(line)

asyncio.run(main())

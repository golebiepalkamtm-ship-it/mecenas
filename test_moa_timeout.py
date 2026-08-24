import asyncio, json, time, sys
sys.stdout.reconfigure(encoding="utf-8")

from api import app
from httpx import AsyncClient, ASGITransport

async def test_moa_with_new_models():
    print("\n" + "="*70)
    print("[TEST MoA] WERYFIKACJA WYWOŁANIA NOWYCH MODELI W DEBACIE WIELOAGENTOWEJ (TEST TIMEOUT 180s)")
    print("="*70)
    
    test_payload = {
        "message": "Klient otrzymał karę 5000 zł za zajęcie pasa drogowego. Czy decyzja organu była prawidłowa?",
        "session_id": "test-moa-timeout-002",
        "chat_mode": "moa",
        "response_mode": "strategic",
        "current_task": "analysis",
        "side": "defense"
    }

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver", timeout=240.0) as client:
        async with client.stream("POST", "/chat", json=test_payload) as response:
            assert response.status_code == 200
            full_chunks = []
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    data_str = line[6:].strip()
                    if data_str == "[DONE]":
                        break
                    try:
                        evt = json.loads(data_str)
                        if evt.get("type") == "chunk":
                            full_chunks.append(evt.get("text", ""))
                    except Exception:
                        pass
            print(f"[OK] Odebrano odpowiedź MoA ({len(''.join(full_chunks))} znaków).")

if __name__ == "__main__":
    asyncio.run(test_moa_with_new_models())

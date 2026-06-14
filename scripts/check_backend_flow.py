import sys
import httpx
import asyncio
import json
import time

BASE_URL = "http://127.0.0.1:8003"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def print_step(name):
    print(f"\n{Colors.BLUE}{Colors.BOLD}--- {name} ---{Colors.ENDC}")

def print_result(success, message, latency=None):
    latency_str = f" ({latency:.2f}s)" if latency is not None else ""
    if success:
        print(f"{Colors.GREEN}[SUCCESS]{Colors.ENDC} {message}{latency_str}")
    else:
        print(f"{Colors.RED}[FAILED]{Colors.ENDC} {message}{latency_str}")

async def test_health(client):
    print_step("Weryfikacja Health Checks")
    
    # 1. /health
    start = time.time()
    try:
        r = await client.get(f"{BASE_URL}/health")
        latency = time.time() - start
        if r.status_code == 200:
            print_result(True, f"/health: {r.json()}", latency)
        else:
            print_result(False, f"/health: Status {r.status_code} - {r.text}", latency)
    except Exception as e:
        print_result(False, f"/health error: {e}")

    # 2. /health/balance
    start = time.time()
    try:
        r = await client.get(f"{BASE_URL}/health/balance")
        latency = time.time() - start
        if r.status_code == 200:
            print_result(True, f"/health/balance: {r.json()}", latency)
        else:
            print_result(False, f"/health/balance: Status {r.status_code} - {r.text}", latency)
    except Exception as e:
        print_result(False, f"/health/balance error: {e}")

    # 3. /health/hybrid-search
    start = time.time()
    try:
        r = await client.get(f"{BASE_URL}/health/hybrid-search")
        latency = time.time() - start
        if r.status_code == 200:
            print_result(True, f"/health/hybrid-search: {r.json()}", latency)
        else:
            print_result(False, f"/health/hybrid-search: Status {r.status_code} - {r.text}", latency)
    except Exception as e:
        print_result(False, f"/health/hybrid-search error: {e}")

async def test_models(client):
    print_step("Weryfikacja Endpointów Modeli LLM")
    start = time.time()
    try:
        r = await client.get(f"{BASE_URL}/models/")
        latency = time.time() - start
        if r.status_code == 200:
            data = r.json()
            models = data.get("models", [])
            print_result(True, f"/models/: Pomyślnie pobrano {len(models)} modeli z serwera.", latency)
        else:
            print_result(False, f"/models/: Status {r.status_code} - {r.text}", latency)
    except Exception as e:
        print_result(False, f"/models/ error: {e}")

async def test_documents(client):
    print_step("Weryfikacja Repozytorium Dokumentów")
    start = time.time()
    try:
        r = await client.get(f"{BASE_URL}/documents/list")
        latency = time.time() - start
        if r.status_code == 200:
            data = r.json()
            print_result(True, f"/documents/list: Znaleziono dokumentów: {data.get('count', 0)}.", latency)
        else:
            print_result(False, f"/documents/list: Status {r.status_code} - {r.text}", latency)
    except Exception as e:
        print_result(False, f"/documents/list error: {e}")

async def test_chat(client):
    print_step("Weryfikacja Modułu Czat & Orchestrator SSE")
    start = time.time()
    payload = {
        "message": "Cześć, to jest automatyczny test backendu. Zwróć jedno słowo: TEST_OK",
        "selected_model": "google/gemma-2-9b-it:free",
        "use_saos": False,
        "use_eli": False,
        "use_rag_legal": False
    }
    
    try:
        print(f"{Colors.YELLOW}Wysyłam testowe zapytanie strumieniowe (SSE)...{Colors.ENDC}")
        async with client.stream("POST", f"{BASE_URL}/chat", json=payload) as r:
            if r.status_code != 200:
                print_result(False, f"/chat: Błąd połączenia SSE (status {r.status_code}): {await r.aread()}")
                return
            
            chunks_received = 0
            final_metadata_received = False
            text_received = ""
            async for chunk in r.aiter_text():
                if chunk.strip() and chunk.startswith("data:"):
                    chunks_received += 1
                    content = chunk.replace("data:", "").strip()
                    if content == "[DONE]":
                        continue
                    try:
                        data = json.loads(content)
                        if data.get("type") == "final_metadata":
                            final_metadata_received = True
                        elif data.get("type") == "chunk":
                            text_received += data.get("text", "")
                    except:
                        pass
            
            latency = time.time() - start
            if chunks_received > 0:
                print_result(True, f"/chat: Odebrano strumień SSE ({chunks_received} części). Odpowiedź LLM: '{text_received.strip()}' | Metadane końcowe: {final_metadata_received}", latency)
            else:
                print_result(False, "/chat: Backend nie wysłał żadnych danych SSE.", latency)
    except Exception as e:
        print_result(False, f"/chat error: {e}")

async def test_judgments(client):
    print_step("Weryfikacja Modułu Orzecznictwa (SAOS)")
    start = time.time()
    payload = {
        "query": "dobra osobiste",
        "pageNumber": 1,
        "pageSize": 10
    }
    try:
        r = await client.post(f"{BASE_URL}/judgments/search", json=payload)
        latency = time.time() - start
        if r.status_code in [200, 422]:
            print_result(True, f"/judgments/search: Endpoint odpowiedział (Status {r.status_code})", latency)
        else:
            print_result(False, f"/judgments/search: Status {r.status_code} - {r.text}", latency)
    except Exception as e:
        print_result(False, f"/judgments/search error: {e}")

async def main():
    print(f"\n{Colors.BOLD}{Colors.GREEN}================================================={Colors.ENDC}")
    print(f"{Colors.BOLD}{Colors.GREEN}      LEXMIND V2 - SYSTEM FLOW VALIDATOR         {Colors.ENDC}")
    print(f"{Colors.BOLD}{Colors.GREEN}================================================={Colors.ENDC}")
    print(f"Target URL: {BASE_URL}")
    print(f"Mode: Dry-Run (nie modyfikuje bazy danych użytkownika)\n")
    
    async with httpx.AsyncClient(timeout=45.0) as client:
        await test_health(client)
        await test_models(client)
        await test_documents(client)
        await test_judgments(client)
        await test_chat(client)
        
    print(f"\n{Colors.GREEN}{Colors.BOLD}--- TEST ZAKOŃCZONY ---{Colors.ENDC}\n")

if __name__ == "__main__":
    asyncio.run(main())

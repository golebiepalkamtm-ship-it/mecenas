import asyncio
import httpx
import os
import time
import sys
import socket
from datetime import datetime
from dotenv import load_dotenv

# Wymuszenie UTF-8 dla stdout jeśli to możliwe
if sys.stdout.encoding != 'utf-8':
    try:
        import codecs
        sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    except:
        pass

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY")
OPENROUTER_KEY = os.getenv("OPENROUTER_API_KEY")
API_BASE = "http://127.0.0.1:8003"
FRONTEND_BASE = "http://localhost:3000"

async def check_port(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(1)
        return s.connect_ex(('127.0.0.1', port)) == 0

async def diagnose():
    print("\n" + "="*60)
    print(f"DIAGNOSTYKA SYSTEMU LexMind - {datetime.now().strftime('%H:%M:%S')}")
    print("="*60)

    # 1. SPRAWDZANIE PORTÓW
    print(f"\n[1/5] Infrastruktura Lokalna:")
    backend_up = await check_port(8003)
    frontend_up = await check_port(3000)
    print(f"   - Port 8003 (Backend):  {'[OK]' if backend_up else '[OFFLINE]'}")
    print(f"   - Port 3000 (Frontend): {'[OK]' if frontend_up else '[OFFLINE]'}")

    # 2. BACKEND HEALTH CHECK
    if backend_up:
        print(f"\n[2/5] Wydajnosc Backend (FastAPI):")
        async with httpx.AsyncClient() as client:
            try:
                start = time.time()
                res = await client.get(f"{API_BASE}/health", timeout=5.0)
                latency = (time.time() - start) * 1000
                if res.status_code == 200:
                    status = "SZYBKA" if latency < 200 else "WOLNA"
                    print(f"   - /health response:     {res.status_code} OK")
                    print(f"   - Opóźnienie (ping):    {latency:.1f}ms ({status})")
                else:
                    print(f"   - /health error:        {res.status_code}")
            except Exception as e:
                print(f"   - Backend Error: {str(e)}")
    else:
        print("\n[2/5] Backend nie działa - pomijam testy wydajności.")

    # 3. SUPABASE CONNECTIVITY
    print(f"\n[3/5] Usługi Zewnętrzne - Supabase:")
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("   - [BLAD]: Brakuje kluczy Supabase w pliku .env")
    else:
        async with httpx.AsyncClient() as client:
            try:
                start = time.time()
                url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/"
                headers = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"}
                res = await client.get(url, headers=headers, timeout=10.0)
                latency = (time.time() - start) * 1000
                if res.status_code in [200, 204, 404]:
                    print(f"   - Połączenie Supabase:  [OK]")
                    print(f"   - Czas odpowiedzi:      {latency:.1f}ms")
                else:
                    print(f"   - Błąd Supabase:        [BLAD] Status {res.status_code}")
            except Exception as e:
                print(f"   - Timeout/Error:        [BLAD] {str(e)} (TO MOZE BYC POWOD ZAWIESZENIA)")

    # 4. OPENROUTER / MODELE
    print(f"\n[4/5] Usługi Zewnętrzne - AI Models:")
    if not OPENROUTER_KEY:
        print("   - [BLAD]: Brakuje OPENROUTER_API_KEY")
    else:
        async with httpx.AsyncClient() as client:
            try:
                url = "https://openrouter.ai/api/v1/models"
                headers = {"Authorization": f"Bearer {OPENROUTER_KEY}"}
                res = await client.get(url, headers=headers, timeout=10.0)
                if res.status_code == 200:
                    models = res.json().get("data", [])
                    print(f"   - Połączenie AI:        [OK] ({len(models)} modeli)")
                else:
                    print(f"   - Błąd AI Provider:     [BLAD] Status {res.status_code}")
            except Exception as e:
                print(f"   - Timeout AI:           [BLAD] {str(e)}")

    # 5. PLIKI I CACHE
    print(f"\n[5/5] Integralność Danych:")
    cache_exists = os.path.exists("models_cache.json")
    node_modules = os.path.exists("frontend/node_modules")
    
    print(f"   - node_modules (Vite):  {'[OK]' if node_modules else '[BRAK]'}")
    print(f"   - Persistent Cache:     {'[OK]' if cache_exists else '[BRAK - Normalne przy pierwszym starcie]'}")

    print("\n" + "="*60)
    print("KONIEC DIAGNOSTYKI")
    print("="*60 + "\n")

if __name__ == "__main__":
    try:
        asyncio.run(diagnose())
    except Exception as e:
        print(f"CRITICAL ERROR IN DIAGNOSTIC SCRIPT: {e}")

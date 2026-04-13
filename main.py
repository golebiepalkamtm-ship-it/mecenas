import uvicorn
import os
import sys

# Dodaj bieżący katalog do ścieżki, aby uniknąć problemów z importami
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from api import app
    print("[LEXMIND] Inicjalizacja backendu z api.py...")
except ImportError as e:
    print(f"[BŁĄD] Nie można zaimportować 'app' z 'api.py': {e}")
    sys.exit(1)

if __name__ == "__main__":
    # Domyślny port to 8003 dla LexMind
    port = int(os.environ.get("PORT", 8003))
    print(f"[LEXMIND] Serwer startuje na http://127.0.0.1:{port}")
    uvicorn.run("api:app", host="127.0.0.1", port=port, reload=True)

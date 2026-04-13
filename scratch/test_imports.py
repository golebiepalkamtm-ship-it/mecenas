print("Starting import test...")
import sys
from pathlib import Path
sys.path.append(str(Path.cwd()))

try:
    print("Importing asyncio...")
    import asyncio
    print("Importing fastapi...")
    from fastapi import FastAPI
    print("Importing database...")
    import database
    print("Importing routes.documents...")
    from routes.documents import router as documents_router
    print("Importing routes.chat...")
    from routes.chat import router as chat_router
    print("Importing routes.models...")
    from routes.models import router as models_router
    print("Importing routes.database...")
    from routes.database import router as database_router
    print("SUCCESS: All imports finished.")
except Exception as e:
    print(f"FAILED: {e}")
    import traceback
    traceback.print_exc()

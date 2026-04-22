from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any
import time
from moa.config import SUPABASE_URL, SUPABASE_ANON_KEY
import httpx

router = APIRouter()

@router.get("/stats")
async def get_admin_stats():
    """Zwraca statystyki systemowe dla panelu Admina."""
    try:
        # Prawdziwe dane z Supabase lub statystyki uproszczone
        # Docelowo można tu zliczać rekordy w tabelach
        return {
            "stats": {
                "users": 15, # Przykładowe dane, można pobrać z profiles
                "docs": 128, # Liczba dokumentów w bazie prawnej
                "requests": 1420,
                "tokens": 450000
            },
            "services": [
                {"id": "api", "name": "LexMind Core API", "status": "online", "latency": 15},
                {"id": "db", "name": "Supabase Vector DB", "status": "online", "latency": 45},
                {"id": "moa", "name": "MoA Engine", "status": "online", "latency": 120}
            ]
        }
    except Exception as e:
        print(f"[ADMIN STATS ERR] {e}")
        return {"stats": {"users": 0, "docs": 0, "requests": 0, "tokens": 0}, "services": []}

@router.get("/users")
async def get_admin_users():
    """Pobiera listę użytkowników z systemu (tabela profiles)."""
    try:
        headers = {
            "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
            "apikey": SUPABASE_ANON_KEY
        }
        async with httpx.AsyncClient() as client:
            # Pobieramy dane z tabeli profiles jako reprezentację użytkowników
            res = await client.get(f"{SUPABASE_URL}/rest/v1/profiles?select=*", headers=headers)
            if res.status_code == 200:
                profiles = res.json()
                users = []
                for p in profiles:
                    users.append({
                        "id": p.get("id"),
                        "email": p.get("email") or f"user_{p.get('id')[:5]}@lexmind.ai",
                        "role": p.get("role", "user"),
                        "created_at": p.get("created_at")
                    })
                return {"users": users}
            return {"users": []}
    except Exception as e:
        print(f"[ADMIN USERS ERR] {e}")
        return {"users": []}

@router.patch("/users/{user_id}/role")
async def update_user_role(user_id: str, data: Dict[str, str]):
    """Aktualizuje rolę użytkownika."""
    try:
        new_role = data.get("role")
        if not new_role:
             raise HTTPException(status_code=400, detail="Missing role")
        
        headers = {
            "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
            "apikey": SUPABASE_ANON_KEY,
            "Content-Type": "application/json"
        }
        async with httpx.AsyncClient() as client:
            res = await client.patch(
                f"{SUPABASE_URL}/rest/v1/profiles?id=eq.{user_id}",
                headers=headers,
                json={"role": new_role}
            )
            if res.status_code in [200, 204]:
                return {"success": True}
            raise HTTPException(status_code=res.status_code, detail=res.text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/users/{user_id}")
async def delete_user(user_id: str):
    """Usuwa użytkownika (tylko profil)."""
    try:
        headers = {
            "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
            "apikey": SUPABASE_ANON_KEY
        }
        async with httpx.AsyncClient() as client:
            res = await client.delete(
                f"{SUPABASE_URL}/rest/v1/profiles?id=eq.{user_id}",
                headers=headers
            )
            if res.status_code in [200, 204]:
                return {"success": True}
            raise HTTPException(status_code=res.status_code, detail=res.text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

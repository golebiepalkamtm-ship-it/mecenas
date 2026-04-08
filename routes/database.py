from fastapi import APIRouter, HTTPException
import database

router = APIRouter()

@router.get("/sessions")
async def get_all_sessions():
    """Zwraca listę sesji z lokalnej bazy danych."""
    return database.get_sessions(limit=50)

@router.get("/sessions/{session_id}/messages")
async def get_session_messages(session_id: str):
    """Zwraca wiadomości dla danej sesji."""
    return database.get_messages(session_id=session_id)

@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    """Usuwa sesję i wiadomości powiązane."""
    database.delete_session(session_id)
    return {"success": True}

from fastapi import APIRouter, HTTPException
import database

router = APIRouter()

@router.get("/sessions")
async def get_all_sessions():
    """Zwraca listę sesji z lokalnej bazy danych."""
    return database.get_sessions(limit=50)

@router.get("/sessions/{session_id}/messages")
async def get_session_messages(session_id: str, limit: int = 30):
    """Zwraca lekką historię wiadomości dla danej sesji."""
    return database.get_messages(session_id=session_id, limit=limit)


@router.get("/sessions/{session_id}/messages/{message_id}")
async def get_session_message_details(session_id: str, message_id: str):
    """Zwraca pełne szczegóły pojedynczej wiadomości."""
    message = database.get_message_details(session_id=session_id, message_id=message_id)
    if not message:
        raise HTTPException(status_code=404, detail="Wiadomość nie została znaleziona")
    return message

@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    """Usuwa sesję i wiadomości powiązane."""
    database.delete_session(session_id)
    return {"success": True}

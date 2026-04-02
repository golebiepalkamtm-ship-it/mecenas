import sqlite3
import os
from pathlib import Path
from typing import Optional, List, Dict, Any
from contextlib import contextmanager

DB_PATH = Path("cache") / "prawnik.db"

@contextmanager
def get_db():
    """Context manager for SQLite connections with Foreign Keys enabled."""
    if not DB_PATH.parent.exists():
        DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
    finally:
        conn.close()

def init_db():
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Sessions table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Messages table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                sources TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
            )
        ''')
        
        # Settings table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
        ''')
        
        # Initial settings migration
        cursor.execute("SELECT value FROM settings WHERE key = 'system_prompt'")
        if not cursor.fetchone():
            from dotenv import load_dotenv
            load_dotenv()
            default_prompt = os.getenv("SYSTEM_PROMPT", "Jesteś polskim prawnikiem (Radcą AI). Służysz fachową poradą prawną na podstawie dostarczonego kontekstu z bazy wiedzy.")
            cursor.execute("INSERT INTO settings (key, value) VALUES ('system_prompt', ?)", (default_prompt,))
        
        conn.commit()

def get_setting(key: str, default: str = "") -> str:
    try:
        with get_db() as conn:
            with conn:
                row = conn.execute("SELECT value FROM settings WHERE key = ?", (key,)).fetchone()
                return row[0] if row else default
    except Exception as e:
        print(f"❌ DB Error (get_setting): {e}")
        return default

def set_setting(key: str, value: str):
    try:
        with get_db() as conn:
            with conn:
                conn.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", (key, value))
    except Exception as e:
        print(f"❌ DB Error (set_setting): {e}")

def get_sessions(limit: int = 100) -> List[Dict[str, Any]]:
    try:
        with get_db() as conn:
            with conn:
                rows = conn.execute("SELECT id, title, updated_at FROM sessions ORDER BY updated_at DESC LIMIT ?", (limit,)).fetchall()
                return [{"id": r[0], "title": r[1], "updated_at": r[2]} for r in rows]
    except Exception as e:
        print(f"❌ DB Error (get_sessions): {e}")
        return []

def create_session(id: str, title: str):
    try:
        with get_db() as conn:
            with conn:
                conn.execute("INSERT OR REPLACE INTO sessions (id, title) VALUES (?, ?)", (id, title))
    except Exception as e:
        print(f"❌ DB Error (create_session): {e}")

def save_message(id: str, session_id: str, role: str, content: str, sources: Optional[str] = None):
    try:
        # Sanitize content for title if needed (Bug 18)
        title_content = content.replace("\n", " ").strip()[:50] if content else "Nowa Rozprawa"
        
        with get_db() as conn:
            with conn:
                # Use a single transaction via the 'with conn' context manager
                conn.execute("INSERT OR IGNORE INTO sessions (id, title) VALUES (?, ?)", (session_id, title_content if role == 'user' else "Nowa Rozprawa"))
                # Update title if it's still generic and we have a user message
                if role == 'user':
                    conn.execute("UPDATE sessions SET title = ? WHERE id = ? AND title = 'Nowa Rozprawa'", (title_content, session_id))
                
                conn.execute(
                    "INSERT INTO messages (id, session_id, role, content, sources) VALUES (?, ?, ?, ?, ?)", 
                    (id, session_id, role, content, sources)
                )
                conn.execute("UPDATE sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?", (session_id,))
    except Exception as e:
        print(f"❌ DB Error (save_message): {e}")

def get_messages(session_id: Optional[str] = None, limit: int = 200) -> List[Dict[str, Any]]:
    try:
        with get_db() as conn:
            with conn:
                if session_id:
                    rows = conn.execute("SELECT id, role, content, sources FROM messages WHERE session_id = ? ORDER BY timestamp ASC LIMIT ?", (session_id, limit)).fetchall()
                else:
                    rows = conn.execute("SELECT id, role, content, sources FROM messages ORDER BY timestamp ASC LIMIT ?", (limit,)).fetchall()
                return [{"id": r[0], "role": r[1], "content": r[2], "sources": r[3].split(",") if r[3] else []} for r in rows]
    except Exception as e:
        print(f"❌ DB Error (get_messages): {e}")
        return []

def delete_session(session_id: str):
    try:
        with get_db() as conn:
            with conn:
                conn.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
    except Exception as e:
        print(f"❌ DB Error (delete_session): {e}")

if __name__ == "__main__":
    init_db()
    print("✅ Database initialized successfully.")

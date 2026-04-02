import sqlite3
import os
from pathlib import Path
from typing import Optional

DB_PATH = Path("cache") / "prawnik.db"

def init_db():
    if not DB_PATH.parent.exists():
        DB_PATH.parent.mkdir(parents=True, exist_ok=True)
        
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Sessions table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Messages table (added session_id)
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
    
    # Store initial prompt if not exists (migrating from .env or default)
    cursor.execute("SELECT value FROM settings WHERE key = 'system_prompt'")
    if not cursor.fetchone():
        # Fallback to .env if available, otherwise default
        from dotenv import load_dotenv
        load_dotenv()
        default_prompt = os.getenv("SYSTEM_PROMPT", "Jesteś polskim prawnikiem (Radcą AI). Służysz fachową poradą prawną na podstawie dostarczonego kontekstu z bazy wiedzy.")
        cursor.execute("INSERT INTO settings (key, value) VALUES ('system_prompt', ?)", (default_prompt,))
    
    conn.commit()
    conn.close()

def get_setting(key: str, default: str = "") -> str:
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT value FROM settings WHERE key = ?", (key,))
        row = cursor.fetchone()
        conn.close()
        return row[0] if row else default
    except Exception as e:
        print(f"Błąd bazy danych (get_setting): {e}")
        return default

def set_setting(key: str, value: str):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", (key, value))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Błąd bazy danych (set_setting): {e}")

def get_sessions(limit: int = 20):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT id, title, updated_at FROM sessions ORDER BY updated_at DESC LIMIT ?", (limit,))
        rows = cursor.fetchall()
        conn.close()
        return [{"id": r[0], "title": r[1], "updated_at": r[2]} for r in rows]
    except Exception as e:
        print(f"Błąd bazy danych (get_sessions): {e}")
        return []

def create_session(id: str, title: str):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("INSERT OR REPLACE INTO sessions (id, title) VALUES (?, ?)", (id, title))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Błąd bazy danych (create_session): {e}")

def save_message(id: str, session_id: str, role: str, content: str, sources: Optional[str] = None):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        # Ensure session exists (auto-create if missing for simplicity or better logic needed?)
        cursor.execute("INSERT OR IGNORE INTO sessions (id, title) VALUES (?, ?)", (session_id, content[:50] if role == 'user' else "Nowa Rozprawa"))
        
        cursor.execute(
            "INSERT INTO messages (id, session_id, role, content, sources) VALUES (?, ?, ?, ?, ?)", 
            (id, session_id, role, content, sources)
        )
        # Update session timestamp
        cursor.execute("UPDATE sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?", (session_id,))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Błąd bazy danych (save_message): {e}")

def get_messages(session_id: Optional[str] = None, limit: int = 100):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        if session_id:
            cursor.execute("SELECT id, role, content, sources FROM messages WHERE session_id = ? ORDER BY timestamp ASC LIMIT ?", (session_id, limit))
        else:
            cursor.execute("SELECT id, role, content, sources FROM messages ORDER BY timestamp ASC LIMIT ?", (limit,))
        rows = cursor.fetchall()
        conn.close()
        return [{"id": r[0], "role": r[1], "content": r[2], "sources": r[3].split(",") if r[3] else []} for r in rows]
    except Exception as e:
        print(f"Błąd bazy danych (get_messages): {e}")
        return []

def delete_session(session_id: str):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
        # cascades to messages
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Błąd bazy danych (delete_session): {e}")

if __name__ == "__main__":
    init_db()
    print("Baza danych zainicjalizowana.")

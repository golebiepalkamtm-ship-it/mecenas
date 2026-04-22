import sqlite3
import os
import json
from pathlib import Path
from typing import Optional, List, Dict, Any
from contextlib import contextmanager

DB_PATH = Path("cache") / "prawnik.db"
DEFAULT_HISTORY_LIMIT = 30
MAX_HISTORY_LIMIT = 50
MAX_HISTORY_PREVIEW_CHARS = 12000

@contextmanager
def get_db():
    """Context manager for SQLite connections with Foreign Keys enabled."""
    if not DB_PATH.parent.exists():
        DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    
    conn = sqlite3.connect(DB_PATH, timeout=30.0, check_same_thread=False)
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
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
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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
                message_type TEXT DEFAULT 'standard',
                reasoning TEXT,
                eli_explanation TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
            )
        ''')
        
        # --- INDEXES (Optimization for large archives) ---
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages (session_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages (created_at)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sessions_updated_at ON sessions (updated_at DESC)")
        
        # --- MIGRATIONS ---
        # 1. Add message_type if missing (Bug fix for older DBs)
        cursor.execute("PRAGMA table_info(messages)")
        columns = [row[1] for row in cursor.fetchall()]
        if 'message_type' not in columns:
            print("Migrating DB: Adding 'message_type' column to 'messages'")
            cursor.execute("ALTER TABLE messages ADD COLUMN message_type TEXT")
            cursor.execute("UPDATE messages SET message_type = 'standard' WHERE message_type IS NULL")
        
        if 'created_at' not in columns:
            print("Migrating DB: Adding 'created_at' column to 'messages'")
            cursor.execute("ALTER TABLE messages ADD COLUMN created_at DATETIME")
            cursor.execute("UPDATE messages SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL")

        if 'updated_at' not in columns:
            print("Migrating DB: Adding 'updated_at' column to 'messages'")
            cursor.execute("ALTER TABLE messages ADD COLUMN updated_at DATETIME")
            cursor.execute("UPDATE messages SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL")

        cursor.execute("PRAGMA table_info(sessions)")
        session_columns = [row[1] for row in cursor.fetchall()]
        if 'created_at' not in session_columns:
            print("Migrating DB: Adding 'created_at' column to 'sessions'")
            cursor.execute("ALTER TABLE sessions ADD COLUMN created_at DATETIME")
            cursor.execute("UPDATE sessions SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL")
        
        if 'updated_at' not in session_columns:
            print("Migrating DB: Adding 'updated_at' column to 'sessions'")
            cursor.execute("ALTER TABLE sessions ADD COLUMN updated_at DATETIME")
            cursor.execute("UPDATE sessions SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL")
        
        # 2. Add reasoning if missing (Expert analyst data)
        if 'reasoning' not in columns:
            print("Migrating DB: Adding 'reasoning' column to 'messages'")
            cursor.execute("ALTER TABLE messages ADD COLUMN reasoning TEXT")

        # 3. Add eli_explanation if missing (Explainable AI)
        if 'eli_explanation' not in columns:
            print("Migrating DB: Adding 'eli_explanation' column to 'messages'")
            cursor.execute("ALTER TABLE messages ADD COLUMN eli_explanation TEXT")

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
        print(f"[DB Error] (get_setting): {e}")
        return default

def set_setting(key: str, value: str):
    try:
        with get_db() as conn:
            with conn:
                conn.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", (key, value))
    except Exception as e:
        print(f"[DB Error] (set_setting): {e}")

def get_sessions(limit: int = 100) -> List[Dict[str, Any]]:
    try:
        with get_db() as conn:
            with conn:
                rows = conn.execute("SELECT id, title, updated_at FROM sessions ORDER BY updated_at DESC LIMIT ?", (limit,)).fetchall()
                return [{"id": r[0], "title": r[1], "updated_at": r[2]} for r in rows]
    except Exception as e:
        print(f"[DB Error] (get_sessions): {e}")
        return []


def _sanitize_history_limit(limit: int) -> int:
    try:
        parsed_limit = int(limit)
    except (TypeError, ValueError):
        return DEFAULT_HISTORY_LIMIT

    return max(1, min(parsed_limit, MAX_HISTORY_LIMIT))


def _truncate_preview(text: Optional[str], max_chars: int = MAX_HISTORY_PREVIEW_CHARS):
    if not text:
        return "", False

    if len(text) <= max_chars:
        return text, False

    return (
        text[:max_chars].rstrip() + "\n\n[... wiadomosc zostala skrocona w historii ...]",
        True,
    )


def _build_history_message(row) -> Dict[str, Any]:
    content_preview, content_truncated = _truncate_preview(row[2])

    return {
        "id": row[0],
        "role": row[1],
        "content": content_preview,
        "content_truncated": content_truncated,
        "sources": row[3].split(",") if row[3] else [],
        "consensus_used": row[4] == "moa_consensus",
        "has_expert_analyses": bool(row[5]),
        "has_eli_explanation": bool(row[6]),
    }

def create_session(id: str, title: str):
    try:
        with get_db() as conn:
            with conn:
                conn.execute("INSERT OR REPLACE INTO sessions (id, title) VALUES (?, ?)", (id, title))
    except Exception as e:
        print(f"DB Error (create_session): {e}")

def save_message(id: str, session_id: str, role: str, content: str, sources: Optional[str] = None, message_type: Optional[str] = None, reasoning: Optional[str] = None, eli_explanation: Optional[str] = None):
    try:
        # Próba wyciagnięcia czystego tekstu z JSONa dla tytułu
        clean_title = "Nowa Rozprawa"
        if content and role == 'user':
            try:
                # Jeśli content to JSON (załączniki itp), wyciągnij tekst
                if content.strip().startswith('['):
                    parsed = json.loads(content)
                    texts = [item["text"] for item in parsed if item.get("type") == "text"]
                    clean_title = " ".join(texts).strip()[:50]
                else:
                    clean_title = content.replace("\n", " ").strip()[:50]
            except:
                clean_title = content.replace("\n", " ").strip()[:50]
        
        if not clean_title or clean_title == "[]":
            clean_title = "Nowa Rozprawa"

        with get_db() as conn:
            with conn:
                # Use a single transaction via the 'with conn' context manager
                conn.execute("INSERT OR IGNORE INTO sessions (id, title) VALUES (?, ?)", (session_id, clean_title if role == 'user' else "Nowa Rozprawa"))
                
                # Update title if it's still generic and we have a user message
                if role == 'user':
                    conn.execute("UPDATE sessions SET title = ? WHERE id = ? AND (title = 'Nowa Rozprawa' OR title LIKE '[%')", (clean_title, session_id))
                
                conn.execute(
                    "INSERT INTO messages (id, session_id, role, content, sources, message_type, reasoning, eli_explanation, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)", 
                    (id, session_id, role, content, sources, message_type, reasoning, eli_explanation)
                )
                conn.execute("UPDATE sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?", (session_id,))
    except Exception as e:
        print(f"[DB Error] (save_message): {e}")

def get_messages(session_id: Optional[str] = None, limit: int = DEFAULT_HISTORY_LIMIT) -> List[Dict[str, Any]]:
    try:
        with get_db() as conn:
            with conn:
                safe_limit = _sanitize_history_limit(limit)
                if session_id:
                    rows = conn.execute(
                        """
                        SELECT id, role, content, sources, message_type, reasoning, eli_explanation
                        FROM (
                            SELECT id, role, content, sources, message_type, reasoning, eli_explanation, created_at
                            FROM messages
                            WHERE session_id = ?
                            ORDER BY created_at DESC
                            LIMIT ?
                        ) recent_messages
                        ORDER BY created_at ASC
                        """,
                        (session_id, safe_limit),
                    ).fetchall()
                else:
                    rows = conn.execute(
                        """
                        SELECT id, role, content, sources, message_type, reasoning, eli_explanation
                        FROM (
                            SELECT id, role, content, sources, message_type, reasoning, eli_explanation, created_at
                            FROM messages
                            ORDER BY created_at DESC
                            LIMIT ?
                        ) recent_messages
                        ORDER BY created_at ASC
                        """,
                        (safe_limit,),
                    ).fetchall()

                return [_build_history_message(r) for r in rows]
    except Exception as e:
        print(f"DB Error (get_messages): {e}")
        return []


def get_message_details(session_id: str, message_id: str) -> Optional[Dict[str, Any]]:
    try:
        with get_db() as conn:
            with conn:
                row = conn.execute(
                    """
                    SELECT id, role, content, sources, message_type, reasoning, eli_explanation
                    FROM messages
                    WHERE session_id = ? AND id = ?
                    LIMIT 1
                    """,
                    (session_id, message_id),
                ).fetchone()

                if not row:
                    return None

                message = {
                    "id": row[0],
                    "role": row[1],
                    "content": row[2],
                    "sources": row[3].split(",") if row[3] else [],
                    "consensus_used": row[4] == "moa_consensus",
                    "eli_explanation": row[6],
                }

                if row[5]:
                    try:
                        message["expert_analyses"] = json.loads(row[5])
                    except Exception:
                        message["expert_analyses"] = []

                return message
    except Exception as e:
        print(f"DB Error (get_message_details): {e}")
        return None

def delete_session(session_id: str):
    try:
        with get_db() as conn:
            with conn:
                conn.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
    except Exception as e:
        print(f"DB Error (delete_session): {e}")

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully.")

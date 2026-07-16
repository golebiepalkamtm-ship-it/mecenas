import sqlite3
import os
import json
import base64
import hashlib
import hmac
import secrets
from pathlib import Path
from typing import Optional, List, Dict, Any
from contextlib import contextmanager

# --- SZYFROWANIE DANYCH (AEAD - HMAC-SHA256 Keystream Cipher) ---
KEY_FILE = Path("cache") / "case_encryption.key"

def get_encryption_key() -> bytes:
    """Wczytuje lub generuje bezpieczny 32-bajtowy klucz szyfrujący (AES-equivalent strength)."""
    if not KEY_FILE.parent.exists():
        KEY_FILE.parent.mkdir(parents=True, exist_ok=True)
        
    if KEY_FILE.exists():
        try:
            with open(KEY_FILE, "rb") as f:
                key = base64.b64decode(f.read().strip())
                if len(key) == 32:
                    return key
        except Exception:
            pass
            
    # Generowanie nowego klucza
    new_key = secrets.token_bytes(32)
    with open(KEY_FILE, "wb") as f:
        f.write(base64.b64encode(new_key))
    return new_key

MASTER_KEY = get_encryption_key()

def encrypt_text(plaintext: str) -> str:
    """Szyfruje tekst za pomocą bezpiecznego szyfru strumieniowego opartego o HMAC-SHA256 (AEAD)."""
    if not plaintext:
        return ""
    try:
        data = plaintext.encode("utf-8")
        nonce = secrets.token_bytes(16)
        
        # Generowanie strumienia klucza
        keystream = b""
        counter = 0
        while len(keystream) < len(data):
            h = hmac.new(MASTER_KEY, nonce + counter.to_bytes(4, "big"), hashlib.sha256)
            keystream += h.digest()
            counter += 1
            
        # Szyfrowanie (XOR)
        ciphertext = bytes(a ^ b for a, b in zip(data, keystream))
        
        # Sygnatura MAC (Integrity verification)
        mac = hmac.new(MASTER_KEY, nonce + ciphertext, hashlib.sha256).digest()
        
        # Łączymy payload: nonce + mac + ciphertext
        payload = nonce + mac + ciphertext
        return "ENCv1:" + base64.b64encode(payload).decode("utf-8")
    except Exception as e:
        print(f"[CRYPT ERR] Błąd szyfrowania: {e}")
        return plaintext

def decrypt_text(ciphertext_b64: str) -> str:
    """Deszyfruje i weryfikuje integralność danych."""
    if not ciphertext_b64 or not ciphertext_b64.startswith("ENCv1:"):
        return ciphertext_b64
    try:
        payload = base64.b64decode(ciphertext_b64[6:])
        if len(payload) < 48:
            return "[CRYPT ERROR] Uszkodzony payload szyfru"
            
        nonce = payload[:16]
        mac = payload[16:48]
        ciphertext = payload[48:]
        
        # Weryfikacja integralności MAC
        expected_mac = hmac.new(MASTER_KEY, nonce + ciphertext, hashlib.sha256).digest()
        if not hmac.compare_digest(mac, expected_mac):
            return "[CRYPT ERROR] Naruszona integralność danych (Integrity Check Failed)"
            
        # Odtworzenie strumienia klucza
        keystream = b""
        counter = 0
        while len(keystream) < len(ciphertext):
            h = hmac.new(MASTER_KEY, nonce + counter.to_bytes(4, "big"), hashlib.sha256)
            keystream += h.digest()
            counter += 1
            
        # Deszyfrowanie (XOR)
        decrypted = bytes(a ^ b for a, b in zip(ciphertext, keystream))
        return decrypted.decode("utf-8")
    except Exception as e:
        print(f"[CRYPT ERR] Błąd deszyfrowania: {e}")
        return "[CRYPT ERROR] Błąd deszyfrowania"

DB_PATH = Path("cache") / "prawnik.db"

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
                ai_task TEXT,
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

        # 4. Add sources if missing (RAG / SAOS / ELI references)
        if 'sources' not in columns:
            print("Migrating DB: Adding 'sources' column to 'messages'")
            cursor.execute("ALTER TABLE messages ADD COLUMN sources TEXT")

        # 5. Add ai_task if missing (AI task mode selection)
        if 'ai_task' not in columns:
            print("Migrating DB: Adding 'ai_task' column to 'messages'")
            cursor.execute("ALTER TABLE messages ADD COLUMN ai_task TEXT")

        if 'cited_sources' not in columns:
            print("Migrating DB: Adding 'cited_sources' column to 'messages'")
            cursor.execute("ALTER TABLE messages ADD COLUMN cited_sources TEXT")

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
            
        # Profiles table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS profiles (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE,
                role TEXT DEFAULT 'user',
                full_name TEXT,
                subscription_tier TEXT DEFAULT 'free',
                favorite_models TEXT DEFAULT '[]',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Pre-populate with default admin if empty
        cursor.execute("SELECT COUNT(*) FROM profiles")
        if cursor.fetchone()[0] == 0:
            cursor.execute('''
                INSERT INTO profiles (id, email, role, full_name, subscription_tier)
                VALUES ('00000000-0000-0000-0000-000000000000', 'admin@lexmind.local', 'admin', 'Administrator LexMind', 'Premium Pro')
            ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS session_investigation (
                session_id TEXT PRIMARY KEY,
                state_json TEXT NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS semantic_cache (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                query_text TEXT NOT NULL,
                query_hash TEXT UNIQUE NOT NULL,
                embedding BLOB NOT NULL,
                response_json TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
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

def create_session(id: str, title: str):
    try:
        with get_db() as conn:
            with conn:
                conn.execute("INSERT OR REPLACE INTO sessions (id, title) VALUES (?, ?)", (id, title))
    except Exception as e:
        print(f"DB Error (create_session): {e}")

def save_session_investigation_state(session_id: str, state_json: str):
    try:
        enc = encrypt_text(state_json)
        with get_db() as conn:
            with conn:
                conn.execute(
                    """INSERT INTO session_investigation (session_id, state_json, updated_at)
                       VALUES (?, ?, CURRENT_TIMESTAMP)
                       ON CONFLICT(session_id) DO UPDATE SET state_json = excluded.state_json, updated_at = CURRENT_TIMESTAMP""",
                    (session_id, enc),
                )
    except Exception as e:
        print(f"[DB Error] (save_session_investigation_state): {e}")


def get_session_investigation_state(session_id: str) -> Optional[str]:
    try:
        with get_db() as conn:
            with conn:
                row = conn.execute(
                    "SELECT state_json FROM session_investigation WHERE session_id = ?",
                    (session_id,),
                ).fetchone()
                if not row or not row[0]:
                    return None
                return decrypt_text(row[0])
    except Exception as e:
        print(f"[DB Error] (get_session_investigation_state): {e}")
        return None


def save_message(id: str, session_id: str, role: str, content: str, sources: Optional[str] = None, message_type: Optional[str] = None, reasoning: Optional[str] = None, eli_explanation: Optional[str] = None, ai_task: Optional[str] = None, cited_sources: Optional[str] = None):
    try:
        # Próba wyciagnięcia czystego tekstu z JSONa dla tytułu (przed szyfrowaniem)
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

        # Szyfrujemy wrażliwe pola przed zapisem do bazy
        encrypted_content = encrypt_text(content)
        encrypted_reasoning = encrypt_text(reasoning) if reasoning else None
        encrypted_eli = encrypt_text(eli_explanation) if eli_explanation else None
        encrypted_cited = encrypt_text(cited_sources) if cited_sources else None

        with get_db() as conn:
            with conn:
                conn.execute("INSERT OR IGNORE INTO sessions (id, title) VALUES (?, ?)", (session_id, clean_title if role == 'user' else "Nowa Rozprawa"))
                
                # Update title if it's still generic and we have a user message
                if role == 'user':
                    conn.execute("UPDATE sessions SET title = ? WHERE id = ? AND (title = 'Nowa Rozprawa' OR title LIKE '[%')", (clean_title, session_id))
                
                conn.execute(
                    "INSERT INTO messages (id, session_id, role, content, sources, message_type, reasoning, eli_explanation, ai_task, cited_sources, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)", 
                    (id, session_id, role, encrypted_content, sources, message_type, encrypted_reasoning, encrypted_eli, ai_task, encrypted_cited)
                )
                conn.execute("UPDATE sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?", (session_id,))
    except Exception as e:
        print(f"[DB Error] (save_message): {e}")

def get_messages(session_id: Optional[str] = None, limit: int = 200) -> List[Dict[str, Any]]:
    try:
        with get_db() as conn:
            with conn:
                if session_id:
                    rows = conn.execute("SELECT id, role, content, sources, message_type, reasoning, eli_explanation, ai_task, cited_sources FROM messages WHERE session_id = ? ORDER BY rowid ASC LIMIT ?", (session_id, limit)).fetchall()
                else:
                    rows = conn.execute("SELECT id, role, content, sources, message_type, reasoning, eli_explanation, ai_task, cited_sources FROM messages ORDER BY rowid ASC LIMIT ?", (limit,)).fetchall()
                
                messages = []
                for r in rows:
                    # Deszyfrujemy wrażliwe pola przed przekazaniem do UI
                    decrypted_content = decrypt_text(r[2])
                    decrypted_reasoning = decrypt_text(r[5]) if r[5] else None
                    decrypted_eli = decrypt_text(r[6]) if r[6] else None
                    decrypted_cited = decrypt_text(r[8]) if len(r) > 8 and r[8] else None

                    msg = {
                        "id": r[0], 
                        "role": r[1], 
                        "content": decrypted_content, 
                        "sources": r[3].split(",") if r[3] else [],
                        "consensus_used": r[4] == "moa_consensus",
                        "eli_explanation": decrypted_eli,
                        "ai_task": r[7] if len(r) > 7 else None
                    }
                    if decrypted_reasoning: # reasoning -> expert_analyses
                        try:
                            msg["expert_analyses"] = json.loads(decrypted_reasoning)
                        except:
                            msg["expert_analyses"] = []
                    if decrypted_cited:
                        try:
                            msg["cited_sources"] = json.loads(decrypted_cited)
                        except json.JSONDecodeError:
                            msg["cited_sources"] = []
                    messages.append(msg)
                return messages
    except Exception as e:
        print(f"DB Error (get_messages): {e}")
        return []

def get_message_details(session_id: str, message_id: str) -> Optional[Dict[str, Any]]:
    try:
        with get_db() as conn:
            with conn:
                row = conn.execute(
                    "SELECT id, role, content, sources, message_type, reasoning, eli_explanation, ai_task FROM messages WHERE session_id = ? AND id = ?",
                    (session_id, message_id),
                ).fetchone()
                if not row:
                    return None
                
                decrypted_content = decrypt_text(row[2])
                decrypted_reasoning = decrypt_text(row[5]) if row[5] else None
                decrypted_eli = decrypt_text(row[6]) if row[6] else None

                msg = {
                    "id": row[0], 
                    "role": row[1], 
                    "content": decrypted_content, 
                    "sources": row[3].split(",") if row[3] else [],
                    "consensus_used": row[4] == "moa_consensus",
                    "eli_explanation": decrypted_eli,
                    "ai_task": row[7]
                }
                if decrypted_reasoning:
                    try:
                        msg["expert_analyses"] = json.loads(decrypted_reasoning)
                    except:
                        msg["expert_analyses"] = []
                return msg
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

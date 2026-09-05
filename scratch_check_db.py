import sqlite3
import json

db_path = "cache/prawnik.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("--- SESSIONS ---")
cursor.execute("SELECT id, title, created_at, updated_at FROM sessions LIMIT 10")
sessions = cursor.fetchall()
for s in sessions:
    print(s)

print("\n--- MESSAGES COUNT PER SESSION ---")
cursor.execute("SELECT session_id, COUNT(*) FROM messages GROUP BY session_id")
counts = cursor.fetchall()
for c in counts:
    print(c)

if counts:
    last_session = counts[0][0]
    print(f"\n--- MESSAGES FOR SESSION {last_session} ---")
    cursor.execute("SELECT id, role, content FROM messages WHERE session_id = ? LIMIT 5", (last_session,))
    for m in cursor.fetchall():
        print(m[:2], m[2][:100] + "...")

conn.close()

import sqlite3
import json
import base64
from database import decrypt_text

conn = sqlite3.connect('cache/prawnik.db')
cursor = conn.cursor()
rows = cursor.execute('SELECT created_at, role, message_type, content, eli_explanation FROM messages ORDER BY created_at DESC LIMIT 5').fetchall()
for r in rows:
    print(r[0], r[1], r[2])
    print('Content:', decrypt_text(r[3])[:300])
    print('ELI:', decrypt_text(r[4])[:300] if r[4] else 'None')
    print('-' * 40)

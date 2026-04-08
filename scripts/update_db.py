import sqlite3
from pathlib import Path

DB_PATH = Path('cache') / 'prawnik.db'
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# Sprawdź strukturę tabeli
cursor.execute('PRAGMA table_info(messages)')
columns = cursor.fetchall()
print('Struktura tabeli messages:')
for col in columns:
    print(f'  {col[1]} {col[2]}')

# Dodaj brakujące kolumny
try:
    cursor.execute('ALTER TABLE messages ADD COLUMN message_type TEXT DEFAULT "standard"')
    print('✅ Dodano kolumnę message_type')
except Exception as e:
    print('Kolumna message_type już istnieje:', e)

try:
    cursor.execute('ALTER TABLE messages ADD COLUMN reasoning TEXT')
    print('✅ Dodano kolumnę reasoning')
except Exception as e:
    print('Kolumna reasoning już istnieje:', e)

conn.commit()
conn.close()
print('✅ Struktura bazy zaktualizowana')

import sqlite3

conn = sqlite3.connect('cache/prawnik.db')
cursor = conn.cursor()

# Get all tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cursor.fetchall()
print("Tables in database:")
for table in tables:
    print(f"  - {table[0]}")

# Check if profiles exists
if any('profiles' in table[0] for table in tables):
    print("\nProfiles table exists!")
    cursor.execute('SELECT id, email, role FROM profiles LIMIT 10')
    users = cursor.fetchall()
    print("Sample users:")
    for user in users:
        print(f"  ID: {user[0]}, Email: {user[1]}, Role: {user[2]}")
else:
    print("\nNo profiles table found!")

conn.close()

import sqlite3

conn = sqlite3.connect('cache/prawnik.db')
cursor = conn.cursor()

# Check all users
cursor.execute('SELECT id, email, role FROM profiles')
users = cursor.fetchall()
print("All users:")
for user in users:
    print(f"  ID: {user[0]}, Email: {user[1]}, Role: {user[2]}")

# Check superadmin specifically
cursor.execute('SELECT id, email, role FROM profiles WHERE email LIKE "%superadmin%"')
superadmin = cursor.fetchall()
print("\nSuperadmin users:")
for user in superadmin:
    print(f"  ID: {user[0]}, Email: {user[1]}, Role: {user[2]}")

conn.close()

import sqlite3
import os
import sys

db_path = "cache/prawnik.db"

def clean_db():
    if not os.path.exists(db_path):
        print(f"[INFO] Database {db_path} does not exist. Nothing to clean.")
        return

    print(f"--- CLEANING DATABASE: {db_path} ---")
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Get tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [row[0] for row in cursor.fetchall()]
        
        print(f"Found tables: {', '.join(tables)}")
        
        for table in tables:
            # We don't want to delete everything usually, 
            # but for a 'CLEAN' we will clear the messages and sessions if that's the goal.
            # If the user wants a TOTAL wipe, they should delete the file.
            print(f"Cleaning table {table}...")
            cursor.execute(f"DELETE FROM {table}")
        
        conn.commit()
        cursor.execute("VACUUM") # Shrink file size
        conn.close()
        print("[SUCCESS] Database cleaned and vacuumed.")
        
    except Exception as e:
        print(f"[ERROR] Could not clean database: {e}")

if __name__ == "__main__":
    confirm = input("Are you sure you want to CLEAR all messages and sessions? (y/n): ")
    if confirm.lower() == 'y':
        clean_db()
    else:
        print("Aborted.")

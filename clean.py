import sqlite3

def clean_large_images():
    """Oczyszcza bazę danych z olbrzymich plików graficznych osadzonych w base64,
    zastępując je krótkim tekstem [załącznik], co zapobiega rozrastaniu się pliku SQLite."""
    try:
        db_path = "cache/prawnik.db"
        db = sqlite3.connect(db_path)
        c = db.cursor()
        
        c.execute("UPDATE messages SET content = '[załącznik]' WHERE content LIKE '%data:image%'")
        print(f"Pomyślnie oczyszczono {c.rowcount} rekordów z dużych obrazów base64.")
        db.commit()
        db.close()
    except Exception as e:
        print(f"Błąd czyszczenia bazy danych: {e}")

if __name__ == "__main__":
    clean_large_images()

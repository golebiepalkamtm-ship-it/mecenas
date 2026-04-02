import re
from pathlib import Path

SQL_INPUT = Path("seed_data.sql")
OUTPUT_DIR = Path("sql_parts")

if not OUTPUT_DIR.exists():
    OUTPUT_DIR.mkdir()

current_file = None
current_content = []
file_counter = 1

print("Dzielenie pliku seed_data.sql...")

with SQL_INPUT.open("r", encoding="utf-8") as f:
    for line in f:
        if line.startswith("-- REFRESH:"):
            # Zapisz poprzedni plik
            if current_file and current_content:
                out_path = OUTPUT_DIR / f"seed_part_{file_counter:02d}_{current_file}.sql"
                out_path.write_text("".join(current_content), encoding="utf-8")
                print(f"Zapisano: {out_path.name}")
                file_counter += 1
            
            # Zresetuj dla nowego pliku
            match = re.search(r'-- REFRESH:\s*(.+)', line)
            if match:
                current_file = match.group(1).replace(" ", "_").replace(".pdf", "")
            else:
                current_file = "unknown"
            current_content = [line]
        elif current_file:
            current_content.append(line)

# Zapisz ostatni plik
if current_file and current_content:
    out_path = OUTPUT_DIR / f"seed_part_{file_counter:02d}_{current_file}.sql"
    out_path.write_text("".join(current_content), encoding="utf-8")
    print(f"Zapisano: {out_path.name}")

print("Koniec dzielenia!")

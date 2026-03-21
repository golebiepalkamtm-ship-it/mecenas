import re
from pathlib import Path

SQL_OUTPUT = Path("seed_data.sql")
counts = {}

if SQL_OUTPUT.exists():
    with SQL_OUTPUT.open("r", encoding="utf-8") as f:
        for line in f:
            if "INSERT INTO public.knowledge_base" in line:
                match = re.search(r'"filename":\s*"([^"]+)"', line)
                if match:
                    filename = match.group(1)
                    counts[filename] = counts.get(filename, 0) + 1

    print("--- PODSUMOWANIE BAZY WIEDZY ---")
    total_files = len(counts)
    total_chunks = sum(counts.values())
    for filename, count in counts.items():
        print(f"📄 {filename}: {count} fragmentów")
    print("-" * 30)
    print(f"✅ RAZEM: {total_files} plików, {total_chunks} fragmentów")
else:
    print("Brak pliku seed_data.sql")

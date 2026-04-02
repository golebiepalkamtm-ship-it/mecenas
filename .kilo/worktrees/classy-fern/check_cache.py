import pickle
from pathlib import Path

CHUNKS_PATH = Path("cache") / "all_chunks.pkl"
if CHUNKS_PATH.exists():
    with open(CHUNKS_PATH, "rb") as f:
        data = pickle.load(f)
        sources = set(d.metadata.get("source") for d in data)
        print(f"Total chunks: {len(data)}")
        print(f"Unique sources: {len(sources)}")
        for s in sorted(sources):
            print(f"- {s}")
else:
    print("Cache not found.")

import asyncio
import httpx
from services.retrieval_service import retrieval_service

async def main():
    print("Testing ELI directly...")
    try:
        eli_res = await retrieval_service.search_eli("Kodeks postępowania karnego", limit=3)
        print(f"ELI success. Found {len(eli_res)} results:")
        for r in eli_res:
            print("-", r.get("source"), "|", r.get("title"))
    except Exception as e:
        print("ELI failed:", e)

    print("\nTesting SAOS directly...")
    try:
        saos_res = await retrieval_service.search_saos("narkotyki", limit=3)
        print(f"SAOS success. Found {len(saos_res)} results:")
        for r in saos_res:
            print("-", r.get("source"), "|", r.get("title"))
    except Exception as e:
        print("SAOS failed:", e)

if __name__ == "__main__":
    asyncio.run(main())

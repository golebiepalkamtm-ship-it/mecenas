import httpx
import json

def fetch_saos():
    url = "https://www.saos.org.pl/api/search/judgments"
    # Search for art 64 recydywa kara laczna and art 54 upn
    queries = [
        {"all": "art. 64 § 1 kara łączna jednostkowa", "pageSize": 5},
        {"all": "art. 54 ust. 1 przyrządy wytwarzanie", "pageSize": 5},
        {"all": "metamfetamina stężenie roztwór zanieczyszczenia", "pageSize": 5}
    ]
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json"
    }
    
    client = httpx.Client(timeout=15.0, verify=False)
    for q in queries:
        print(f"=== SEARCH: {q['all']} ===")
        try:
            r = client.get(url, params=q, headers=headers)
            print("Status:", r.status_code)
            if r.status_code == 200:
                data = r.json()
                items = data.get("items", [])
                print(f"Found {len(items)} items")
                for item in items:
                    print("ID:", item.get("id"))
                    print("Court:", item.get("courtType"), (item.get("courtCases") or [{}])[0].get("caseNumber"))
                    print("Date:", item.get("judgmentDate"))
                    print("Text snippet:", (item.get("textContent") or "")[:300].replace("\n", " "))
                    print("-" * 40)
            else:
                print("Error text:", r.text[:200])
        except Exception as e:
            print("Exception:", e)

if __name__ == "__main__":
    fetch_saos()

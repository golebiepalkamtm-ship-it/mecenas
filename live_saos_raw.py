import requests
import json
import urllib3
urllib3.disable_warnings()

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "application/json"
}

url = "https://www.saos.org.pl/api/search/judgments"
params = {
    "all": "art. 62a",
    "courtType": "COMMON",
    "pageSize": 3,
    "pageNumber": 0
}

try:
    resp = requests.get(url, params=params, headers=headers, timeout=15, verify=False)
    print("STATUS:", resp.status_code)
    if resp.status_code == 200:
        data = resp.json()
        print("TOTAL RESULTS:", data.get("info", {}).get("totalResults"))
        items = data.get("items", [])
        for i, item in enumerate(items):
            print(f"\n--- ITEM {i+1} RAW SAOS DATA ---")
            print("ID:", item.get("id"))
            print("HREF:", item.get("href"))
            print("COURT CASES:", item.get("courtCases"))
            print("JUDGMENT DATE:", item.get("judgmentDate"))
            print("COURT:", item.get("division", {}).get("court", {}).get("name"))
            print("DIVISION:", item.get("division", {}).get("name"))
            print("TEXT SNIPPET:", item.get("textContent")[:300] if item.get("textContent") else "None")
    else:
        print("RESPONSE TEXT:", resp.text[:500])
except Exception as e:
    print("ERROR:", e)

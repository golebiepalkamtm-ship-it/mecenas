import requests
import json
import urllib3
urllib3.disable_warnings()

url = "https://www.saos.org.pl/api/search/judgments"
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "application/json",
    "Referer": "https://www.saos.org.pl/"
}

# Test 1: SAOS API search
params = {
    "all": "art. 64 § 1 k.k. kara łączna",
    "pageSize": 5,
    "pageNumber": 0,
    "sortingField": "JUDGMENT_DATE",
    "sortingDirection": "DESC"
}

try:
    print("Wysyłam zapytanie do SAOS API...")
    res = requests.get(url, params=params, headers=headers, timeout=60, verify=False)
    print("Status HTTP:", res.status_code)
    if res.status_code == 200:
        data = res.json()
        print("Liczba elementów:", len(data.get("items", [])))
        with open("saos_output.json", "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print("Zapisano do saos_output.json")
    else:
        print("Błąd odpowiedzi:", res.text[:300])
except Exception as e:
    print("Wyjątek:", e)

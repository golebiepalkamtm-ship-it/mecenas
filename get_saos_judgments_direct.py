import requests
import json
import urllib3
urllib3.disable_warnings()

SAOS_SEARCH = "https://www.saos.org.pl/api/search/judgments"
SAOS_DETAILS = "https://www.saos.org.pl/api/judgments"

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "application/json",
    "Referer": "https://www.saos.org.pl/"
}

topics = [
    {
        "name": "Art 54 u.p.n. - Przyrządy do wytwarzania",
        "query": "art. 54 ust. 1 wytwarzania przyrządy",
        "courtType": "COMMON"
    },
    {
        "name": "Art 62 ust. 3 u.p.n. - Wypadek mniejszej wagi / nieznaczna ilość",
        "query": "art. 62 ust. 3 mniejszej wagi nieznaczna ilość",
        "courtType": "COMMON"
    },
    {
        "name": "Metamfetamina - masa substancji / stężenie / roztwór",
        "query": "metamfetamina stężenie porcja netto",
        "courtType": "COMMON"
    },
    {
        "name": "Art 64 § 1 k.k. - Recydywa a kara jednostkowa i łączna",
        "query": "art. 64 § 1 kara łączna jednostkowa",
        "courtType": "COMMON"
    }
]

collected_judgments = []

for t in topics:
    print(f"\n==========================================")
    print(f"SZUKAM W SAOS DLA: {t['name']}")
    print(f"Query: {t['query']}")
    print(f"==========================================")
    params = {
        "all": t["query"],
        "courtType": t["courtType"],
        "pageSize": 3,
        "pageNumber": 0,
        "sortingField": "JUDGMENT_DATE",
        "sortingDirection": "DESC"
    }
    try:
        r = requests.get(SAOS_SEARCH, params=params, headers=headers, timeout=40, verify=False)
        if r.status_code == 200:
            data = r.json()
            items = data.get("items", [])
            print(f"Znaleziono {len(items)} orzeczeń.")
            for it in items:
                jid = it.get("id")
                case_num = (it.get("courtCases") or [{}])[0].get("caseNumber", "N/A")
                court_name = (it.get("division") or {}).get("court", {}).get("name", "Sąd")
                div_name = (it.get("division") or {}).get("name", "")
                jdate = it.get("judgmentDate", "")
                
                # Fetch details if possible
                full_text = ""
                try:
                    det_r = requests.get(f"{SAOS_DETAILS}/{jid}", headers=headers, timeout=20, verify=False)
                    if det_r.status_code == 200:
                        det_data = det_r.json().get("data", {})
                        full_text = det_data.get("textContent", "")
                except Exception as e:
                    full_text = it.get("textContent", "")
                
                clean_snippet = (full_text or it.get("textContent") or "")[:2000]
                
                entry = {
                    "topic": t["name"],
                    "id": jid,
                    "case_number": case_num,
                    "court": f"{court_name} ({div_name})",
                    "date": jdate,
                    "snippet": clean_snippet,
                    "saos_url": f"https://www.saos.org.pl/judgments/{jid}"
                }
                collected_judgments.append(entry)
                print(f"-> ID: {jid} | Sygn. {case_num} | {court_name} | Data: {jdate}")
        else:
            print("Błąd HTTP:", r.status_code, r.text[:200])
    except Exception as e:
        print("Wyjątek:", e)

with open("saos_verified_database.json", "w", encoding="utf-8") as f:
    json.dump(collected_judgments, f, ensure_ascii=False, indent=2)

print("\nZakończono pobieranie. Zapisano do saos_verified_database.json")

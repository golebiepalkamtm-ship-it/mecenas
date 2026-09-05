import requests
import json
import urllib3
urllib3.disable_warnings()

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "application/json",
    "Referer": "https://www.saos.org.pl/"
}

# Wyszukiwanie orzeczeń kluczowych dla spraw narkotykowych i recydywy
searches = [
    {"label": "Art 54 ust. 1 u.p.n. - Przyrządy", "params": {"all": "art. 54 ust. 1 przyrządy", "courtType": "COMMON", "pageSize": 3}},
    {"label": "Art 62 ust. 3 u.p.n. - Wypadek mniejszej wagi", "params": {"all": "art. 62 ust. 3 wypadek mniejszej wagi znikoma", "courtType": "COMMON", "pageSize": 3}},
    {"label": "Art 64 § 1 k.k. - Recydywa kara jednostkowa", "params": {"all": "art. 64 § 1 k.k. kara jednostkowa 6 miesięcy", "courtType": "COMMON", "pageSize": 3}},
    {"label": "Metamfetamina - zanieczyszczenia płyny roztwór", "params": {"all": "metamfetamina roztwór stężenie zanieczyszczenia", "courtType": "COMMON", "pageSize": 3}}
]

all_found = []

for s in searches:
    print(f"\n==================== {s['label']} ====================", flush=True)
    try:
        r = requests.get("https://www.saos.org.pl/api/search/judgments", params=s["params"], headers=headers, timeout=20, verify=False)
        if r.status_code == 200:
            items = r.json().get("items", [])
            print(f"Znaleziono: {len(items)} orzeczeń", flush=True)
            for it in items:
                case_no = (it.get("courtCases") or [{}])[0].get("caseNumber", "N/A")
                court = (it.get("division") or {}).get("court", {}).get("name", "Sąd")
                date = it.get("judgmentDate", "N/A")
                judges = [j.get("name") for j in it.get("judges", []) if j.get("name")]
                snip = (it.get("textContent") or "")[:350].replace("<em>", "").replace("</em>", "").replace("\n", " ")
                jid = it.get("id")
                
                print(f"- Sygn. {case_no} | {date} | {court} | ID SAOS: {jid}", flush=True)
                print(f"  Sędziowie: {', '.join(judges)}", flush=True)
                print(f"  Fragment: {snip}...", flush=True)
                
                all_found.append({
                    "label": s["label"],
                    "id": jid,
                    "case_number": case_no,
                    "court": court,
                    "date": date,
                    "judges": judges,
                    "snippet": snip,
                    "url": f"https://www.saos.org.pl/judgments/{jid}"
                })
        else:
            print(f"Błąd HTTP: {r.status_code}", flush=True)
    except Exception as e:
        print(f"Wyjątek: {e}", flush=True)

with open("saos_live_results.json", "w", encoding="utf-8") as f:
    json.dump(all_found, f, ensure_ascii=False, indent=2)

print("\nGOTOWE!", flush=True)

import requests
import json
import urllib3
urllib3.disable_warnings()

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "application/json",
    "Referer": "https://www.saos.org.pl/"
}

searches = [
    {
        "label": "1. Art. 54 ust. 1 u.p.n. (Przyrządy do wytwarzania)",
        "params": {
            "all": "przeciwdziałaniu narkomanii art. 54 ust. 1 przyrządy",
            "pageSize": 5,
            "sortingField": "JUDGMENT_DATE",
            "sortingDirection": "DESC"
        }
    },
    {
        "label": "2. Art. 62 ust. 3 u.p.n. (Wypadek mniejszej wagi / nieznaczna ilość na własny użytek)",
        "params": {
            "all": "przeciwdziałaniu narkomanii art. 62 ust. 3 mniejszej wagi nieznaczna ilość",
            "pageSize": 5,
            "sortingField": "JUDGMENT_DATE",
            "sortingDirection": "DESC"
        }
    },
    {
        "label": "3. Metamfetamina - masa substancji / stężenie / roztwór poreakcyjny",
        "params": {
            "all": "metamfetamina stężenie roztwór zanieczyszczenia czysta substancja",
            "pageSize": 5,
            "sortingField": "JUDGMENT_DATE",
            "sortingDirection": "DESC"
        }
    },
    {
        "label": "4. Art. 64 § 1 k.k. - Recydywa a kara łączna i kara jednostkowa",
        "params": {
            "all": "art. 64 § 1 k.k. kara łączna jednostkowa przestępstwo podobne",
            "pageSize": 5,
            "sortingField": "JUDGMENT_DATE",
            "sortingDirection": "DESC"
        }
    }
]

results_db = []

for s in searches:
    print(f"\n=======================================================", flush=True)
    print(f"SZUKAM W SAOS API: {s['label']}", flush=True)
    print(f"=======================================================", flush=True)
    try:
        r = requests.get("https://www.saos.org.pl/api/search/judgments", params=s["params"], headers=headers, timeout=30, verify=False)
        if r.status_code == 200:
            items = r.json().get("items", [])
            print(f"Liczba pobranych orzeczeń: {len(items)}", flush=True)
            for it in items:
                jid = it.get("id")
                case_no = (it.get("courtCases") or [{}])[0].get("caseNumber", "N/A")
                court = (it.get("division") or {}).get("court", {}).get("name", "Sąd")
                div = (it.get("division") or {}).get("name", "")
                date = it.get("judgmentDate", "N/A")
                judges = [j.get("name") for j in it.get("judges", []) if j.get("name")]
                
                # Fetch judgment details
                det_res = requests.get(f"https://www.saos.org.pl/api/judgments/{jid}", headers=headers, timeout=20, verify=False)
                full_text = ""
                legal_bases = []
                if det_res.status_code == 200:
                    d_data = det_res.json().get("data", {})
                    full_text = d_data.get("textContent", "")
                    legal_bases = d_data.get("legalBases", [])
                
                if not full_text:
                    full_text = it.get("textContent", "")
                
                import re
                clean = re.sub(r"<[^>]+>", " ", full_text)
                clean = re.sub(r"\s+", " ", clean).strip()
                
                print(f"\n-> WYROK ID {jid}: Sygn. akt {case_no} | {date} | {court} ({div})", flush=True)
                print(f"   Sędziowie: {', '.join(judges)}", flush=True)
                print(f"   Podstawy prawne: {legal_bases}", flush=True)
                print(f"   Fragment uzasadnienia: {clean[:400]}...", flush=True)
                
                results_db.append({
                    "kategoria": s["label"],
                    "id_saos": jid,
                    "sygnatura": case_no,
                    "data": date,
                    "sad": court,
                    "wydzial": div,
                    "sedziowie": judges,
                    "podstawy_prawne": legal_bases,
                    "fragment_uzasadnienia": clean[:1500],
                    "link_saos": f"https://www.saos.org.pl/judgments/{jid}"
                })
        else:
            print(f"Błąd HTTP {r.status_code}: {r.text[:200]}", flush=True)
    except Exception as e:
        print(f"Wyjątek: {e}", flush=True)

with open("saos_final_verified_judgments.json", "w", encoding="utf-8") as f:
    json.dump(results_db, f, ensure_ascii=False, indent=2)

print("\nWSZYSTKIE ORZECZENIA POBRANE I ZAPISANE!", flush=True)

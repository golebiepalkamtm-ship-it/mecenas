import requests
import json
import re
import urllib3
urllib3.disable_warnings()

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "application/json",
    "Referer": "https://www.saos.org.pl/"
}

search_queries = [
    {
        "category": "RECYDYWA_KARA_LACZNA",
        "description": "Art. 64 § 1 k.k. - warunek odbycia co najmniej 6 miesięcy za przestępstwo podobne w ramach kary łącznej",
        "params": {
            "all": "art. 64 § 1 k.k. kara łączna jednostkowa odbycia 6 miesięcy podobne",
            "courtType": "COMMON",
            "pageSize": 5,
            "sortingField": "JUDGMENT_DATE",
            "sortingDirection": "DESC"
        }
    },
    {
        "category": "RECYDYWA_SN",
        "description": "Sąd Najwyższy - recydywa art. 64 § 1 k.k. a kara łączna",
        "params": {
            "all": "64 § 1 kara łączna jednostkowa odbycie",
            "courtType": "SUPREME_COURT",
            "pageSize": 5,
            "sortingField": "JUDGMENT_DATE",
            "sortingDirection": "DESC"
        }
    },
    {
        "category": "WYPADEK_MNIEJSZEJ_WAGI_62_3",
        "description": "Art. 62 ust. 3 u.p.n. - wypadek mniejszej wagi przy ilościach rzędu ułamków grama / pojedynczych gramów na własny użytek",
        "params": {
            "all": "art. 62 ust. 3 mniejszej wagi własny użytek grama",
            "courtType": "COMMON",
            "pageSize": 5,
            "sortingField": "JUDGMENT_DATE",
            "sortingDirection": "DESC"
        }
    },
    {
        "category": "UMORZENIE_62A",
        "description": "Art. 62a u.p.n. - umorzenie postępowania z uwagi na nieznaczną ilość i brak celów handlowych",
        "params": {
            "all": "art. 62a nieznaczna ilość umorzenie własny użytek",
            "courtType": "COMMON",
            "pageSize": 5,
            "sortingField": "JUDGMENT_DATE",
            "sortingDirection": "DESC"
        }
    },
    {
        "category": "PRZYRZADY_ART_54",
        "description": "Art. 54 ust. 1 u.p.n. - przyrządy powszechnego użytku a brak bezpośredniego przystosowania",
        "params": {
            "all": "art. 54 ust. 1 przyrządy przeznaczone wytwarzania powszechnego",
            "courtType": "COMMON",
            "pageSize": 5,
            "sortingField": "JUDGMENT_DATE",
            "sortingDirection": "DESC"
        }
    },
    {
        "category": "PLYNY_POREAKCYJNE_STEZENIE",
        "description": "Płyny poreakcyjne i zawartość czystej substancji (nie waga całego płynu/odpadu)",
        "params": {
            "all": "substancji psychotropowej stężenie czysta substancja płyn roztwór",
            "courtType": "COMMON",
            "pageSize": 5,
            "sortingField": "JUDGMENT_DATE",
            "sortingDirection": "DESC"
        }
    }
]

detailed_results = []

for sq in search_queries:
    print(f"\n=======================================================", flush=True)
    print(f"SZUKAM: {sq['description']}", flush=True)
    print(f"=======================================================", flush=True)
    try:
        r = requests.get("https://www.saos.org.pl/api/search/judgments", params=sq["params"], headers=headers, timeout=25, verify=False)
        if r.status_code == 200:
            items = r.json().get("items", [])
            print(f"Znaleziono {len(items)} orzeczeń.", flush=True)
            for it in items:
                jid = it.get("id")
                case_no = (it.get("courtCases") or [{}])[0].get("caseNumber", "N/A")
                court = (it.get("division") or {}).get("court", {}).get("name", "Sąd")
                div = (it.get("division") or {}).get("name", "")
                date = it.get("judgmentDate", "N/A")
                judges = [j.get("name") for j in it.get("judges", []) if j.get("name")]
                
                # Fetch full text details
                full_text = ""
                legal_bases = []
                try:
                    det = requests.get(f"https://www.saos.org.pl/api/judgments/{jid}", headers=headers, timeout=15, verify=False)
                    if det.status_code == 200:
                        d_json = det.json().get("data", {})
                        full_text = d_json.get("textContent", "")
                        legal_bases = d_json.get("legalBases", [])
                except Exception as e:
                    pass
                
                if not full_text:
                    full_text = it.get("textContent", "")
                
                clean = re.sub(r"<[^>]+>", " ", full_text)
                clean = re.sub(r"\s+", " ", clean).strip()
                
                # Only keep criminal / SN / relevant judgments
                if "K" in case_no or "Ka" in case_no or "AKa" in case_no or "KK" in case_no or "KZP" in case_no or "Ko" in case_no:
                    print(f"-> Sygn. {case_no} | {date} | {court} (SAOS ID: {jid})", flush=True)
                    detailed_results.append({
                        "category": sq["category"],
                        "category_desc": sq["description"],
                        "id": jid,
                        "case_number": case_no,
                        "court": court,
                        "division": div,
                        "date": date,
                        "judges": judges,
                        "legal_bases": legal_bases,
                        "text_snippet": clean[:2500],
                        "url": f"https://www.saos.org.pl/judgments/{jid}"
                    })
        else:
            print(f"Błąd HTTP {r.status_code}: {r.text[:100]}", flush=True)
    except Exception as ex:
        print(f"Błąd zapytania: {ex}", flush=True)

with open("saos_defense_comprehensive.json", "w", encoding="utf-8") as f:
    json.dump(detailed_results, f, ensure_ascii=False, indent=2)

print(f"\nZapisano {len(detailed_results)} zweryfikowanych karnych orzeczeń do saos_defense_comprehensive.json", flush=True)

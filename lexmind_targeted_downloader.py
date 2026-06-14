"""
LexMind RAG — Targeted Acts Downloader
=======================================
Pobiera konkretne akty prawne wskazane przez użytkownika.
Dla każdego aktu: szuka NAJNOWSZEGO tekstu jednolitego przez API,
pobiera pełny HTML (preferred) lub PDF.

Pokrywa kategorie:
  💰 Podatki i finanse
  💻 Technologia, IT, własność intelektualna
  🏢 Samorząd i struktura państwa
  + wszystkie inne z listy

WYMAGANIA:
    pip install requests tqdm

UŻYCIE:
    python lexmind_targeted_downloader.py
"""

import re
import json
import time
import logging
import requests
from pathlib import Path
from tqdm import tqdm

# ─────────────────────────────────────────────────────────
# KONFIGURACJA
# ─────────────────────────────────────────────────────────

OUTPUT_DIR    = Path("./lexmind_acts")
REQUEST_DELAY = 0.3
MAX_RETRIES   = 3
PREFER_HTML   = True

OUTPUT_DIR.mkdir(exist_ok=True)
(OUTPUT_DIR / "docs").mkdir(exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(OUTPUT_DIR / "download.log"),
        logging.StreamHandler(),
    ]
)
log = logging.getLogger(__name__)

SESSION = requests.Session()
SESSION.headers.update({
    "User-Agent": "LexMindAI/1.0 (legal RAG; contact: admin@lexmind.pl)",
    "Accept": "application/json",
})

# ─────────────────────────────────────────────────────────
# LISTA AKTÓW DO POBRANIA
# Każdy wpis: (fraza_do_szukania, opis_kategorii)
# Skrypt sam znajdzie najnowszy tekst jednolity przez API.
# ─────────────────────────────────────────────────────────

ACTS_TO_DOWNLOAD = [

    # ══════════════════════════════════════════════════
    # 📚 KODEKSY
    # ══════════════════════════════════════════════════
    ("kodeks cywilny",                                      "KODEKS"),
    ("kodeks postępowania cywilnego",                       "KODEKS"),
    ("kodeks karny",                                        "KODEKS"),
    ("kodeks postępowania karnego",                         "KODEKS"),
    ("kodeks pracy",                                        "KODEKS"),
    ("kodeks spółek handlowych",                            "KODEKS"),
    ("kodeks postępowania administracyjnego",               "KODEKS"),
    ("kodeks rodzinny i opiekuńczy",                        "KODEKS"),
    ("kodeks wykroczeń",                                    "KODEKS"),
    ("kodeks postępowania w sprawach o wykroczenia",        "KODEKS"),
    ("kodeks karny wykonawczy",                             "KODEKS"),
    ("kodeks wyborczy",                                     "KODEKS"),
    ("kodeks karny skarbowy",                               "KODEKS"),
    ("kodeks morski",                                       "KODEKS"),
    ("kodeks celny",                                        "KODEKS"),

    # ══════════════════════════════════════════════════
    # 💰 PODATKI I FINANSE
    # ══════════════════════════════════════════════════
    ("podatku dochodowym od osób fizycznych",               "PODATKI"),
    ("podatku dochodowym od osób prawnych",                 "PODATKI"),
    ("podatku od towarów i usług",                          "PODATKI"),
    ("rachunkowości",                                       "PODATKI"),
    ("finansach publicznych",                               "PODATKI"),
    ("podatkach i opłatach lokalnych",                      "PODATKI"),
    ("Krajowej Administracji Skarbowej",                    "PODATKI"),
    ("ordynacja podatkowa",                                 "PODATKI"),
    ("podatku akcyzowym",                                   "PODATKI"),
    ("podatku od nieruchomości",                            "PODATKI"),
    ("podatku od czynności cywilnoprawnych",                "PODATKI"),
    ("podatku od spadków i darowizn",                       "PODATKI"),
    ("ryczałcie od przychodów ewidencjonowanych",           "PODATKI"),
    ("Narodowym Banku Polskim",                             "PODATKI"),
    ("prawo bankowe",                                       "PODATKI"),
    ("nadzorze nad rynkiem finansowym",                     "PODATKI"),
    ("obrocie instrumentami finansowymi",                   "PODATKI"),

    # ══════════════════════════════════════════════════
    # 💻 TECHNOLOGIA, IT, WŁASNOŚĆ INTELEKTUALNA
    # ══════════════════════════════════════════════════
    ("ochronie danych osobowych",                           "IT"),
    ("świadczeniu usług drogą elektroniczną",               "IT"),
    ("prawo telekomunikacyjne",                             "IT"),
    ("prawo komunikacji elektronicznej",                    "IT"),
    ("prawie autorskim i prawach pokrewnych",               "IT"),
    ("własności przemysłowej",                              "IT"),
    ("krajowym systemie cyberbezpieczeństwa",               "IT"),
    ("informatyzacji działalności podmiotów",               "IT"),
    ("podpisie elektronicznym",                             "IT"),
    ("podpisie zaufanym",                                   "IT"),
    ("dostępności cyfrowej",                                "IT"),
    ("radiofonii i telewizji",                              "IT"),

    # ══════════════════════════════════════════════════
    # 🏢 SAMORZĄD I STRUKTURA PAŃSTWA
    # ══════════════════════════════════════════════════
    ("samorządzie gminnym",                                 "SAMORZAD"),
    ("samorządzie powiatowym",                              "SAMORZAD"),
    ("samorządzie województwa",                             "SAMORZAD"),
    ("pracownikach samorządowych",                          "SAMORZAD"),
    ("służbie cywilnej",                                    "SAMORZAD"),
    ("ustroju sądów powszechnych",                          "SAMORZAD"),
    ("Trybunale Konstytucyjnym",                            "SAMORZAD"),
    ("Sądzie Najwyższym",                                   "SAMORZAD"),
    ("Naczelnym Sądzie Administracyjnym",                   "SAMORZAD"),
    ("prokuraturze",                                        "SAMORZAD"),
    ("Policji",                                             "SAMORZAD"),
    ("Straży Granicznej",                                   "SAMORZAD"),
    ("Agencji Bezpieczeństwa Wewnętrznego",                 "SAMORZAD"),
    ("Rzeczniku Praw Obywatelskich",                        "SAMORZAD"),
    ("Najwyższej Izbie Kontroli",                           "SAMORZAD"),
    ("dostępie do informacji publicznej",                   "SAMORZAD"),
    ("petycjach",                                           "SAMORZAD"),
    ("skargach i wnioskach",                                "SAMORZAD"),

    # ══════════════════════════════════════════════════
    # ⚖️ PRAWO CYWILNE I GOSPODARCZE
    # ══════════════════════════════════════════════════
    ("prawo przedsiębiorców",                               "GOSPODARCZE"),
    ("Krajowym Rejestrze Sądowym",                          "GOSPODARCZE"),
    ("prawo upadłościowe",                                  "GOSPODARCZE"),
    ("prawo restrukturyzacyjne",                            "GOSPODARCZE"),
    ("zwalczaniu nieuczciwej konkurencji",                  "GOSPODARCZE"),
    ("prawach konsumenta",                                  "GOSPODARCZE"),
    ("ochronie konkurencji i konsumentów",                  "GOSPODARCZE"),
    ("zamówieniach publicznych",                            "GOSPODARCZE"),
    ("koncesji na roboty budowlane lub usługi",             "GOSPODARCZE"),
    ("spółdzielniach",                                      "GOSPODARCZE"),
    ("fundacjach",                                          "GOSPODARCZE"),
    ("stowarzyszeniach",                                    "GOSPODARCZE"),
    ("notariacie",                                          "GOSPODARCZE"),
    ("adwokaturze",                                         "GOSPODARCZE"),
    ("radcach prawnych",                                    "GOSPODARCZE"),
    ("komornikach sądowych",                                "GOSPODARCZE"),
    ("postępowaniu egzekucyjnym w administracji",           "GOSPODARCZE"),

    # ══════════════════════════════════════════════════
    # 👷 PRAWO PRACY I UBEZPIECZENIA SPOŁECZNE
    # ══════════════════════════════════════════════════
    ("systemie ubezpieczeń społecznych",                    "PRACA"),
    ("emeryturach i rentach z Funduszu Ubezpieczeń",        "PRACA"),
    ("ubezpieczeniu społecznym z tytułu wypadków",          "PRACA"),
    ("promocji zatrudnienia i instytucjach rynku pracy",    "PRACA"),
    ("związkach zawodowych",                                "PRACA"),
    ("minimalnym wynagrodzeniu za pracę",                   "PRACA"),
    ("zakładowym funduszu świadczeń socjalnych",            "PRACA"),
    ("czasie pracy kierowców",                              "PRACA"),
    ("Państwowej Inspekcji Pracy",                          "PRACA"),
    ("zbiorowych stosunkach pracy",                         "PRACA"),

    # ══════════════════════════════════════════════════
    # 🏗️ NIERUCHOMOŚCI I BUDOWNICTWO
    # ══════════════════════════════════════════════════
    ("prawo budowlane",                                     "BUDOWNICTWO"),
    ("planowaniu i zagospodarowaniu przestrzennym",         "BUDOWNICTWO"),
    ("gospodarce nieruchomościami",                         "BUDOWNICTWO"),
    ("ochronie praw lokatorów",                             "BUDOWNICTWO"),
    ("własności lokali",                                    "BUDOWNICTWO"),
    ("księgach wieczystych i hipotece",                     "BUDOWNICTWO"),
    ("geodezji i kartografii",                              "BUDOWNICTWO"),
    ("prawo geodezyjne",                                    "BUDOWNICTWO"),
    ("spółdzielniach mieszkaniowych",                       "BUDOWNICTWO"),

    # ══════════════════════════════════════════════════
    # 🌿 ŚRODOWISKO
    # ══════════════════════════════════════════════════
    ("prawo ochrony środowiska",                            "SRODOWISKO"),
    ("odpadach",                                            "SRODOWISKO"),
    ("prawo wodne",                                         "SRODOWISKO"),
    ("ochronie przyrody",                                   "SRODOWISKO"),
    ("prawo geologiczne i górnicze",                        "SRODOWISKO"),
    ("odnawialnych źródłach energii",                       "SRODOWISKO"),
    ("prawo energetyczne",                                  "SRODOWISKO"),
    ("efektywności energetycznej",                          "SRODOWISKO"),

    # ══════════════════════════════════════════════════
    # 🏥 PRAWO MEDYCZNE
    # ══════════════════════════════════════════════════
    ("działalności leczniczej",                             "MEDYCZNE"),
    ("prawach pacjenta i Rzeczniku Praw Pacjenta",          "MEDYCZNE"),
    ("zawodach lekarza i lekarza dentysty",                 "MEDYCZNE"),
    ("świadczeniach opieki zdrowotnej finansowanych",       "MEDYCZNE"),
    ("Państwowym Ratownictwie Medycznym",                   "MEDYCZNE"),
    ("prawo farmaceutyczne",                                "MEDYCZNE"),
    ("zawodzie pielęgniarki i położnej",                    "MEDYCZNE"),
    ("ochronie zdrowia psychicznego",                       "MEDYCZNE"),
    ("leczeniu niepłodności",                               "MEDYCZNE"),

    # ══════════════════════════════════════════════════
    # 🚗 TRANSPORT
    # ══════════════════════════════════════════════════
    ("prawo o ruchu drogowym",                              "TRANSPORT"),
    ("transporcie drogowym",                                "TRANSPORT"),
    ("prawo lotnicze",                                      "TRANSPORT"),
    ("prawo przewozowe",                                    "TRANSPORT"),
    ("transporcie kolejowym",                               "TRANSPORT"),
    ("żegludze śródlądowej",                                "TRANSPORT"),

    # ══════════════════════════════════════════════════
    # 👨‍👩‍👧 PRAWO RODZINNE I SPOŁECZNE
    # ══════════════════════════════════════════════════
    ("wspieraniu rodziny i systemie pieczy zastępczej",     "RODZINNE"),
    ("pomocy społecznej",                                   "RODZINNE"),
    ("wychowaniu w trzeźwości",                             "RODZINNE"),
    ("przeciwdziałaniu przemocy domowej",                   "RODZINNE"),
    ("świadczeniach rodzinnych",                            "RODZINNE"),
    ("pomocy państwa w wychowywaniu dzieci",                "RODZINNE"),

    # ══════════════════════════════════════════════════
    # 📚 EDUKACJA
    # ══════════════════════════════════════════════════
    ("prawo oświatowe",                                     "EDUKACJA"),
    ("szkolnictwie wyższym i nauce",                        "EDUKACJA"),
    ("systemie oświaty",                                    "EDUKACJA"),
    ("Karcie Nauczyciela",                                  "EDUKACJA"),

    # ══════════════════════════════════════════════════
    # 🔒 PRAWO KARNE SZCZEGÓŁOWE
    # ══════════════════════════════════════════════════
    ("przeciwdziałaniu praniu pieniędzy",                   "KARNE"),
    ("odpowiedzialności podmiotów zbiorowych",              "KARNE"),
    ("środkach przymusu bezpośredniego",                    "KARNE"),
    ("postępowaniu w sprawach nieletnich",                  "KARNE"),
    ("ochronie informacji niejawnych",                      "KARNE"),
    ("przeciwdziałaniu narkomanii",                         "KARNE"),

    # ══════════════════════════════════════════════════
    # 🌍 PRAWO KONSTYTUCYJNE
    # ══════════════════════════════════════════════════
    ("Konstytucja Rzeczypospolitej Polskiej",               "KONSTYTUCJA"),
    ("wyborach do Sejmu Rzeczypospolitej Polskiej",         "KONSTYTUCJA"),
    ("wyborach do Senatu Rzeczypospolitej Polskiej",        "KONSTYTUCJA"),
    ("wyborze Prezydenta Rzeczypospolitej Polskiej",        "KONSTYTUCJA"),
    ("bezpośrednim wyborze wójta",                          "KONSTYTUCJA"),

]

# ─────────────────────────────────────────────────────────
# API HELPERS
# ─────────────────────────────────────────────────────────

def api_search(phrase: str) -> list[dict]:
    """Szukaj aktu przez API po tytule."""
    url = "https://api.sejm.gov.pl/eli/acts/search"
    params = {
        "title": phrase,
        "publisher": "DU",
        "status": "obowiązujący",
        "sort": "year",
        "sortDir": "DESC",
        "pageSize": 5,
    }
    for attempt in range(MAX_RETRIES):
        try:
            time.sleep(REQUEST_DELAY)
            r = SESSION.get(url, params=params, timeout=20)
            if r.status_code == 200:
                data = r.json()
                return data.get("items", [])
            elif r.status_code == 404:
                return []
            elif r.status_code == 429:
                time.sleep(60)
        except Exception as e:
            log.error(f"api_search błąd: {e}")
            time.sleep(5)
    return []


def api_get_act(publisher: str, year: int, pos: int) -> dict | None:
    """Pobierz pełne metadane aktu."""
    url = f"https://api.sejm.gov.pl/eli/acts/{publisher}/{year}/{pos}"
    for attempt in range(MAX_RETRIES):
        try:
            time.sleep(REQUEST_DELAY)
            r = SESSION.get(url, timeout=20)
            if r.status_code == 200:
                return r.json()
            if r.status_code == 404:
                return None
        except Exception as e:
            log.error(f"api_get błąd: {e}")
            time.sleep(5)
    return None


def head_ok(url: str) -> bool:
    try:
        time.sleep(0.15)
        r = SESSION.head(url, timeout=10, allow_redirects=True)
        return r.status_code == 200
    except Exception:
        return False


def fetch_bytes(url: str) -> bytes | None:
    for attempt in range(MAX_RETRIES):
        try:
            time.sleep(REQUEST_DELAY)
            r = SESSION.get(url, timeout=120)
            if r.status_code == 200:
                return r.content
            if r.status_code == 404:
                return None
        except Exception as e:
            log.error(f"fetch_bytes błąd: {e}")
            time.sleep(5 * (attempt + 1))
    return None

# ─────────────────────────────────────────────────────────
# WYSZUKIWANIE NAJNOWSZEGO TEKSTU JEDNOLITEGO
# ─────────────────────────────────────────────────────────

def find_latest_unified_text(phrase: str) -> dict | None:
    """
    Znajdź najnowszy obowiązujący akt pasujący do frazy.
    Priorytet: obwieszczenie (tekst jednolity) > ustawa z najnowszym rokiem.
    """
    results = api_search(phrase)
    if not results:
        log.warning(f"  Brak wyników API dla: '{phrase}'")
        return None

    # Preferuj obwieszczenia (= teksty jednolite) od najnowszych
    obwieszczenia = [a for a in results if "obwieszczenie" in a.get("type", "").lower()]
    ustawy        = [a for a in results if "ustawa" in a.get("type", "").lower()]

    candidates = obwieszczenia if obwieszczenia else ustawy
    if not candidates:
        candidates = results

    # Weź najnowszy
    candidates.sort(key=lambda a: a.get("year", 0), reverse=True)
    best = candidates[0]

    log.info(f"  Znaleziono: {best.get('displayAddress')} | {best.get('title','')[:70]}")
    return best


def find_doc_url(act: dict) -> tuple[str | None, str]:
    """Znajdź URL dokumentu (HTML > PDF) dla danego aktu."""
    publisher = act.get("publisher", "DU")
    year      = act.get("year")
    pos       = act.get("pos")

    variants = ["tj", "uj", "ogl"]

    if PREFER_HTML:
        for v in variants:
            url = f"https://eli.gov.pl/eli/{publisher}/{year}/{pos}/{v}/pol/html"
            if head_ok(url):
                return url, "html"

    for v in variants:
        url = f"https://eli.gov.pl/eli/{publisher}/{year}/{pos}/{v}/pol/pdf"
        if head_ok(url):
            return url, "pdf"

    return None, "none"

# ─────────────────────────────────────────────────────────
# POBIERANIE I ZAPIS
# ─────────────────────────────────────────────────────────

def safe_filename(act: dict, category: str) -> str:
    publisher = act.get("publisher", "DU")
    year      = act.get("year", 0)
    pos       = act.get("pos", 0)
    title     = act.get("title", "")
    short     = re.sub(r"[^\w\s-]", "", title)[:55].strip().replace(" ", "_")
    return f"{category}_{publisher}_{year}_{pos:05d}_{short}"


def already_downloaded(base_name: str) -> Path | None:
    for ext in [".html", ".pdf"]:
        p = OUTPUT_DIR / "docs" / (base_name + ext)
        if p.exists() and p.stat().st_size > 500:
            return p
    return None


def process_act(phrase: str, category: str) -> dict:
    log.info(f"\n🔍 [{category}] Szukam: '{phrase}'")

    act = find_latest_unified_text(phrase)
    if not act:
        return {"phrase": phrase, "category": category, "status": "not_found"}

    base_name = safe_filename(act, category)
    existing  = already_downloaded(base_name)
    if existing:
        log.info(f"  ⏭️  Już istnieje: {existing.name}")
        return {**act, "phrase": phrase, "category": category,
                "status": "exists", "file": existing.name}

    url, fmt = find_doc_url(act)
    if not url:
        log.warning(f"  ❌ Brak URL dokumentu")
        return {**act, "phrase": phrase, "category": category, "status": "no_url"}

    log.info(f"  📥 Pobieram [{fmt.upper()}]: {url}")
    content = fetch_bytes(url)
    if not content:
        return {**act, "phrase": phrase, "category": category,
                "status": "fetch_error", "url": url}

    ext  = ".html" if fmt == "html" else ".pdf"
    dest = OUTPUT_DIR / "docs" / (base_name + ext)
    dest.write_bytes(content)

    size_kb = len(content) // 1024
    log.info(f"  ✅ Zapisano: {dest.name} ({size_kb} KB)")

    return {
        **act,
        "phrase": phrase,
        "category": category,
        "status": "ok",
        "file": dest.name,
        "format": fmt,
        "size_kb": size_kb,
        "source_url": url,
    }

# ─────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────

def run():
    total = len(ACTS_TO_DOWNLOAD)
    print(f"\n{'='*60}")
    print(f"LexMind RAG — Targeted Acts Downloader")
    print(f"Aktów do pobrania: {total}")
    print(f"Katalog wyjściowy: {OUTPUT_DIR.absolute()}")
    print(f"{'='*60}\n")

    manifest   = []
    ok = skip = fail = 0

    manifest_path = OUTPUT_DIR / "manifest.jsonl"
    failed_path   = OUTPUT_DIR / "failed.jsonl"

    with open(manifest_path, "a", encoding="utf-8") as mf, \
         open(failed_path,   "a", encoding="utf-8") as ff:

        for i, (phrase, category) in enumerate(ACTS_TO_DOWNLOAD, 1):
            print(f"\n[{i}/{total}]", end=" ")

            result = process_act(phrase, category)
            status = result["status"]

            if status in ("ok", "exists"):
                mf.write(json.dumps(result, ensure_ascii=False) + "\n")
                if status == "ok":
                    ok += 1
                else:
                    skip += 1
            else:
                ff.write(json.dumps(result, ensure_ascii=False) + "\n")
                fail += 1

    print(f"\n{'='*60}")
    print(f"✅ ZAKOŃCZONO")
    print(f"   Pobrano:       {ok}")
    print(f"   Już istniało:  {skip}")
    print(f"   Błędy/brak:    {fail}  → {failed_path}")
    print(f"   Dokumenty:     {(OUTPUT_DIR / 'docs').absolute()}")
    print(f"   Manifest:      {manifest_path}")
    print(f"{'='*60}")
    print(f"\nNastępny krok:")
    print(f"  HTML → gotowe do chunking (python isap_rag_chunker.py)")
    print(f"  PDF  → ekstrakcja tekstu (python isap_pdf_to_text.py)")


if __name__ == "__main__":
    run()

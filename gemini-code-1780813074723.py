import os
import time
import requests
from bs4 import BeautifulSoup

AKTY_PRAWNE = {
    "Kodeks_cywilny": "WDU19640160093",
    "Kodeks_karny": "WDU19970880553",
    "Kodeks_pracy": "WDU19740240141",
    "Ustawa_o_Policji": "WDU19900300179",
    "Ustawa_o_CBA": "WDU20061040708",
    "Ustawa_o_ABW_i_AW": "WDU20020740676",
    "Prawo_o_ruchu_drogowym": "WDU19970980602"
}

NAGLOWKI = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1"
}

def pobierz_tekst_ujednolicony(nazwa, wdu_id, sesja, folder_docelowy="akty_prawne_isap"):
    if not os.path.exists(folder_docelowy):
        os.makedirs(folder_docelowy)

    url_szczegoly = f"https://isap.sejm.gov.pl/isap.nsf/DocDetails.xsp?id={wdu_id}"
    print(f"🔍 Szukam: {nazwa} (ID: {wdu_id})...")
    
    try:
        response = sesja.get(url_szczegoly, timeout=15)
        response.raise_for_status()
    except requests.RequestException as e:
        print(f"❌ Błąd połączenia dla {nazwa}: {e}")
        return

    soup = BeautifulSoup(response.text, 'html.parser')
    
    # Debug: Sprawdzamy, czy serwer nie wyrzucił nas na stronę z Captchą (np. Cloudflare)
    tytul_strony = soup.title.string.strip() if soup.title and soup.title.string else ""
    if tytul_strony and "System Aktów Prawnych" not in tytul_strony:
        print(f"⚠️ UWAGA: Serwer zwrócił inną stronę (możliwa blokada). Tytuł: '{tytul_strony}'")

    link_pdf = None
    
    # Bardzo elastyczne wyszukiwanie linku do PDF
    for a in soup.find_all('a', href=True):
        href = a['href']
        href_lower = href.lower()
        tekst_linku = a.get_text(strip=True).lower()
        
        # Sprawdzamy czy to link pobierania z flagą "U" lub z opisem "ujednolicony"
        if "download.xsp" in href_lower and ("/u/" in href_lower or "ujednolicony" in tekst_linku):
            # Konstrukcja prawidłowego linku z zachowaniem oryginalnej wielkości liter
            if href.startswith('/'):
                link_pdf = "https://isap.sejm.gov.pl" + href
            elif href.startswith('http'):
                link_pdf = href
            else:
                link_pdf = "https://isap.sejm.gov.pl/isap.nsf/" + href
            break

    if not link_pdf:
        print(f"⚠️ OSTRZEŻENIE: Nie znaleziono tekstu ujednoliconego dla {nazwa}.")
        return

    try:
        print(f"   ⬇️ Pobieranie pliku PDF...")
        pdf_response = sesja.get(link_pdf, timeout=20)
        pdf_response.raise_for_status()
        
        # Weryfikacja czy pobrany plik to na pewno PDF (a nie błąd w formacie HTML)
        content_type = pdf_response.headers.get('Content-Type', '').lower()
        if 'application/pdf' not in content_type and 'octet-stream' not in content_type:
            print(f"❌ Odrzucono: Pobrany plik nie wygląda jak PDF (Typ: {content_type}).")
            return

        sciezka_pliku = os.path.join(folder_docelowy, f"{nazwa}.pdf")
        with open(sciezka_pliku, 'wb') as f:
            f.write(pdf_response.content)
        print(f"✅ SUKCES: Zapisano -> {sciezka_pliku}")
        
    except requests.RequestException as e:
        print(f"❌ Błąd podczas pobierania pliku PDF dla {nazwa}: {e}")

if __name__ == "__main__":
    print("🚀 Rozpoczynam automatyczne pobieranie ustaw z bazy ISAP...\n")
    print("-" * 50)
    
    # Inicjujemy trwałą sesję dla wszystkich zapytań (zapamiętuje cookies)
    sesja = requests.Session()
    sesja.headers.update(NAGLOWKI)
    
    # Symulujemy pierwsze wejście na stronę główną, aby złapać ciasteczka inicjalne
    try:
        sesja.get("https://isap.sejm.gov.pl/", timeout=10)
    except:
        pass # Ignorujemy błędy na stronie głównej
    
    for nazwa, wdu in AKTY_PRAWNE.items():
        pobierz_tekst_ujednolicony(nazwa, wdu, sesja)
        time.sleep(3) # Czekamy 3 sekundy, żeby nie obciążać serwera
        
    print("-" * 50)
    print("\n🎉 Zakończono! Wszystkie pliki znajdziesz w folderze 'akty_prawne_isap'.")
import os
import subprocess
import sys
import shutil

def install_and_import(package, import_name=None):
    if import_name is None:
        import_name = package
    try:
        __import__(import_name)
    except ImportError:
        print(f"Instalowanie pakietu {package}...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", package])

install_and_import('markdown')
import markdown

katalog_roboczy = r"E:\moj prawnik\Gotowe_Dokumenty_PDF"

pliki_md = [
    f for f in os.listdir(katalog_roboczy) if f.endswith('.md')
]

css_style = """
<style>
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 14px; color: #000; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { color: #111; font-size: 22px; text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
    h2 { color: #222; font-size: 18px; margin-top: 25px; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
    h3 { color: #333; font-size: 16px; margin-top: 20px; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 15px; }
    th, td { border: 1px solid #000; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; font-weight: bold; }
    ul, ol { margin-left: 20px; margin-bottom: 15px; }
    li { margin-bottom: 5px; }
    blockquote { font-style: italic; color: #444; margin-left: 20px; border-left: 3px solid #ccc; padding-left: 10px; }
    strong { color: #000; }
</style>
"""

# Szukamy Edge lub Chrome do konwersji
browser_paths = [
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
]

browser_exe = None
for path in browser_paths:
    if os.path.exists(path):
        browser_exe = path
        break

print("Rozpoczynam niezawodną konwersję dokumentów do PDF (przez silnik przeglądarki)...\n")

for plik in pliki_md:
    sciezka_md = os.path.join(katalog_roboczy, plik)
    nazwa_pdf = plik.replace('.md', '.pdf')
    nazwa_html = plik.replace('.md', '.html')
    sciezka_pdf = os.path.join(katalog_roboczy, nazwa_pdf)
    sciezka_html = os.path.join(katalog_roboczy, nazwa_html)
    
    if os.path.exists(sciezka_md):
        print(f"Przetwarzanie: {plik} -> {nazwa_pdf}...")
        
        with open(sciezka_md, 'r', encoding='utf-8') as f:
            tekst_md = f.read()
            
        html_content = markdown.markdown(tekst_md, extensions=['tables'])
        full_html = f"<!DOCTYPE html><html><head><meta charset='utf-8'>{css_style}</head><body>{html_content}</body></html>"
        
        # Zapisz tymczasowy HTML
        with open(sciezka_html, 'w', encoding='utf-8') as f:
            f.write(full_html)
            
        if browser_exe:
            try:
                # Używamy przeglądarki systemowej do idealnego wygenerowania PDF z polskimi znakami
                cmd = [
                    browser_exe,
                    "--headless",
                    "--disable-gpu",
                    f"--print-to-pdf={sciezka_pdf}",
                    "--no-pdf-header-footer",
                    sciezka_html
                ]
                subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                print(f"  [SUKCES] Zapisano: {sciezka_pdf}")
                
                # Usuń plik tymczasowy HTML
                os.remove(sciezka_html)
            except Exception as e:
                print(f"  [BŁĄD PDF] Nie udało się wygenerować PDF: {e}")
                print(f"  Zostawiłem za to plik {sciezka_html} - możesz go otworzyć dwuklikiem i wydrukować do PDF.")
        else:
            print(f"  [BRAK PRZEGLĄDARKI] Wygenerowano plik {sciezka_html}. Otwórz go w przeglądarce i naciśnij Ctrl+P, aby zapisać jako PDF.")
    else:
        print(f"[BŁĄD] Nie znaleziono pliku źródłowego: {sciezka_md}")

print("\nZakończono konwersję!")

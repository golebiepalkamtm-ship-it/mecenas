from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
import io
import base64
import asyncio
import httpx

def create_test_pdf():
    """Tworzy prosty PDF z treścią prawną."""
    buffer = io.BytesIO()
    p = canvas.Canvas(buffer, pagesize=letter)
    
    # Dodaj treść
    p.setFont("Helvetica", 12)
    text = """
UMOWA KUPNA-SPRZEDAŻY
    
zawarta w dniu 15 stycznia 2025 roku w Warszawie 
pomiędzy:

1) Sprzedającym: Jan Kowalski, zamieszkały w Warszawie, ul. Krakowska 12
2) Kupującym: Anna Nowak, zamieszkała w Krakowie, ul. Floriańska 8

§ 1
Przedmiotem umowy jest sprzedaż nieruchomości położonej w Warszawie 
przy ul. Wolskiej 45, oznaczonej numerem KW 1234/567/89.

§ 2
Cena sprzedaży wynosi 500.000 PLN (pięćset tysięcy złotych) 
i zostanie zapłacona przelewem na konto sprzedającego.

§ 3
Nieruchomość jest obciążona służebnością przechodu na rzecz sąsiada.

§ 4
Strony oświadczają, że zapoznały się ze stanem prawnym nieruchomości 
i nie mają zastrzeżeń.

Art. 535 Kodeksu Cywilnego: Umowa zobowiązująca do przeniesienia 
własności rzeczy powinna być zawarta na piśmie.
"""
    
    # Podziel tekst na linie i dodaj do PDF
    lines = text.split('\n')
    y_position = 750
    for line in lines:
        if line.strip():
            p.drawString(50, y_position, line.strip())
            y_position -= 15
            if y_position < 50:
                p.showPage()
                y_position = 750
    
    p.save()
    buffer.seek(0)
    return buffer.getvalue()

async def test_pdf_upload():
    print("Test przesyłania PDF...")
    
    # Stwórz PDF
    pdf_content = create_test_pdf()
    pdf_b64 = base64.b64encode(pdf_content).decode()
    
    async with httpx.AsyncClient(timeout=30) as client:
        payload = {
            "filename": "umowa_kupna_sprzedazy.pdf",
            "content_type": "application/pdf",
            "content": pdf_b64
        }
        
        try:
            response = await client.post(
                "http://localhost:8003/upload-base64-document",
                data=payload,
                timeout=30
            )
            
            print(f"Status: {response.status_code}")
            if response.status_code == 200:
                result = response.json()
                print(f"Sukces: {result['success']}")
                print(f"Plik: {result['filename']}")
                print(f"Długość tekstu: {result['text_length']}")
                print(f"Błąd: {result.get('error')}")
                print(f"Ekstraktowany tekst: {result['extracted_text'][:500]}...")
            else:
                print(f"Błąd: {response.text[:500]}")
                
        except Exception as e:
            print(f"Exception: {e}")

if __name__ == "__main__":
    # Sprawdź czy reportlab jest dostępny
    try:
        from reportlab.pdfgen import canvas
        print("Reportlab dostępny - tworzę PDF...")
        asyncio.run(test_pdf_upload())
    except ImportError:
        print("Reportlab nie jest zainstalowany. Instaluję...")
        import subprocess
        subprocess.run(["pip", "install", "reportlab"])
        print("Zainstalowano reportlab. Uruchom ponownie skrypt.")

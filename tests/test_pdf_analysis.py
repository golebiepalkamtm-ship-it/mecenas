import asyncio
import httpx

async def test_pdf_analysis():
    print("Test analizy PDF z RAG...")
    
    async with httpx.AsyncClient(timeout=60) as client:
        payload = {
            "document_text": """UMOWA KUPNA-SPRZEDAŻY
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
Nieruchomość jest obciążona służebnością przechodu.

Art. 535 Kodeksu Cywilnego: Umowa zobowiązująca do przeniesienia 
własności rzeczy powinna być zawarta na piśmie.""",
            "question": "Czy umowa spełnia wymogi formalne kodeksu cywilnego?",
            "model": "anthropic/claude-3.5-sonnet",
            "use_rag": True
        }
        
        try:
            response = await client.post(
                "http://localhost:8003/analyze-document",
                json=payload,
                timeout=60
            )
            
            print(f"Status: {response.status_code}")
            if response.status_code == 200:
                result = response.json()
                print(f"Sukces: {result['success']}")
                print(f"RAG użyty: {result['rag_used']}")
                print(f"Źródła: {result['sources']}")
                print(f"Odpowiedź: {result['answer'][:800]}...")
            else:
                print(f"Błąd: {response.text[:500]}")
                
        except Exception as e:
            print(f"Exception: {e}")

if __name__ == "__main__":
    asyncio.run(test_pdf_analysis())

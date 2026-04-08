import os
from dotenv import load_dotenv # type: ignore
import google.generativeai as genai # type: ignore

load_dotenv()

api_key = os.getenv("GOOGLE_API_KEY")
if api_key:
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-1.5-flash')
    response = model.generate_content("Cześć, czy działasz?")
    print(response.text)
else:
    print("Brak klucza API w pliku .env")

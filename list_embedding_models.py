import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY") or "AIzaSyBDoyzZGlAZUjOgSpT5rACq35CAVI5H3FM"
genai.configure(api_key=api_key)

print("Available embedding models:")
for m in genai.list_models():
    if 'embedContent' in m.supported_generation_methods:
        print(f"{m.name}: {m.supported_generation_methods}")

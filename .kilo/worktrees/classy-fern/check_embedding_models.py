import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY") or "AIzaSyBDoyzZGlAZUjOgSpT5rACq35CAVI5H3FM"
genai.configure(api_key=api_key)

print("Available models:")
for m in genai.list_models():
    print(f"{m.name}: {m.supported_generation_methods}")

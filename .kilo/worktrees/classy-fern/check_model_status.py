import requests
import os
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY") or "AIzaSyBDoyzZGlAZUjOgSpT5rACq35CAVI5H3FM"

url = f"https://generativelanguage.googleapis.com/v1/models/text-embedding-004?key={api_key}"
res = requests.get(url)
print(f"v1 response: {res.status_code}")
if res.status_code == 200:
    print(res.json())
else:
    print(res.text)

url_beta = f"https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004?key={api_key}"
res_beta = requests.get(url_beta)
print(f"v1beta response: {res_beta.status_code}")
if res_beta.status_code == 200:
    print(res_beta.json())
else:
    print(res_beta.text)

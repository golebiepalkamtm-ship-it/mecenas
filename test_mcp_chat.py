import requests
import json

url = "http://localhost:8001/chat"
data = {
    "message": "Ile to jest (45 * 12) + 234 i jaka jest pogoda w Warszawie?",
    "history": [],
    "attachments": []
}

try:
    response = requests.post(url, json=data)
    print(f"Status: {response.status_code}")
    print(json.dumps(response.json(), indent=2, ensure_ascii=False))
except Exception as e:
    print(f"Error: {e}")

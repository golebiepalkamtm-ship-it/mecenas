import requests
import json

# Test the fixes with a simple request
print("Testing API fixes...")

test_data = {
    "message": "Jakie jest Art. 61 kodeksu postepowania administracyjnego?",
    "history": [],
    "model": "qwen/qwen3.6-plus:free"
}

try:
    response = requests.post("http://127.0.0.1:8003/chat-consensus", json=test_data, timeout=60)
    if response.status_code == 200:
        result = response.json()
        print("SUCCESS: API responded correctly")
        print(f"Response preview: {str(result)[:200]}...")
    else:
        print(f"ERROR: HTTP {response.status_code}")
        print(f"Response: {response.text[:500]}")
except Exception as e:
    print(f"ERROR: {e}")

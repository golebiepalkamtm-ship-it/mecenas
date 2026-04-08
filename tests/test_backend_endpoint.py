import httpx

def test_backend_models():
    try:
        response = httpx.get("http://127.0.0.1:8003/models/all", timeout=20)
        print(f"Status CODE: {response.status_code}")
        if response.status_code == 200:
            models = response.json()
            print(f"Server returned {len(models)} models.")
            for m in models[:5]:
                print(f"- {m['id']}: {m['name']}")
        else:
            print(f"Error Body: {response.text}")
    except Exception as e:
        print(f"Failed to connect to backend: {e}")

if __name__ == "__main__":
    test_backend_models()

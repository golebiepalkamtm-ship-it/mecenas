import sys
import os

# Dodaj ścieżkę do moa
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

try:
    from moa.config import DEFAULT_MATCH_THRESHOLD, EMBEDDING_MODEL, EMBEDDING_DIMENSIONS
    print(f"Config loaded successfully:")
    print(f"  DEFAULT_MATCH_THRESHOLD: {DEFAULT_MATCH_THRESHOLD}")
    print(f"  EMBEDDING_MODEL: {EMBEDDING_MODEL}")
    print(f"  EMBEDDING_DIMENSIONS: {EMBEDDING_DIMENSIONS}")
    
    # Sprawdź czy config jest importowany poprawnie
    print(f"  Config file path: {os.path.abspath('moa/config.py')}")
    print(f"  Config file exists: {os.path.exists('moa/config.py')}")
    
except Exception as e:
    print(f"Error loading config: {e}")

# Sprawdź czy backend importuje moa
try:
    import api
    print(f"Backend module loaded: {api}")
    print(f"Backend file path: {os.path.abspath('api.py')}")
except Exception as e:
    print(f"Error loading backend: {e}")

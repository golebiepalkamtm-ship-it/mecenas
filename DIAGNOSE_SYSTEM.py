import os
import sys
import psutil
import socket
import requests
import json
from pathlib import Path

def check_env():
    print("--- Environment Check ---")
    print(f"Python version: {sys.version}")
    print(f"Working Directory: {os.getcwd()}")
    venv = Path(".venv")
    if venv.exists():
        print("[OK] Virtual environment found.")
    else:
        print("[ERROR] Virtual environment NOT found.")

def check_memory():
    print("\n--- System Memory Check ---")
    mem = psutil.virtual_memory()
    swap = psutil.swap_memory()
    print(f"RAM: {mem.percent}% used ({mem.available // (1024*1024)}MB free)")
    print(f"Swap: {swap.percent}% used ({swap.free // (1024*1024)}MB free)")
    
    if swap.free < 500 * 1024 * 1024:
        print("[WARNING] Extremely low swap space! This often causes connection refused errors (0xc0000142).")

def check_ports():
    print("\n--- Port Check ---")
    for port in [8003, 3000]:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            result = s.connect_ex(('127.0.0.1', port))
            if result == 0:
                print(f"[OK] Port {port} is OPEN and LISTENING.")
            else:
                print(f"[FAILED] Port {port} is CLOSED.")

def check_backend_health():
    print("\n--- Backend Health Check ---")
    try:
        r = requests.get("http://127.0.0.1:8003/health", timeout=2)
        print(f"[OK] Backend /health responded: {r.status_code}")
        print(f"Response: {r.text}")
    except Exception as e:
        print(f"[FAILED] Backend /health unreachable: {e}")

def check_config():
    print("\n--- Config Files Check ---")
    files = [".env", "api.py", "database.py", "moa/config.py"]
    for f in files:
        if os.path.exists(f):
            print(f"[OK] {f} exists.")
        else:
            print(f"[ERROR] {f} is MISSING.")

if __name__ == "__main__":
    print("========================================")
    print("       LEXMIND SYSTEM DIAGNOSTICS")
    print("========================================")
    check_env()
    check_config()
    check_memory()
    check_ports()
    check_backend_health()
    print("\n========================================")

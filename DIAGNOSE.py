import os
import sys
import psutil
from datetime import datetime
import json
import urllib.request
import asyncio
import traceback

print("="*50)
print("LEXMIND SYSTEM DIAGNOSTICS")
print(f"Time: {datetime.now()}")
print("="*50)

print("\n--- 1. SYSTEM RESOURCES ---")
print(f"CPU Usage: {psutil.cpu_percent()}%")
print(f"Memory: {psutil.virtual_memory().percent}% used")

print("\n--- 2. ENVIRONMENT VARIABLES ---")
required_vars = ['SUPABASE_URL', 'SUPABASE_KEY', 'OPENROUTER_API_KEY', 'GOOGLE_API_KEY']
for var in required_vars:
    status = "SET" if os.getenv(var) else "MISSING"
    print(f"{var}: {status}")

print("\n--- 3. PORT STATUS ---")
ports = [3000, 8003]
for port in ports:
    try:
        conn = [c for c in psutil.net_connections() if c.laddr.port == port and c.status == 'LISTEN']
        if conn:
            pid = conn[0].pid
            proc = psutil.Process(pid)
            print(f"Port {port}: LISTENING (PID {pid}, {proc.name()})")
        else:
            print(f"Port {port}: NOT LISTENING")
    except psutil.AccessDenied:
        print(f"Port {port}: Access Denied when checking")

print("\n--- 4. API HEALTH (BACKEND) ---")
try:
    req = urllib.request.Request("http://127.0.0.1:8003/health")
    with urllib.request.urlopen(req, timeout=5) as response:
        print(f"Backend Server Status: {response.getcode()}")
        body = json.loads(response.read())
        print(f"Backend Response: {json.dumps(body, indent=2)}")
except Exception as e:
    print(f"Backend Health Check Failed: {e}")

print("\n--- 5. RECENT LOGS ANALYSIS ---")
log_dir = os.path.join(os.path.dirname(__file__), 'data', 'logs')
if os.path.exists(log_dir):
    try:
        log_files = [f for f in os.listdir(log_dir) if f.endswith('.log')]
        if not log_files:
            print("No log files found.")
        else:
            latest_log = max([os.path.join(log_dir, f) for f in log_files], key=os.path.getmtime)
            print(f"Reading from {latest_log}:")
            with open(latest_log, 'r', encoding='utf-8') as f:
                lines = f.readlines()
                error_lines = [l for l in lines[-100:] if 'ERROR' in l.upper() or 'EXCEPTION' in l.upper() or 'WARNING' in l.upper()]
                if not error_lines:
                    print("No recent errors in the last 100 log lines.")
                else:
                    for l in error_lines[-10:]:
                        print(l.strip())
    except Exception as e:
        print(f"Could not read logs: {e}")
else:
    print(f"Log directory not found: {log_dir}")

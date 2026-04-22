import subprocess
import threading
import sys
import os
import time

def monitor_stream(stream, prefix, log_file):
    with open(log_file, "a", encoding="utf-8") as f:
        for line in iter(stream.readline, ''):
            if not line:
                break
            output = f"[{prefix}] {line.strip()}"
            print(output)
            f.write(output + "\n")
            f.flush()

def start_service(command, cwd, prefix, log_file):
    process = subprocess.Popen(
        command,
        cwd=cwd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        shell=True,
        bufsize=1
    )
    
    t = threading.Thread(target=monitor_stream, args=(process.stdout, prefix, log_file))
    t.daemon = True
    t.start()
    return process

if __name__ == "__main__":
    log_file = "service_logs.log"
    # Kill any processes on our ports before starting
    print("[INIT] Cleaning ports 8003 and 3000...")
    os.system("taskkill /f /fi \"windowtitle eq LexMind*\" /t >nul 2>&1")
    # Brute force port cleaning via netstat/taskkill
    os.system("for /f \"tokens=5\" %a in ('netstat -aon ^| findstr :8003') do taskkill /f /pid %a >nul 2>&1")
    os.system("for /f \"tokens=5\" %a in ('netstat -aon ^| findstr :3000') do taskkill /f /pid %a >nul 2>&1")

    try:
        if os.path.exists(log_file):
            os.remove(log_file)
    except Exception as e:
        print(f"[WARN] Could not clear log file: {e}")
        
    print(f"Starting LexMind services... Logs will be in {log_file}")
    
    backend_cmd = r".venv\Scripts\uvicorn api:app --host 127.0.0.1 --port 8003"
    frontend_cmd = "npm run dev"
    
    backend = start_service(backend_cmd, os.getcwd(), "BACKEND", log_file)
    frontend = start_service(frontend_cmd, os.path.join(os.getcwd(), "frontend"), "FRONTEND", log_file)
    
    try:
        while True:
            # Check if processes are alive
            if backend.poll() is not None:
                print("[ERROR] Backend died. Restarting or reporting...")
                # Here I would ideally trigger a fix logic
            if frontend.poll() is not None:
                print("[ERROR] Frontend died. Restarting...")
            
            time.sleep(5)
    except KeyboardInterrupt:
        backend.terminate()
        frontend.terminate()

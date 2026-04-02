"""
Asesor AI — Desktop Launcher
Uruchamia Streamlit w tle i otwiera natywne okno desktopowe.
"""

import subprocess
import sys
import time
import socket
import threading
import os
import signal
import webview

# Config
APP_TITLE = "⚖️ Asesor AI — Twój Prawnik"
PORT = 8502
HOST = "127.0.0.1"
URL = f"http://{HOST}:{PORT}"
STREAMLIT_APP = "app.py"

# Paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
VENV_PYTHON = os.path.join(SCRIPT_DIR, ".venv", "Scripts", "python.exe")
VENV_STREAMLIT = os.path.join(SCRIPT_DIR, ".venv", "Scripts", "streamlit.exe")


def is_port_open(host: str, port: int, timeout: float = 1.0) -> bool:
    """Check if Streamlit server is ready."""
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except (ConnectionRefusedError, socket.timeout, OSError):
        return False


def wait_for_server(host: str, port: int, max_wait: int = 60) -> bool:
    """Wait until Streamlit server is responding."""
    for _ in range(max_wait * 2):
        if is_port_open(host, port):
            return True
        time.sleep(0.5)
    return False


def start_streamlit() -> subprocess.Popen:
    """Start Streamlit server in background."""
    # Kill any existing Streamlit on this port
    try:
        subprocess.run(
            ["taskkill", "/F", "/IM", "streamlit.exe"],
            capture_output=True,
            timeout=5,
        )
        time.sleep(1)
    except Exception:
        pass

    cmd = [
        VENV_STREAMLIT,
        "run",
        os.path.join(SCRIPT_DIR, STREAMLIT_APP),
        "--server.port", str(PORT),
        "--server.headless", "true",
        "--server.address", HOST,
        "--browser.gatherUsageStats", "false",
        "--global.developmentMode", "false",
        "--server.fileWatcherType", "auto",  # Enable hot reload for rapid development
    ]

    # Start Streamlit as a background process
    proc = subprocess.Popen(
        cmd,
        cwd=SCRIPT_DIR,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        creationflags=subprocess.CREATE_NO_WINDOW,  # Hide console on Windows
    )
    return proc


def main():
    streamlit_proc = None

    try:
        # Start Streamlit server
        print("Uruchamianie Asesor AI...")
        streamlit_proc = start_streamlit()

        # Wait for server to be ready
        print("Oczekiwanie na serwer...")
        if not wait_for_server(HOST, PORT):
            print("BŁĄD: Serwer nie odpowiada. Sprawdź logi.")
            return

        print(f"Serwer gotowy na {URL}")

        # Create native desktop window
        window = webview.create_window(
            title="Asesor AI — Twój Prawnik",
            url=URL,
            width=1400,
            height=900,
            min_size=(900, 600),
            resizable=True,
            frameless=False,
            easy_drag=False,
            text_select=True,
            background_color="#0a0a12",
        )

        # Start webview (blocks until window is closed)
        webview.start(
            gui="edgechromium",  # Use Edge WebView2 on Windows — best performance
            debug=False,
        )

    finally:
        # Cleanup: kill Streamlit when desktop window closes
        if streamlit_proc:
            try:
                streamlit_proc.terminate()
                streamlit_proc.wait(timeout=5)
            except Exception:
                streamlit_proc.kill()

        # Make sure all streamlit processes are dead
        try:
            subprocess.run(
                ["taskkill", "/F", "/IM", "streamlit.exe"],
                capture_output=True,
                timeout=5,
            )
        except Exception:
            pass

        print("Asesor AI zamknięty.")


if __name__ == "__main__":
    main()

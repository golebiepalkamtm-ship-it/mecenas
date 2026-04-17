@echo off
powershell -Command "Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:8003/documents/index-knowledge-base'"
echo [OK] Indexing triggered.

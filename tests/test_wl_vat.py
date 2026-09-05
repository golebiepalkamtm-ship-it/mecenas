import pytest
import os
from pathlib import Path
from services.mcp_tool_bridge import wl_search_vat, wl_check_vat_account, call_mcp_tool, AUDIT_LOG_FILE

@pytest.mark.asyncio
async def test_wl_search_vat_empty():
    """Weryfikacja błędu przy braku kryteriów wyszukiwania."""
    res = await wl_search_vat()
    assert res.get("status") == "error"
    assert "Należy podać" in res.get("message", "")

@pytest.mark.asyncio
async def test_wl_check_vat_account_empty():
    """Weryfikacja walidacji parametrów NIP i rachunku."""
    res = await wl_check_vat_account(nip="", bank_account="")
    assert res.get("status") == "error"

@pytest.mark.asyncio
async def test_call_mcp_tool_audit_logging():
    """Weryfikacja generowania logu audytowego JSONL (prawo-pl-mcp standard)."""
    # Wywołanie narzędzia kalkulatora / sesji
    res = await call_mcp_tool("list_documents", folder="non_existing_folder_xyz")
    assert res.get("status") in ["ok", "error"]
    
    # Sprawdzenie czy plik audytowy istnieje i zawiera wpis
    assert AUDIT_LOG_FILE.exists()
    with open(AUDIT_LOG_FILE, "r", encoding="utf-8") as f:
        lines = f.readlines()
        assert len(lines) > 0
        last_line = lines[-1]
        assert "list_documents" in last_line

from __future__ import annotations

from typing import Any, AsyncGenerator, Dict


async def run_with_status_stream(coro: Any) -> AsyncGenerator[Dict[str, Any], None]:
    res = await coro
    yield {"type": "result", "value": res}

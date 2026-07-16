import asyncio

from services.retrieval.providers.eli_provider import fetch_eli_once
from services.retrieval.providers.saos_provider import fetch_saos_once


class _FakeResponse:
    def __init__(self, status_code: int, payload):
        self.status_code = status_code
        self._payload = payload

    def json(self):
        return self._payload


class _FakeClient:
    def __init__(self, payload):
        self.payload = payload

    async def get(self, *_args, **_kwargs):
        return _FakeResponse(200, self.payload)


def test_fetch_saos_once_normalizes_item_shape() -> None:
    client = _FakeClient(
        {
            "items": [
                {
                    "id": "judgment-1",
                    "textContent": "<p>Sentencja orzeczenia</p>",
                    "courtCases": [{"caseNumber": "II SA/Wa 123/24"}],
                    "courtName": "WSA w Warszawie",
                    "judgmentDate": "2024-01-10",
                }
            ]
        }
    )

    results = asyncio.run(fetch_saos_once(client, "kara", 3))

    assert results[0]["id"] == "judgment-1"
    assert results[0]["source"] == "SAOS — II SA/Wa 123/24"
    assert "Sentencja orzeczenia" in results[0]["content"]


def test_fetch_eli_once_normalizes_item_shape() -> None:
    client = _FakeClient(
        {
            "items": [
                {
                    "title": "Kodeks postępowania administracyjnego",
                    "displayAddress": "Dz.U. 1960 nr 30 poz. 168",
                    "textHTML": "<div>Treść aktu</div>",
                }
            ]
        }
    )

    results = asyncio.run(fetch_eli_once(client, "kpa", 3))

    assert results[0]["source"] == "ELI — Dz.U. 1960 nr 30 poz. 168"
    assert results[0]["title"] == "Kodeks postępowania administracyjnego"
    assert "Treść aktu" in results[0]["content"]

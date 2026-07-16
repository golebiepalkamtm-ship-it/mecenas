import json

from services.orchestrator_v2.history_formatter import format_chat_history


def test_format_chat_history_handles_structured_frontend_content() -> None:
    history = [
        {"role": "user", "content": [{"type": "text", "text": "Pierwsza wiadomosc"}]},
        {"role": "assistant", "content": "Odpowiedz asystenta"},
    ]

    formatted = format_chat_history(history, max_messages=10, max_chars=1000)

    assert "Użytkownik: Pierwsza wiadomosc" in formatted
    assert "Asystent: Odpowiedz asystenta" in formatted


def test_format_chat_history_reads_json_encoded_text_from_storage() -> None:
    json_payload = json.dumps([{"type": "text", "text": "Tekst z bazy"}])
    history = [{"role": "user", "content": json_payload}]

    formatted = format_chat_history(history, max_messages=10, max_chars=1000)

    assert formatted == "Użytkownik: Tekst z bazy"

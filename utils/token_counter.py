import tiktoken
import logging

logger = logging.getLogger("TokenCounter")

def count_tokens(text: str, model: str = "gpt-4") -> int:
    """Liczy tokeny dla danego tekstu i modelu."""
    try:
        # Mapowanie modeli OpenRouter/Google/Anthropic na encodings OpenAI (uproszczone)
        encoding_name = "cl100k_base"
        if "gpt-3.5" in model:
            encoding_name = "cl100k_base"
        elif "gpt-4" in model:
            encoding_name = "cl100k_base"
        
        encoding = tiktoken.get_encoding(encoding_name)
        return len(encoding.encode(text))
    except Exception as e:
        logger.warning(f"Błąd liczenia tokenów: {e}. Używam estymacji (chars/4).")
        return len(text) // 4

def truncate_to_tokens(text: str, max_tokens: int, model: str = "gpt-4") -> str:
    """Przycina tekst do określonej liczby tokenów."""
    if not text:
        return ""
    
    try:
        encoding = tiktoken.get_encoding("cl100k_base")
        tokens = encoding.encode(text)
        if len(tokens) <= max_tokens:
            return text
        
        return encoding.decode(tokens[:max_tokens])
    except Exception:
        return text[:max_tokens * 4]

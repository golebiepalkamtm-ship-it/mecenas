import logging
import hashlib
import json
import numpy as np
from typing import Optional, Dict, Any
from database import get_db

logger = logging.getLogger(__name__)

def cosine_similarity(v1: np.ndarray, v2: np.ndarray) -> float:
    dot_product = np.dot(v1, v2)
    norm_v1 = np.linalg.norm(v1)
    norm_v2 = np.linalg.norm(v2)
    if norm_v1 == 0.0 or norm_v2 == 0.0:
        return 0.0
    return float(dot_product / (norm_v1 * norm_v2))

def get_query_hash(query_text: str) -> str:
    return hashlib.sha256(query_text.lower().strip().encode("utf-8")).hexdigest()

def get_semantic_cache(query_embedding: list[float], threshold: float = 0.96) -> Optional[Dict[str, Any]]:
    """
    Sprawdza, czy w bazie SQLite istnieje zapytanie o podobieństwie cosinusowym >= threshold.
    Jeśli tak, zwraca sparsowany słownik z odpowiedzią.
    """
    if not query_embedding:
        return None
        
    v_query = np.array(query_embedding, dtype=np.float32)
    
    try:
        with get_db() as conn:
            # Pobieramy wszystkie wpisy cache
            rows = conn.execute("SELECT query_text, embedding, response_json FROM semantic_cache").fetchall()
            
            best_sim = -1.0
            best_row = None
            
            for row in rows:
                q_text, blob, resp_json = row
                v_cached = np.frombuffer(blob, dtype=np.float32)
                
                # Zabezpieczenie przed niezgodnością wymiarów
                if v_cached.shape != v_query.shape:
                    continue
                    
                sim = cosine_similarity(v_query, v_cached)
                if sim > best_sim:
                    best_sim = sim
                    best_row = row
            
            if best_row and best_sim >= threshold:
                q_text, blob, resp_json = best_row
                logger.info(f"[SemanticCache] Trafienie cache (podobieństwo={best_sim:.4f} >= {threshold})")
                return json.loads(resp_json)
                
    except Exception as e:
        logger.error(f"[SemanticCache] Błąd odczytu: {e}")
        
    return None

def set_semantic_cache(query_text: str, query_embedding: list[float], response_data: Dict[str, Any]):
    """
    Zapisuje zapytanie i odpowiadające mu dane (np. plan zapytania lub całą odpowiedź) do cache.
    """
    if not query_text or not query_embedding or not response_data:
        return
        
    q_hash = get_query_hash(query_text)
    blob = np.array(query_embedding, dtype=np.float32).tobytes()
    resp_json = json.dumps(response_data)
    
    try:
        with get_db() as conn:
            with conn:
                conn.execute(
                    """
                    INSERT OR REPLACE INTO semantic_cache (query_text, query_hash, embedding, response_json)
                    VALUES (?, ?, ?, ?)
                    """,
                    (query_text, q_hash, blob, resp_json)
                )
        logger.info(f"[SemanticCache] Zapisano nowy wpis cache dla: '{query_text[:60]}...'")
    except Exception as e:
        logger.error(f"[SemanticCache] Błąd zapisu: {e}")

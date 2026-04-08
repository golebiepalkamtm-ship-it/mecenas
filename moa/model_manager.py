# ===========================================================================
# MOA Model Manager -- Smart model selection with health tracking and fallbacks
# ===========================================================================

import time
import asyncio
from typing import Dict, List, Optional, Set
from dataclasses import dataclass, field
from openai import AsyncOpenAI, APIStatusError

from moa.config import (
    DEFAULT_ANALYST_MODELS,
    OPENROUTER_API_KEY,
    OPENROUTER_BASE_URL,
    LLM_TIMEOUT,
)


@dataclass
class ModelHealth:
    """Tracks health status of individual models"""
    model_id: str
    last_success: Optional[float] = None
    last_failure: Optional[float] = None
    consecutive_failures: int = 0
    is_rate_limited: bool = False
    rate_limit_until: Optional[float] = None
    error_429_count: int = 0
    error_402_count: int = 0
    error_404_count: int = 0
    total_requests: int = 0
    successful_requests: int = 0
    
    @property
    def success_rate(self) -> float:
        if self.total_requests == 0:
            return 0.0
        return self.successful_requests / self.total_requests
    
    @property
    def is_available(self) -> bool:
        """Check if model is currently available for use"""
        now = time.time()
        
        # Check if rate limited
        if self.is_rate_limited and self.rate_limit_until and now < self.rate_limit_until:
            return False
            
        # Check if too many consecutive failures
        if self.consecutive_failures >= 3:
            return False
            
        # Check if recently failed with 402/404 (permanent errors)
        if self.error_402_count > 0 or self.error_404_count > 0:
            return False
            
        return True
    
    @property
    def priority_score(self) -> float:
        """Calculate priority score for model selection (higher = better)"""
        if not self.is_available:
            return -1.0
            
        # Base score on success rate
        score = self.success_rate
        
        # Boost recently successful models
        if self.last_success and (time.time() - self.last_success) < 300:  # 5 minutes
            score += 0.2
            
        # Penalize recently failed models
        if self.last_failure and (time.time() - self.last_failure) < 60:  # 1 minute
            score -= 0.1
            
        # Penalize rate limited models
        if self.error_429_count > 0:
            score -= 0.05 * min(self.error_429_count, 5)
            
        return max(score, 0.0)


class ModelManager:
    """Manages model health tracking and intelligent selection"""
    
    def __init__(self):
        self._health: Dict[str, ModelHealth] = {}
        self._lock = asyncio.Lock()
        self._initialize_health_tracking()
    
    def _initialize_health_tracking(self):
        """Initialize health tracking for known models"""
        all_models = set(DEFAULT_ANALYST_MODELS)
        for model_id in all_models:
            if model_id not in self._health:
                self._health[model_id] = ModelHealth(model_id=model_id)
    
    async def record_success(self, model_id: str):
        """Record successful API call"""
        async with self._lock:
            if model_id not in self._health:
                self._health[model_id] = ModelHealth(model_id=model_id)
                
            health = self._health[model_id]
            health.last_success = time.time()
            health.consecutive_failures = 0
            health.is_rate_limited = False
            health.rate_limit_until = None
            health.total_requests += 1
            health.successful_requests += 1
    
    async def record_failure(self, model_id: str, error: Exception):
        """Record failed API call"""
        async with self._lock:
            if model_id not in self._health:
                self._health[model_id] = ModelHealth(model_id=model_id)
                
            health = self._health[model_id]
            health.last_failure = time.time()
            health.consecutive_failures += 1
            health.total_requests += 1
            
            # Categorize error types
            if isinstance(error, APIStatusError):
                status = error.status_code
                if status == 429:
                    health.error_429_count += 1
                    health.is_rate_limited = True
                    # Rate limit for progressively longer periods
                    backoff_seconds = min(300, 30 * (2 ** min(health.error_429_count - 1, 4)))
                    health.rate_limit_until = time.time() + backoff_seconds
                elif status == 402:
                    health.error_402_count += 1
                elif status == 404:
                    health.error_404_count += 1
    
    def get_available_models(self, model_pool: List[str]) -> List[str]:
        """Get list of available models from pool, sorted by priority"""
        available = []
        for model_id in model_pool:
            if model_id not in self._health:
                self._health[model_id] = ModelHealth(model_id=model_id)
                
            if self._health[model_id].is_available:
                available.append(model_id)
        
        # Sort by priority score (highest first)
        available.sort(key=lambda m: self._health[m].priority_score, reverse=True)
        return available
    
    def get_best_models(self, count: int = 3, model_pool: Optional[List[str]] = None) -> List[str]:
        """Get top N available models"""
        pool = model_pool or DEFAULT_ANALYST_MODELS
        available = self.get_available_models(pool)
        return available[:count]
    
    def get_fallback_models(self, failed_model: str, count: int = 2) -> List[str]:
        """Get fallback models when primary model fails. Uses DEFAULT_ANALYST_MODELS as source."""
        candidates = [m for m in DEFAULT_ANALYST_MODELS if m != failed_model]
        
        # Filter available
        available = [m for m in candidates if 
                    (m not in self._health or self._health[m].is_available)]
        
        return available[:count]
    
    def get_health_summary(self) -> Dict[str, Dict]:
        """Get summary of all model health for debugging"""
        summary = {}
        for model_id, health in self._health.items():
            summary[model_id] = {
                "available": health.is_available,
                "success_rate": health.success_rate,
                "consecutive_failures": health.consecutive_failures,
                "error_429_count": health.error_429_count,
                "error_402_count": health.error_402_count,
                "error_404_count": health.error_404_count,
                "total_requests": health.total_requests,
                "priority_score": health.priority_score,
                "rate_limited_until": health.rate_limit_until,
            }
        return summary


# Global model manager instance
_model_manager = ModelManager()


def get_model_manager() -> ModelManager:
    """Get the global model manager instance"""
    return _model_manager


async def test_model_health(model_id: str) -> bool:
    """Test if a model is healthy by making a minimal API call"""
    try:
        client = AsyncOpenAI(
            api_key=OPENROUTER_API_KEY,
            base_url=OPENROUTER_BASE_URL,
            timeout=10.0
        )
        
        response = await client.chat.completions.create(
            model=model_id,
            messages=[{"role": "user", "content": "test"}],
            max_tokens=1,
            temperature=0.0,
        )
        
        await get_model_manager().record_success(model_id)
        return True
        
    except Exception as e:
        await get_model_manager().record_failure(model_id, e)
        return False


async def health_check_models(model_ids: List[str]) -> Dict[str, bool]:
    """Health check multiple models in parallel"""
    tasks = [test_model_health(model_id) for model_id in model_ids]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    health_results = {}
    for model_id, result in zip(model_ids, results):
        health_results[model_id] = isinstance(result, bool) and result
    
    return health_results

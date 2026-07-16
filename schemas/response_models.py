from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

# --- Health Check ---
class HealthCheckResponse(BaseModel):
    status: str = Field(description="System status", examples=["ok"])
    engine: Optional[str] = Field(None, description="Engine version", examples=["v2-multi-stage"])
    time: Optional[float] = Field(None, description="Current time (unix timestamp)")
    api_version: Optional[str] = Field(None, description="API Version")

class BalanceResponse(BaseModel):
    balance: float
    usage: float
    limit: float

class PingResponse(BaseModel):
    status: str = Field(examples=["ok"])

# --- Models ---
class PingModelResponse(BaseModel):
    status: str
    latency_ms: Optional[int] = None
    id: str
    error: Optional[str] = None

class ModelArchitecture(BaseModel):
    input_modalities: Optional[List[str]] = None
    output_modalities: Optional[List[str]] = None

class ModelPricing(BaseModel):
    prompt: Optional[str] = None
    completion: Optional[str] = None

class ModelMetadata(BaseModel):
    id: str
    name: str
    vision: bool = False
    free: bool = False
    provider: Optional[str] = None
    supported_parameters: Optional[List[str]] = None
    input_modalities: Optional[List[str]] = None
    output_modalities: Optional[List[str]] = None
    context_length: Optional[int] = None
    description: Optional[str] = None
    status: Optional[str] = None
    latency_ms: Optional[int] = None

class FilteredModelsResponse(BaseModel):
    count: int
    models: List[ModelMetadata]
    filters_applied: Dict[str, Any]

class AdminSelectedModelsResponse(BaseModel):
    selected_models: List[str]

class GenericSuccessResponse(BaseModel):
    success: bool
    selected_count: Optional[int] = None
    message: Optional[str] = None

class AvailableModelsResponse(BaseModel):
    available_models: List[ModelMetadata]

class SelectedModelsResponse(BaseModel):
    selected_models: List[ModelMetadata]

# --- Admin ---
class AdminServiceStats(BaseModel):
    id: str
    name: str
    status: str
    latency: int

class AdminStatsData(BaseModel):
    users: int
    docs: int
    requests: int
    tokens: int

class AdminStatsResponse(BaseModel):
    stats: AdminStatsData
    services: List[AdminServiceStats]

class AdminUser(BaseModel):
    id: str
    email: str
    role: str
    created_at: Optional[str] = None

class AdminUsersResponse(BaseModel):
    users: List[AdminUser]

class AdminDebugInfo(BaseModel):
    success: bool
    timestamp: str
    total_latency_ms: int
    system_info: Dict[str, Any]
    env_vars: Dict[str, Any]
    sqlite_status: Dict[str, Any]
    supabase_status: Dict[str, Any]
    openrouter_status: Dict[str, Any]

class AdminClearCacheResponse(BaseModel):
    success: bool
    cleared_items: List[str]
    errors: List[str]

class AdminTestSupabaseResponse(BaseModel):
    success: bool
    status: str
    latency_ms: int
    response_code: Optional[int] = None
    message: Optional[str] = None
    error: Optional[str] = None

# --- Core Prompts ---
class PromptsPresetsDefense(BaseModel):
    mode: str
    architectPrompt: str
    unitSystemRoles: Dict[str, str]
    taskPrompts: Dict[str, str]
    judgeSystemPrompt: str
    moaDefaultExpertRoles: List[str]

class PromptsPresetsProsecution(BaseModel):
    mode: str
    architectPrompt: str
    unitSystemRoles: Dict[str, str]
    taskPrompts: Dict[str, str]
    judgeSystemPrompt: str
    moaDefaultExpertRoles: List[str]

class PromptsPresetsResponse(BaseModel):
    defense: PromptsPresetsDefense
    prosecution: PromptsPresetsProsecution

# --- Documents ---
class JobStatusResponse(BaseModel):
    job_id: str
    status: str
    created_at: float
    total_files: Optional[int] = None
    processed_files: Optional[int] = None
    errors: Optional[int] = None
    message: Optional[str] = None
    completed_at: Optional[float] = None

class JobCreationResponse(BaseModel):
    success: bool
    message: str
    job_id: str
    files_count: int
    folder: str

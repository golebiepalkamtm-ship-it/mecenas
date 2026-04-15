from typing import Any, List, Optional, Dict, Union
from pydantic import BaseModel, Field, ConfigDict, validator

MAX_MESSAGE_LENGTH = 4000
MAX_HISTORY_ITEMS = 15

class Attachment(BaseModel):
    name: str = ""
    type: str = ""
    content: str = ""
    model_config = ConfigDict(extra='allow')

class ChatRequest(BaseModel):
    message: str = ""
    history: Optional[List[Any]] = Field(default_factory=list)
    model: str = "qwen/qwen3.6-plus:free"
    provider: str = "openrouter"
    sessionId: Optional[str] = None
    attachments: Optional[List[Attachment]] = Field(default_factory=list)
    use_full_history: bool = False
    selected_models: Optional[List[str]] = None
    aggregator_model: Optional[str] = None
    task: Optional[str] = None
    custom_task_prompt: Optional[str] = None
    architect_prompt: Optional[str] = None
    system_role_prompt: Optional[str] = None
    expert_roles: Optional[Dict[str, str]] = None
    expert_role_prompts: Optional[Dict[str, str]] = None
    judge_system_prompt: Optional[str] = None
    document_text: Optional[str] = None
    use_rag: bool = True
    mode: str = "advocate"
    stream: bool = False
    api_keys: Optional[Dict[str, str]] = None
    model_config = ConfigDict(extra='allow')

    @validator('message')
    def message_length(cls, v):
        if len(v) > MAX_MESSAGE_LENGTH:
            raise ValueError(f'Wiadomość jest zbyt długa (maksymalnie {MAX_MESSAGE_LENGTH} znaków)')
        return v

    @validator('history')
    def history_limit(cls, v):
        if v and len(v) > MAX_HISTORY_ITEMS:
            # Automatycznie przycinamy historię zamiast wyrzucać błąd
            return v[-MAX_HISTORY_ITEMS:]
        return v

class DraftRequest(BaseModel):
    system_prompt: Optional[str] = None
    user_instructions: str
    structured_data: Optional[Dict[str, Any]] = None
    model: str = "qwen/qwen3.6-plus:free"
    history: list[Any] = []
    sessionId: Optional[str] = None

    @validator('user_instructions')
    def instructions_length(cls, v):
        if len(v) > 10000:
            raise ValueError('Instrukcje są zbyt długie (maksymalnie 10000 znaków)')
        return v

class ExtractFormalDataRequest(BaseModel):
    text: Optional[str] = None
    history: list[Any] = []

class DocumentUploadResponse(BaseModel):
    success: bool
    filename: str
    extracted_text: str
    text_length: int
    error: Optional[str] = None

class DocumentAnalysisRequest(BaseModel):
    document_text: str
    question: str
    model: str = "qwen/qwen3.6-plus:free"
    sessionId: Optional[str] = None
    use_rag: bool = True

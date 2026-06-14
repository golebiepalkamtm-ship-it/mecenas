from typing import List, Optional
from pydantic import BaseModel, Field


class ExpertArgument(BaseModel):
    """Pojedynczy argument eksperta z pełną traceability do źródeł RAG.

    Sędzia potrzebuje: legal_basis → skąd pochodzi (rag_chunk_ids),
    co mu przeczy (countered_by), czy przeszedł walidację (validated).
    """

    id: str = Field(..., description="Unikalny identyfikator argumentu (np. ARG_001)")
    legal_basis: List[str] = Field(
        ...,
        description="Podstawy prawne argumentu (np. ['art. 77 §1 O.p.', 'art. 72 KPA'])",
    )
    rag_chunk_ids: List[str] = Field(
        default_factory=list,
        description="ID chunków RAG potwierdzających argument (linkuje do konkretnych fragmentów korpusu)",
    )
    argument_short: str = Field(..., description="Krótkie streszczenie argumentu i jego logiki")
    countered_by: List[str] = Field(
        default_factory=list,
        description="ID argumentów kontr-strony obalających ten argument (np. ['ARG_003'])",
    )
    criticality: str = Field(
        ...,
        description="Poziom krytyczności argumentu: LOW, MEDIUM, HIGH, CRITICAL",
    )
    validated: bool = Field(
        default=False,
        description="Czy legal_basis przeszło walidację sidecar (ustawiane programowo, nie przez model)",
    )


class ExpertAnalysis(BaseModel):
    role: str = Field(..., description="Rola eksperta, np. 'obrona', 'procedura', 'strategia'")
    key_arguments: List[ExpertArgument] = Field(
        ..., description="Lista głównych argumentów wypracowanych przez eksperta"
    )
    synthesis_advice: str = Field(..., description="Zalecenie końcowe (wniosek eksperta)")

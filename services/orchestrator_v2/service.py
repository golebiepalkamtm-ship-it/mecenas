from __future__ import annotations

import logging
from typing import Any, AsyncGenerator, Dict

from services.orchestrator_types import OrchestratorInputParams
from services.orchestrator_v2.pipeline import OrchestrationPipeline

logger = logging.getLogger(__name__)


class OrchestratorV2Service:
    async def process_user_request_stream_v2(
        self,
        **kwargs: Any,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        from database import get_setting
        params = OrchestratorInputParams(
            user_query=kwargs.get("user_query", ""),
            attachments=kwargs.get("attachments") or [],
            selected_model=kwargs.get("selected_model") or "",
            selected_models=kwargs.get("selected_models") or [],
            aggregator_model=kwargs.get("aggregator_model") or "",
            use_saos=kwargs.get("use_saos", True),
            use_eli=kwargs.get("use_eli", True),
            use_rag_legal=kwargs.get("use_rag_legal", True),
            use_rag_user=bool(kwargs.get("use_rag_user")),
            use_lexminde_mcp=bool(kwargs.get("use_lexminde_mcp")),
            act_terms=kwargs.get("act_terms") or [],
            architect_prompt=kwargs.get("architect_prompt") or "",
            system_role_prompt=kwargs.get("system_role_prompt") or "",
            expert_roles=kwargs.get("expert_roles") or {},
            expert_role_prompts=kwargs.get("expert_role_prompts") or {},
            role_catalog=kwargs.get("role_catalog"),
            current_task=kwargs.get("current_task") or "",
            task_prompt=kwargs.get("task_prompt") or "",
            chat_mode=kwargs.get("chat_mode") or "auto",
            response_mode=kwargs.get("response_mode") or "standard",
            process_side=kwargs.get("process_side") or "neutral",
            judge_system_prompt=kwargs.get("judge_system_prompt") or "",
            assigned_models=kwargs.get("assigned_models") or {},
            document_text=kwargs.get("document_text", ""),
            chat_history=kwargs.get("chat_history") or [],
            session_id=kwargs.get("session_id", ""),
        )

        logger.info("[V3] Start process_user_request_stream query=%s", params.user_query[:50])
        status_callback = kwargs.get("status_callback")
        pipeline = OrchestrationPipeline()
        try:
            async for chunk in pipeline.execute(params, status_callback=status_callback):
                yield chunk
            logger.info("[V2] pipeline.execute finished successfully")
        except Exception:
            logger.exception("[V2] Critical pipeline error")
            raise


orchestrator_v2_service = OrchestratorV2Service()


from __future__ import annotations

from typing import Any, AsyncGenerator, Dict

from application.chat.types import ChatStreamInput
from services.orchestrator_v2.service import orchestrator_v2_service


class ChatStreamUseCase:
    async def execute(self, params: ChatStreamInput) -> AsyncGenerator[Dict[str, Any], None]:
        async for chunk in orchestrator_v2_service.process_user_request_stream_v2(
            user_query=params.user_query,
            attachments=params.attachments,
            selected_model=params.selected_model,
            selected_models=params.selected_models,
            aggregator_model=params.aggregator_model,
            use_saos=params.use_saos,
            use_eli=params.use_eli,
            use_rag_legal=params.use_rag_legal,
            use_rag_user=params.use_rag_user,
            act_terms=params.act_terms,
            architect_prompt=params.architect_prompt,
            system_role_prompt=params.system_role_prompt,
            expert_roles=params.expert_roles,
            expert_role_prompts=params.expert_role_prompts,
            role_catalog=params.role_catalog,
            current_task=params.current_task,
            task_prompt=params.task_prompt,
            chat_mode=params.chat_mode,
            response_mode=params.response_mode,
            process_side=params.process_side,
            judge_system_prompt=params.judge_system_prompt,
            model_latencies=params.model_latencies,
            document_text=params.document_text,
            chat_history=params.chat_history,
            session_id=params.session_id,
        ):
            yield chunk


chat_stream_use_case = ChatStreamUseCase()


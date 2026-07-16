# Chat Contract Mapping

Aktualne mapowanie dla ścieżki `frontend -> /chat -> LegacyPayloadAdapter -> orchestrator`.

## Request

| Frontend field | Backend request field | Orchestrator param |
| --- | --- | --- |
| `message` | `message` | `user_query` |
| `chat_mode` | `chat_mode` | `chat_mode` |
| `response_mode` | `response_mode` | `response_mode` |
| `side` | `side` | `process_side` |
| `model` | `model` | `selected_model` |
| `sessionId` | `sid` / `sessionId` | `session_id` |
| `attachments` | `attachments` | `attachments` |
| `document_text` | `document_text` | `document_text` |
| `history` | `history` | `chat_history` |
| `act_terms` | `act_terms` | `act_terms` |
| `use_saos` | `use_saos` | `use_saos` |
| `use_eli` | `use_eli` | `use_eli` |
| `use_rag_legal` | `use_rag_legal` | `use_rag_legal` |
| `use_rag_user` | `use_rag_user` | `use_rag_user` |
| `model_latencies` | `model_latencies` | `model_latencies` |
| `active_system_role_id` | `active_system_role_id` | `active_system_role_id` |
| `current_task` | `current_task` | `current_task` |
| `prompt_overrides.architect_prompt` | `prompt_overrides.architect_prompt` or `architect_prompt` | `architect_prompt` |
| `prompt_overrides.system_role_prompt` | `prompt_overrides.system_role_prompt` or `system_role_prompt` | `system_role_prompt` |
| `prompt_overrides.judge_system_prompt` | `prompt_overrides.judge_system_prompt` or `judge_system_prompt` | `judge_system_prompt` |
| `prompt_overrides.task_prompt` | `prompt_overrides.task_prompt` or `task_prompt` | `task_prompt` |
| `prompt_overrides.role_catalog` | `prompt_overrides.role_catalog` or `role_catalog` | `role_catalog` |
| `prompt_overrides.expert_role_prompts` | `prompt_overrides.expert_role_prompts` or `expert_role_prompts` | `expert_role_prompts` |
| `moa_options.selected_models` | `moa_options.selected_models` or `selected_models` | `selected_models` |
| `moa_options.aggregator_model` | `moa_options.aggregator_model` or `aggregator_model` | `aggregator_model` |
| `moa_options.expert_roles_map` | `moa_options.expert_roles_map` or `expert_roles` | `expert_roles` |

## SSE Events

| Event type | Producer | Główne pola |
| --- | --- | --- |
| `metadata` | `orchestrator.process_user_request_stream_v2()` -> `routes/chat_v2.py` | `id`, `sessionId`, `message`, `expert_analyses`, `urgency_alerts` |
| `chunk` | `routes/chat_v2.py` | `text` |
| `final_metadata` | `routes/chat_v2.py` | `final_answer`, `sources`, `expert_analyses`, `eli_explanation`, `pipeline_latency_ms`, `timeline`, `claim_scores`, `investigation_summary`, `cited_sources` |
| `error` | `routes/chat_v2.py` | `text` |

## Transitional Notes

- Backend przyjmuje już zagnieżdżone `prompt_overrides` i `moa_options` przez `schemas/chat_request.py`.
- Frontend dalej wysyła również płaskie pola zgodności (`selected_models`, `aggregator_model`, `expert_roles`, `architect_prompt`, itd.), bo `LegacyPayloadAdapter` pozostaje warstwą przejściową.
- Docelowy krok Etapu 2 to usunięcie płaskich pól z payloadu po potwierdzeniu, że wszystkie aktywne klienty korzystają wyłącznie z kontraktu kanonicznego.

"""Testy kontraktu czatu i adaptera legacy."""
from schemas.chat_contract import ChatMode, ProcessSide, ResponseMode
from schemas.chat_legacy_adapter import LegacyPayloadAdapter


def test_legacy_flat_payload_maps_to_v2():
    raw = {
        "message": "Czy mogę zaskarżyć?",
        "chat_mode": "moa",
        "response_mode": "strategic",
        "side": "defense",
        "model": "google/gemini-2.5-flash-lite",
        "selected_models": ["m1", "m2"],
        "aggregator_model": "judge-model",
        "expert_roles": {"m1": "defender"},
        "architect_prompt": "Architekt test",
        "system_role_prompt": "Nie powinno trafić do sędziego",
        "role_catalog": {"defender": "Rola obrońcy"},
        "current_task": "general",
        "task_prompt": "[TASK] test",
    }
    v2 = LegacyPayloadAdapter.from_mapping(raw)
    assert v2.chat_mode == ChatMode.MOA
    assert v2.side == ProcessSide.DEFENSE
    assert v2.response_mode == ResponseMode.STRATEGIC
    assert v2.moa_options is not None
    assert v2.moa_options.expert_roles_map == {"m1": "defender"}


def test_moa_strips_system_role_for_orchestrator():
    raw = {
        "message": "x",
        "chat_mode": "moa",
        "system_role_prompt": "Prokurator",
        "side": "prosecution",
        "selected_models": ["a"],
        "aggregator_model": "b",
    }
    resolved = LegacyPayloadAdapter.to_orchestrator_kwargs(
        LegacyPayloadAdapter.from_mapping(raw)
    )
    assert resolved.system_role_prompt is None
    assert resolved.side == "prosecution"


def test_single_keeps_system_role():
    raw = {
        "message": "x",
        "chat_mode": "single",
        "system_role_prompt": "Obrońca",
        "side": "defense",
    }
    resolved = LegacyPayloadAdapter.to_orchestrator_kwargs(
        LegacyPayloadAdapter.from_mapping(raw)
    )
    assert resolved.system_role_prompt == "Obrońca"


def test_consensus_normalizes_to_moa():
    v2 = LegacyPayloadAdapter.from_mapping({"message": "a", "chat_mode": "consensus"})
    assert v2.chat_mode == ChatMode.MOA


def test_response_mode_default_alias():
    v2 = LegacyPayloadAdapter.from_mapping({"message": "a", "response_mode": "default"})
    assert v2.response_mode == ResponseMode.STRATEGIC

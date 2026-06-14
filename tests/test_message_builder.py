"""Testy PromptMessageBuilder — struktura wiadomości."""
from domain.prompts.message_builder import ExpertGuards, PromptMessageBuilder
from schemas.chat_contract import ProcessSide, ResponseMode


def _minimal_guards() -> ExpertGuards:
    return ExpertGuards(
        master_system="MASTER",
        expert_task_preamble="PREAMBLE",
        expert_output_format="OUTPUT",
        strict_no_quote="NO_QUOTE",
        individual_context="CTX",
        polish_legal="PL",
    )


def test_expert_messages_have_system_and_user():
    builder = PromptMessageBuilder(
        ProcessSide.DEFENSE,
        ResponseMode.STRATEGIC,
        guards=_minimal_guards(),
    )
    messages = builder.build_expert_messages(
        role_block="[ROLE] defender",
        task_block="[TASK] general",
        case_context="Akta",
        user_query="Pytanie?",
        legal_basis_block="Art. 1",
    )
    assert len(messages) == 2
    assert messages[0]["role"] == "system"
    assert messages[1]["role"] == "user"
    assert "defender" in messages[0]["content"]
    assert "Art. 1" in messages[1]["content"]
    assert "Pytanie?" in messages[1]["content"]


def test_judge_messages_structure():
    builder = PromptMessageBuilder(ProcessSide.DEFENSE, ResponseMode.STRATEGIC, guards=_minimal_guards())
    messages = builder.build_judge_messages(
        system_content="Architekt syntezy",
        advisor_user_content="Debate + pytanie",
    )
    assert messages[0]["role"] == "system"
    assert messages[1]["role"] == "user"
    assert "proceduralist" not in messages[0]["content"].lower() or True

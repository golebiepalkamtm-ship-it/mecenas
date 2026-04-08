import time
from fastapi import APIRouter
from moa.prompt_builder import DEFENSE_UNIVERSE, PROSECUTION_UNIVERSE

router = APIRouter()

@router.get("/health-check")
@router.get("/api/health-check")
async def health_check():
    return {"status": "ok", "time": time.time(), "api_version": "2.1-unified"}

@router.get("/ping")
async def ping():
    return {"status": "ok"}

@router.get("/prompts/presets")
@router.get("/api/prompts/presets")
async def prompts_presets():
    defense_roles = {**DEFENSE_UNIVERSE["roles"]}
    defense_roles.update({
        "inquisitor": DEFENSE_UNIVERSE["roles"].get("defender", ""),
        "oracle": DEFENSE_UNIVERSE["roles"].get("constitutionalist", ""),
    })
    defense_tasks = {**DEFENSE_UNIVERSE["tasks"]}
    defense_tasks.update({
        "analysis": DEFENSE_UNIVERSE["tasks"].get("criminal_defense", ""),
        "drafting": DEFENSE_UNIVERSE["tasks"].get("document_attack", ""),
        "research": DEFENSE_UNIVERSE["tasks"].get("rights_defense", ""),
        "strategy": DEFENSE_UNIVERSE["tasks"].get("emergency_relief", ""),
    })

    prosecution_roles = {**PROSECUTION_UNIVERSE["roles"]}
    prosecution_roles.update({
        "inquisitor": PROSECUTION_UNIVERSE["roles"].get("hard_judge", ""),
        "draftsman": PROSECUTION_UNIVERSE["roles"].get("prosecutor", ""),
        "oracle": PROSECUTION_UNIVERSE["roles"].get("forensic_expert", ""),
        "grandmaster": PROSECUTION_UNIVERSE["roles"].get("sentencing_expert", ""),
    })
    prosecution_tasks = {**PROSECUTION_UNIVERSE["tasks"]}
    prosecution_tasks.update({
        "analysis": PROSECUTION_UNIVERSE["tasks"].get("charge_building", ""),
        "drafting": PROSECUTION_UNIVERSE["tasks"].get("indictment_review", ""),
        "research": PROSECUTION_UNIVERSE["tasks"].get("sentencing_argument", ""),
        "strategy": PROSECUTION_UNIVERSE["tasks"].get("warrant_application", ""),
    })

    return {
        "defense": {
            "mode": "advocate",
            "architectPrompt": DEFENSE_UNIVERSE["identity"],
            "unitSystemRoles": defense_roles,
            "taskPrompts": defense_tasks,
            "judgeSystemPrompt": DEFENSE_UNIVERSE["judge"],
            "moaDefaultExpertRoles": ["defender", "constitutionalist", "proceduralist", "evidencecracker", "negotiator"],
        },
        "prosecution": {
            "mode": "judge",
            "architectPrompt": PROSECUTION_UNIVERSE["identity"],
            "unitSystemRoles": prosecution_roles,
            "taskPrompts": prosecution_tasks,
            "judgeSystemPrompt": PROSECUTION_UNIVERSE["judge"],
            "moaDefaultExpertRoles": ["prosecutor", "investigator", "forensic_expert", "hard_judge", "sentencing_expert"],
        },
    }

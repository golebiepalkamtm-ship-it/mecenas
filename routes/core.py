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
    defense_roles = dict(DEFENSE_UNIVERSE["roles"])
    defense_tasks = dict(DEFENSE_UNIVERSE["tasks"])
    prosecution_roles = dict(PROSECUTION_UNIVERSE["roles"])
    prosecution_tasks = dict(PROSECUTION_UNIVERSE["tasks"])

    return {
        "defense": {
            "mode": "advocate",
            "architectPrompt": DEFENSE_UNIVERSE["identity"],
            "unitSystemRoles": defense_roles,
            "taskPrompts": defense_tasks,
            "judgeSystemPrompt": DEFENSE_UNIVERSE["judge"],
            "moaDefaultExpertRoles": [
                "defender",
                "constitutionalist",
                "proceduralist",
                "evidencecracker",
                "negotiator",
                "inquisitor",
                "oracle",
            ],
        },
        "prosecution": {
            "mode": "judge",
            "architectPrompt": PROSECUTION_UNIVERSE["identity"],
            "unitSystemRoles": prosecution_roles,
            "taskPrompts": prosecution_tasks,
            "judgeSystemPrompt": PROSECUTION_UNIVERSE["judge"],
            "moaDefaultExpertRoles": [
                "prosecutor",
                "investigator",
                "forensic_expert",
                "hard_judge",
                "sentencing_expert",
                "inquisitor",
                "oracle",
            ],
        },
    }

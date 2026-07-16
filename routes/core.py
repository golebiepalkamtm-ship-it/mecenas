import time
from fastapi import APIRouter
from moa.prompt_builder import DEFENSE_UNIVERSE, PROSECUTION_UNIVERSE
from schemas.response_models import PingResponse, PromptsPresetsResponse

router = APIRouter()

@router.get("/ping", response_model=PingResponse)
async def ping():
    return {"status": "ok"}

@router.get("/prompts/presets", response_model=PromptsPresetsResponse)
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

import asyncio
from config import settings
from services.llm_client import LLMClientService
from pydantic import BaseModel

class Score(BaseModel):
    score: int
    reason: str

async def main():
    llm = LLMClientService()
    try:
        res, model = await llm.call(
            model_id="deepseek/deepseek-v4-flash-latest",
            messages=[{"role": "user", "content": "What is 2+2? Reply in JSON"}],
            response_format=Score
        )
        print("Success:", res)
    except Exception as e:
        print("Error:", type(e), e)

asyncio.run(main())

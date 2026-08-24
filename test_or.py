import asyncio
from openai import AsyncOpenAI
from config import settings

async def main():
    client = AsyncOpenAI(api_key=settings.openrouter_api_key, base_url='https://openrouter.ai/api/v1')
    try:
        r = await client.chat.completions.create(model='~deepseek/deepseek-v4-flash-latest', messages=[{'role': 'user', 'content': 'Test'}])
        print("Content:", r.choices[0].message.content)
    except Exception as e:
        print("Error type:", type(e))
        print("Error message:", e)
        
    try:
        r2 = await client.chat.completions.create(model='qwen/qwen3.8-max', messages=[{'role': 'user', 'content': 'Test'}])
        print("Content2:", r2.choices[0].message.content)
    except Exception as e:
        print("Error type:", type(e))
        print("Error message:", e)

asyncio.run(main())

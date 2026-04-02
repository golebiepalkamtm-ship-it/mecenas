import asyncio, httpx, os
from dotenv import load_dotenv

load_dotenv()

async def check_vision_models():
    api_key = os.getenv('OPENROUTER_API_KEY')
    headers = {'Authorization': f'Bearer {api_key}', 'Content-Type': 'application/json'}
    
    async with httpx.AsyncClient() as client:
        res = await client.get('https://openrouter.ai/api/v1/models', headers=headers)
        models = res.json().get('data', [])
        
        # Filtruj tylko modele z vision
        vision_models = []
        for m in models:
            model_id = m.get('id', '')
            vision_keywords = [
                'gpt-4o', 'gpt-4-turbo', 'gpt-4-vision',
                'claude-3', 'claude-3.5', 'claude-3.7', 'claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku',
                'gemini-pro-vision', 'gemini-1.5', 'gemini-2.0', 'gemini-2.5', 'gemini-exp',
                'llava', 'vision', 'moondream',
                'pixtral', 'molmo', 'qwen-vl', 'internvl'
            ]
            if any(pattern in model_id.lower() for pattern in vision_keywords):
                vision_models.append(m.get('name', model_id))
        
        print(f'✅ Znaleziono {len(vision_models)} modeli z obsługą obrazów:')
        for vm in vision_models[:10]:
            print(f'  📸 {vm}')
        
        print(f'\n❌ Usunięto {len(models) - len(vision_models)} modeli bez vision')

if __name__ == "__main__":
    asyncio.run(check_vision_models())

import json
import logging
from fastapi import APIRouter
from moa.http_client import get_shared_openai_client
from models.request_models import ExtractFormalDataRequest

router = APIRouter()
logger = logging.getLogger("LexMindAnalytics")

@router.post("/extract-formal-data")
async def extract_formal_data(request: ExtractFormalDataRequest):
    """
    Ekstrahuje dane Nadawcy i Adresata z tekstu lub historii czatu.
    """
    try:
        combined_text = request.text or ""
        if request.history:
            for msg in request.history[-10:]:
                content = msg.get("content", "")
                if isinstance(content, list):
                    for part in content:
                        if isinstance(part, dict) and part.get("type") == "text":
                            combined_text += f"\n{part.get('text', '')}"
                else:
                    combined_text += f"\n{content}"

        if not combined_text.strip():
            return {"sender": "", "recipient": "", "place_date": ""}

        system_prompt = (
            "Jesteś ekspertem prawnym. Twoim zadaniem jest wyodrębnienie danych NADAWCY (Sender), "
            "ADRESATA (Recipient) oraz MIEJSCOWOŚCI I DATY (Place & Date) z podanego tekstu.\n"
            "Zwróć odpowiedź WYŁĄCZNIE w formacie JSON:\n"
            "{\"sender\": \"dane nadawcy\", \"recipient\": \"dane adresata\", \"place_date\": \"miejscowość, data\"}\n"
        )

        client = get_shared_openai_client()
        response = await client.chat.completions.create(
            model="qwen/qwen3.6-plus:free",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Zidentyfikuj strony w tekście:\n\n{combined_text[:8000]}"}
            ],
            response_format={"type": "json_object"},
            temperature=0,
        )
        
        result = json.loads(response.choices[0].message.content or "{}")
        return result
    except Exception as e:
        logger.error(f"❌ Extraction Error: {e}")
        return {"sender": "", "recipient": "", "place_date": "", "error": str(e)}

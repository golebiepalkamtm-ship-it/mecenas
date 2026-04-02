# pyre-ignore-all-errors
from contextlib import asynccontextmanager
from fastapi import FastAPI, UploadFile, File, Form  # type: ignore
from fastapi.middleware.cors import CORSMiddleware  # type: ignore
from pydantic import BaseModel  # type: ignore
import os, time, shutil, sys, re, asyncio
import requests  # type: ignore
from pathlib import Path
from dotenv import load_dotenv  # type: ignore
from typing import List, Optional, Any

# Core LangChain v1 & Agent Imports
from build_index import build_index, load_index, CHUNKS_PATH, FAISS_INDEX_PATH, PDF_DIR  # type: ignore

from langchain_openai import ChatOpenAI  # type: ignore
from langchain_core.tools import tool  # type: ignore
from langchain.agents import create_agent  # type: ignore
from langchain_mcp_adapters.client import MultiServerMCPClient  # type: ignore
import database  # type: ignore

load_dotenv(override=True)

# ---------------------------------------------------------------------------
# Global State
# ---------------------------------------------------------------------------
vector_store = None
mcp_client: Optional[MultiServerMCPClient] = None
shared_tools: list = []
shared_prompt: Any = None

# Two agents: Gemini + OpenRouter — user can choose or compare
agents: dict[str, Any] = {}

AVAILABLE_MODELS = {
    "google/gemini-2.5-flash": {
        "name": "Gemini 2.5 Flash (OpenRouter)",
        "provider": "openrouter",
        "model_id": "google/gemini-2.5-flash",
        "multimodal": True,
    },
    "openai/gpt-4o-mini": {
        "name": "GPT-4o Mini (OpenRouter)",
        "provider": "openrouter",
        "model_id": "openai/gpt-4o-mini",
        "multimodal": True,
    },
    "openai/gpt-4o": {
        "name": "GPT-4o (OpenRouter)",
        "provider": "openrouter",
        "model_id": "openai/gpt-4o",
        "multimodal": True,
    },
    "anthropic/claude-3.5-sonnet": {
        "name": "Claude 3.5 Sonnet (OpenRouter)",
        "provider": "openrouter",
        "model_id": "anthropic/claude-3.5-sonnet",
        "multimodal": True,
    },
    "meta-llama/llama-3.1-70b-instruct": {
        "name": "Llama 3.1 70B (OpenRouter)",
        "provider": "openrouter",
        "model_id": "meta-llama/llama-3.1-70b-instruct",
        "multimodal": False,
    },
}


def get_vector_store():
    global vector_store
    if vector_store is None:
        vector_store = load_index()
    return vector_store


@tool
def legal_research(query: str) -> str:
    """Wyszukaj informacje prawne w bazie dokumentów kancelarii na podstawie zapytania.
    Używaj tego narzędzia do każdej analizy prawnej, aby opierać się na faktach i dokumentach."""
    
    API_KEY = os.getenv("OPENROUTER_API_KEY")
    if not API_KEY:
        return "Błąd: Brak OPENROUTER_API_KEY w konfiguracji."

    try:
        # 1. Zdobądź wektory dla zapytania (Embeddings)
        url_emb = "https://openrouter.ai/api/v1/embeddings"
        headers = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}
        payload = {"model": "openai/text-embedding-3-large", "input": [query]}
        
        res_emb = requests.post(url_emb, json=payload, headers=headers, timeout=20)
        res_emb.raise_for_status()
        embedding = res_emb.json()["data"][0]["embedding"]

        # 2. Przeszukaj bazę Supabase podając embedding
        supabase_func_url = "https://dhyvxspgsktpbjonejek.supabase.co/functions/v1/import-knowledge"
        query_payload = {
            "action": "query",
            "query_embedding": embedding,
            "match_threshold": 0.3,
            "match_count": 7
        }

        res_db = requests.post(supabase_func_url, json=query_payload, timeout=20)
        res_db.raise_for_status()
        docs = res_db.json().get("data", [])
        
        if not docs:
            return "Brak pasującego kontekstu w bazie dokumentów prawnych dla zapytania: " + query

        context_parts = []
        for d in docs:
            metadata = d.get("metadata", {})
            source = metadata.get("filename", "Nieznany")
            content = d.get("content", "")
            context_parts.append(f"--- ŹRÓDŁO: {source} ---\n{content}")

        return "\n\n".join(context_parts)
    except Exception as e:
        return f"Błąd podczas przeszukiwania bazy (Supabase/OpenRouter): {str(e)}"


def _build_system_prompt() -> str:
    raw_prompt = database.get_setting("system_prompt")
    if not raw_prompt:
        # Fallback to .env only if DB failed
        raw_prompt = os.getenv(
            "SYSTEM_PROMPT",
            "Jesteś polskim prawnikiem (Radcą AI) w Kancelarii Pałka & Kaźmierczak. "
            "Twoje odpowiedzi muszą być profesjonalne, oparte na prawie i dostarczonym kontekście.",
        )
    return raw_prompt.replace("\\n", "\n")


async def _load_mcp_tools() -> list:
    """Load tools from all configured MCP servers."""
    global mcp_client
    python_exe = sys.executable
    mcp_config = {
        "math": {
            "transport": "stdio",
            "command": python_exe,
            "args": [str(Path("math_server.py").absolute())],
        },
        "weather": {
            "transport": "stdio",
            "command": python_exe,
            "args": [str(Path("weather_server.py").absolute())],
        },
        "docs-langchain": {
            "transport": "http",
            "url": "https://docs.langchain.com/mcp",
        },
    }

    try:
        import typing
        mcp_tools_list = typing.cast(list, await mcp_client.get_tools())
        print(f"✅ Loaded {len(mcp_tools_list)} tools from MCP servers.")
        for t in mcp_tools_list:
            if hasattr(t, "name"):
                print(f"   - {getattr(t, 'name')}")
        return mcp_tools_list
    except Exception as e:
        print(f"⚠️  Failed to load MCP tools: {e}")
        return []


async def init_agents():
    """Initialize both Gemini and OpenRouter agents with shared tools."""
    global agents
    agents.clear() # CRITICAL: Reset agents to apply new prompt/config immediately!

    system_prompt = _build_system_prompt()
    mcp_tools = await _load_mcp_tools()
    all_tools = [legal_research] + mcp_tools

    google_key = os.getenv("GOOGLE_API_KEY")
    openrouter_key = os.getenv("OPENROUTER_API_KEY")

    # Fetch dynamic OpenRouter models
    if openrouter_key:
        try:
            resp = requests.get("https://openrouter.ai/api/v1/models?supported_parameters=tools", timeout=5)
            if resp.status_code == 200:
                for m in resp.json().get("data", []):
                    model_id = m["id"]
                    key = model_id
                    
                    modality = m.get("architecture", {}).get("modality", "")
                    supports_vision = "image" in modality.lower()
                    
                    if key not in AVAILABLE_MODELS:
                        AVAILABLE_MODELS[key] = {
                            "name": m.get("name", model_id),
                            "provider": "openrouter",
                            "model_id": model_id,
                            "multimodal": supports_vision
                        }
                print(f"✅ Loaded {len(AVAILABLE_MODELS)} total models including OpenRouter API catalog.")
        except Exception as e:
            print(f"⚠️ Could not fetch OpenRouter models: {e}")

    # Store configurations globally to allow lazy initialization
    global shared_tools, shared_prompt
    shared_tools = all_tools
    shared_prompt = system_prompt

    # Initialize a few default models eagerly
    default_eager = ["google/gemini-2.5-flash", "openai/gpt-4o-mini", "openai/gpt-4o", "anthropic/claude-3.5-sonnet", "meta-llama/llama-3.1-70b-instruct"]
    for key in default_eager:
        _lazy_init_agent(key, openrouter_key=openrouter_key)

    if not agents:
        print("❌ No agents initialized! Check your API keys.")
    else:
        print(f"🚀 {len(agents)} default agent(s) ready for consensus: {', '.join(agents.keys())}")


def _lazy_init_agent(key: str, google_key: Optional[str] = None, openrouter_key: Optional[str] = None) -> bool:
    """Lazily initializes an agent if its API key exists."""
    if key in agents:
        return True
    
    if key not in AVAILABLE_MODELS:
        return False

    openrouter_key = openrouter_key or os.getenv("OPENROUTER_API_KEY")
    
    info = AVAILABLE_MODELS[key]
    provider = info["provider"]
    model_id = info["model_id"]
    
    try:
        if provider == "openrouter" and openrouter_key:
            llm = ChatOpenAI(
                model=model_id,
                temperature=0.3,
                api_key=openrouter_key,
                base_url="https://openrouter.ai/api/v1",
                default_headers={
                    "HTTP-Referer": "http://localhost:8003",
                    "X-OpenRouter-Title": "LexMind AI",
                }
            )
            agents[key] = create_agent(llm, tools=shared_tools, system_prompt=shared_prompt)
            print(f"✅ Lazy Agent {key.upper()} initialized via OpenRouter.")
            return True
            
    except Exception as e:
        print(f"⚠️ Agent {key} failed to lazy-init: {e}")
        
    return False


# ---------------------------------------------------------------------------
# FastAPI Lifespan
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Modern FastAPI lifespan: startup & shutdown in one context manager."""
    PDF_DIR.mkdir(exist_ok=True)
    Path("cache").mkdir(exist_ok=True)

    database.init_db()
    await init_agents()

    yield  # App is running

    print("Shutting down Radca AI…")


app = FastAPI(
    title="Radca AI API — LangChain v1 + MCP + Multi-Model",
    version="4.1",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------
class ChatMessage(BaseModel):
    role: str
    content: str


class Attachment(BaseModel):
    name: str
    content: str
    type: str


class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []
    attachments: List[Attachment] = []
    model: str = "gemini"
    sessionId: Optional[str] = None


class SettingsUpdate(BaseModel):
    key: str


# ---------------------------------------------------------------------------
# Helper: run an agent and return structured response
# ---------------------------------------------------------------------------
async def _run_agent(agent, messages: list, model_name: str) -> dict:
    """Run a single agent and return response dict."""
    result = await agent.ainvoke({"messages": messages})
    ai_msg = result["messages"][-1]
    raw_content = ai_msg.content
    
    if isinstance(raw_content, list):
        # Handle cases where content is a list of blocks (e.g. from some models)
        response_text = " ".join([
            block.get("text", str(block)) if isinstance(block, dict) else str(block)
            for block in raw_content
        ])
    else:
        response_text = str(raw_content)

    # Extract sources from legal_research tool calls
    sources = []
    for msg in result.get("messages", []):
        msg_name = getattr(msg, "name", None)
        msg_content = getattr(msg, "content", "")
        if msg_name == "legal_research" and isinstance(msg_content, str):
            found_sources = re.findall(r"--- ŹRÓDŁO: (.*?) ---", msg_content)
            sources.extend(found_sources)

    return {
        "id": str(time.time()),
        "role": "assistant",
        "content": response_text,
        "sources": sorted(set(sources)),
        "model": model_name,
    }


def _build_messages(request: ChatRequest) -> list[dict]:
    """Build message list from chat request."""
    messages: list[dict] = []

    for msg in request.history:
        role = "user" if msg.role in ("user", "human") else "assistant"
        messages.append({"role": role, "content": msg.content})

    if request.attachments:
        human_content: list[dict] = [{"type": "text", "text": request.message}]
        for att in request.attachments:
            if "image" in att.type.lower() or att.name.lower().endswith(
                (".png", ".jpg", ".jpeg")
            ):
                human_content.append(
                    {"type": "image_url", "image_url": att.content}
                )
        messages.append({"role": "user", "content": human_content})
    else:
        messages.append({"role": "user", "content": request.message})

    return messages


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@app.get("/health")
def health():
    return {
        "status": "online",
        "version": "4.1 Multi-Model",
        "agents": list(agents.keys()),
    }


@app.get("/models")
def list_models():
    """List available models and which are currently active."""
    result = []
    has_google = bool(os.getenv("GOOGLE_API_KEY"))
    has_or = bool(os.getenv("OPENROUTER_API_KEY"))
    
    for key, info in AVAILABLE_MODELS.items():
        # Determine if it can be activated
        can_activate = False
        if info["provider"] == "google" and has_google: can_activate = True
        if info["provider"] == "openrouter" and has_or: can_activate = True
            
        result.append({
            "id": key,
            "name": info["name"],
            "provider": info["provider"],
            "model_id": info["model_id"],
            "active": can_activate,
            "multimodal": info.get("multimodal", False),
        })
    # Add special aggregate models
    if len(agents) > 1:
        result.append({
            "id": "consensus",
            "name": "Konsensus (Synteza wszystkich modeli)",
            "provider": "system",
            "model_id": "multi-agent-consensus",
            "active": True,
            "multimodal": True,
        })
    return result


@app.post("/chat")
async def chat(request: ChatRequest):
    """Chat with a single model, or run consensus."""
    model_key = request.model
    messages = _build_messages(request)
    session_id = request.sessionId or "default"
    
    # Save user message (if not already handled or ensure it's here)
    database.save_message(str(time.time()), session_id, "user", request.message)

    if not agents:
        return {
            "role": "assistant",
            "content": "Błąd: Żaden agent nie został zainicjalizowany. Sprawdź klucze API.",
            "sources": [],
        }

    # --- CONSENSUS MODE ---
    if model_key == "consensus" and len(agents) > 1:
        # 1. Run all agents in parallel
        async def _safe_run(key: str, ag):
            try:
                return await _run_agent(ag, messages, key)
            except Exception as e:
                return {"error": str(e), "model": key}

        tasks = [_safe_run(key, ag) for key, ag in agents.items()]
        # Run all independently in parallel
        all_responses = await asyncio.gather(*tasks)

        # 2. Collect successful individual responses
        success_responses = [r for r in all_responses if isinstance(r, dict) and "error" not in r]
        all_sources = set()
        synthesis_input = ""
        
        for resp in success_responses:
            model_name = AVAILABLE_MODELS.get(resp["model"], {}).get("name", resp["model"])
            synthesis_input += f"=== Odpowiedź modelu {model_name} ===\n{resp['content']}\n\n"
            all_sources.update(resp.get("sources", []))

        if not success_responses:
            return {
                "role": "assistant",
                "content": "Błąd: Wszystkie modele AI zwróciły błąd lub wyczerpały swój limit (429). Nie można wygenerować syntezy.",
                "sources": [],
                "model": "consensus"
            }

        # 3. Build synthesis and select candidates
        synthesis_text = (
            "Przeanalizuj poniższe odpowiedzi wygenerowane przez różne modele AI na to samo zapytanie, "
            "a następnie stwórz jedną, ostateczną odpowiedź, która łączy najlepsze argumenty, "
            "eliminuje sprzeczności i stanowi najbardziej merytoryczne rozwiązanie problemu użytkownika:\n\n"
            f"{synthesis_input}"
        )
        
        synthesis_messages = messages.copy()
        synthesis_messages.append({"role": "user", "content": synthesis_text})

        # Synthesis loop: try primary (Gemini), then fallback to other successful agents
        primary_key = next(iter(agents))
        synthesis_candidates = [primary_key] + [r["model"] for r in success_responses if r["model"] != primary_key]
        # Unique preserve order
        synthesis_candidates = list(dict.fromkeys(synthesis_candidates))

        last_error = ""
        for candidate_key in synthesis_candidates:
            if candidate_key not in agents:
                continue
                
            try:
                final_result = await _run_agent(agents[candidate_key], synthesis_messages, "consensus")
                
                # Combine sources
                final_result["sources"] = sorted(set(final_result.get("sources", [])).union(all_sources))
                
                # Handle content formatting
                raw_content = final_result["content"]
                if isinstance(raw_content, list):
                    text_content = " ".join([block.get("text", str(block)) if isinstance(block, dict) else str(block) for block in raw_content])
                else:
                    text_content = str(raw_content)

                final_result["content"] = f"**[Konsensus {len(success_responses)} Modeli AI]**\n\n" + text_content
                
                # Save to DB
                database.save_message(str(time.time()), "user", request.message)
                database.save_message(final_result["id"], "assistant", final_result["content"], ",".join(final_result["sources"]))
                
                return final_result
            except Exception as e:
                # If it's a 429 or other error, try the next candidate
                last_error = str(e)
                print(f"⚠️ Synthesis failed for {candidate_key}: {e}. Trying next...")
                continue

        # If we reach here, all synthesis attempts failed
        fallback_msg = success_responses[0]["content"]
        result = {
            "id": str(time.time()),
            "role": "assistant",
            "content": f"**[Błąd Syntezy - Wyświetlam jedną z odpowiedzi]**\n\nUwaga: Próba syntezy nie powiodła się ({last_error}), ale udało się uzyskać odpowiedź od jednego z modeli:\n\n{fallback_msg}",
            "sources": sorted(all_sources),
            "model": "consensus_fallback",
        }
        database.save_message(result["id"], session_id, "assistant", result["content"], ",".join(result["sources"]))
        return result

    # --- SINGLE MODEL MODE ---
    if model_key not in agents:
        # Try to lazy-load it
        success = _lazy_init_agent(model_key)
        if not success:
            model_key = next(iter(agents))

    try:
        final_result = await _run_agent(agents[model_key], messages, model_key)
        # Save to DB
        database.save_message(final_result["id"], session_id, "assistant", final_result["content"], ",".join(final_result["sources"]))
        return final_result
    except Exception as e:
        print(f"Agent [{model_key}] Error: {e}")
        import traceback
        traceback.print_exc()
        return {
            "id": str(time.time()),
            "role": "assistant",
            "content": f"SYSTEM_ERROR [{model_key}]: {str(e)}",
            "sources": [],
            "model": model_key,
        }


@app.post("/chat/compare")
async def chat_compare(request: ChatRequest):
    """Send the same message to ALL active agents and return both responses for comparison."""
    if not agents:
        return {
            "error": "Brak aktywnych agentów.",
            "responses": [],
        }

    messages = _build_messages(request)

    async def _safe_run(key: str, ag):
        try:
            return await _run_agent(ag, messages, key)
        except Exception as e:
            return {
                "id": str(time.time()),
                "role": "assistant",
                "content": f"BŁĄD [{key}]: {str(e)}",
                "sources": [],
                "model": key,
            }

    # Run all agents in parallel
    tasks = [_safe_run(key, ag) for key, ag in agents.items()]
    responses = await asyncio.gather(*tasks)

    return {"responses": list(responses)}


# ---------------------------------------------------------------------------
# Documents & Settings endpoints (unchanged)
# ---------------------------------------------------------------------------
@app.get("/documents")
async def list_documents():
    docs = []
    pdf_files = list(PDF_DIR.glob("*.pdf")) + list(Path(".").glob("*.pdf"))
    unique_pdfs = {f.name: f for f in pdf_files}.values()

    for idx, f in enumerate(unique_pdfs):
        docs.append({
            "id": str(idx + 1),
            "name": f.name,
            "size": f"{os.path.getsize(f) / (1024*1024):.2f}MB",
            "status": "ready",
            "date": time.strftime("%Y-%m-%d", time.gmtime(os.path.getmtime(f))),
        })
    return docs


@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    global vector_store
    target_path = PDF_DIR / file.filename
    with open(target_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    build_index()
    vector_store = load_index()
    return {"status": "success", "filename": file.filename}


@app.delete("/documents/{name}")
async def delete_document(name: str):
    global vector_store
    target_path = PDF_DIR / name
    if not target_path.exists():
        target_path = Path(".") / name
    if target_path.exists():
        os.remove(target_path)
    build_index()
    vector_store = load_index()
    return {"status": "success"}


@app.get("/settings")
async def get_settings():
    keys = {
        "google_api_key": os.getenv("GOOGLE_API_KEY", ""),
        "openrouter_api_key": os.getenv("OPENROUTER_API_KEY", ""),
    }
    return keys


@app.get("/settings/prompt")
async def get_prompt():
    return {"prompt": database.get_setting("system_prompt")}


@app.post("/settings/prompt")
async def update_prompt(update: dict):
    try:
        prompt = update.get("prompt", "")
        database.set_setting("system_prompt", prompt)
        
        # CRITICAL: Re-initialize agents so they use the new prompt!
        await init_agents()
        
        return {"status": "success"}
    except Exception as e:
        print(f"Error updating prompt: {e}")
        import traceback
        traceback.print_exc()
        return {"status": "error", "message": str(e)}


class ApiKeyUpdate(BaseModel):
    provider: str  # e.g., "google" or "openrouter"
    key: str

@app.post("/settings/api-key")
async def update_api_key(update: ApiKeyUpdate):
    env_path = Path(".env")
    lines = []
    if env_path.exists():
        with open(env_path, "r", encoding="utf-8") as f:
            lines = f.readlines()

    env_var_name = f"{update.provider.upper()}_API_KEY"

    found = False
    new_lines = []
    for line in lines:
        if line.startswith(f"{env_var_name}="):
            new_lines.append(f"{env_var_name}={update.key}\n")
            found = True
        else:
            new_lines.append(line)

    if not found:
        new_lines.append(f"{env_var_name}={update.key}\n")

    with open(env_path, "w", encoding="utf-8") as f:
        f.writelines(new_lines)

    load_dotenv(override=True)
    
    # Re-initialize agents with the new keys
    await init_agents()
    
    return {"status": "success", "active_agents": list(agents.keys())}


@app.get("/sessions")
async def get_sessions(limit: int = 50):
    return database.get_sessions(limit)


@app.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    database.delete_session(session_id)
    return {"status": "success"}


@app.get("/messages")
async def get_messages(sessionId: Optional[str] = None, limit: int = 100):
    return database.get_messages(sessionId, limit)


@app.delete("/messages")
async def clear_messages(sessionId: Optional[str] = None):
    if sessionId:
        database.delete_session(sessionId)
    else:
        # Fallback to clear all if no ID
        database.clear_messages()
    return {"status": "success"}


if __name__ == "__main__":
    import uvicorn  # type: ignore
    uvicorn.run(app, host="0.0.0.0", port=8001)

# LexMind AI — Copilot Instructions

You are working on **LexMind AI**, an intelligent legal assistant built for Kancelaria Pałka & Kaźmierczak. This document provides essential context for developing, debugging, and extending the system.

## 🎯 Project Overview

**LexMind AI** is a multi-model legal reasoning system combining:
- **Orchestrator v2**: Advanced multi-stage reasoning pipeline with Debate Engine and Synthesis Engine
- **RAG (Retrieval-Augmented Generation)**: Vector-based search over Polish legal documents
- **Multi-Model Consensus**: Simultaneous reasoning with Gemini, GPT-4o, Claude, Llama
- **MCP Tools**: Mathematical calculator, weather, legal document search
- **Real-time Thought Visualization**: Quick Intelligence Panel shows reasoning step-by-step

## 🏗️ Architecture

```
Frontend (React/TypeScript/Vite)
    ↓ HTTP/WebSocket
Backend (FastAPI)
    ├─ Orchestrator v2 (Debate & Synthesis)
    ├─ LLM Adapters (Gemini, GPT-4o, Claude, Llama)
    ├─ MCP Server (tools)
    └─ RAG Engine (FAISS vector store)
         ↓
Supabase (Auth, Sessions, Documents)
         ↓
Polish Legal Knowledge Base (PDFs, embeddings)
```

## 📁 Key Folders

| Folder | Purpose |
|--------|---------|
| `application/` | Backend application code (chat, documents, retrieval) |
| `domain/` | Domain models, prompts (system prompts for AI) |
| `frontend/` | React/TypeScript web UI (Vite, Tailwind) |
| `services/` | Utility services (LLM integration, RAG, MCP) |
| `routes/` | FastAPI route handlers |
| `schemas/` | Pydantic data models |
| `prompts/` | System prompts, expert roles (13 task types taxonomy) |
| `moa/` | Mixture of Agents reasoning module |
| `supabase/` | Database setup, migrations |
| `lexmind_acts/` | Polish legal acts knowledge base |
| `mobile_apps/` | Capacitor-based mobile apps (iOS/Android) |

## 🛠️ Tech Stack

**Backend:**
- FastAPI (Python 3.11+)
- Pydantic (data validation)
- OpenRouter (LLM aggregation)
- FAISS (vector search)
- Supabase (PostgreSQL + Auth + Edge Functions)

**Frontend:**
- React 19+ (TypeScript)
- Vite (build tool)
- Tailwind CSS (styling)
- Capacitor (mobile)

**Data:**
- FAISS vector store (embeddings_1536d.json)
- PostgreSQL (Supabase)
- PDF documents (Polish legal texts)

## 📝 Code Conventions

### Python (Backend)

- **Naming**: snake_case for functions/variables, CamelCase for classes
- **Type hints**: Always use—Pydantic models for API contracts
- **Async**: Use async/await for I/O operations (LLM calls, DB queries)
- **Error handling**: Raise HTTP exceptions with clear status codes
- **Environment**: Use `config.py` for centralized settings (load from `.env`)
- **Logging**: Use Python's standard `logging` module

Example:
```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

class ChatRequest(BaseModel):
    message: str
    model: str

@app.post("/chat")
async def chat(req: ChatRequest):
    # Implementation
    return {"response": "..."}
```

### TypeScript/React (Frontend)

- **Naming**: camelCase for variables/functions, PascalCase for components
- **Components**: Functional components with hooks
- **Styling**: Tailwind CSS classes, no inline styles
- **Type safety**: Strict tsconfig settings, no `any` types
- **Imports**: Absolute imports (configured in `tsconfig.json`)

Example:
```typescript
interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export function ChatPanel({ messages }: { messages: ChatMessage[] }) {
  return <div className="flex flex-col gap-4">{/* ... */}</div>;
}
```

## 🧠 How Orchestrator v2 Works

1. **Input**: User query arrives at FastAPI endpoint
2. **Debate Stage**: Query routed to multiple LLMs simultaneously (Gemini, GPT-4o, Claude, Llama)
3. **Reasoning**: Each LLM generates independent reasoning chain
4. **Consensus**: DebateEngine compares responses, identifies agreement/disagreement
5. **Synthesis**: SynthesisEngine combines best parts into final answer
6. **Output**: Result sent to frontend with reasoning trail (visible in Quick Intelligence Panel)

**Key files:**
- `services/orchestrator/` — Main orchestration logic
- `services/debate_engine.py` — Comparison and consensus
- `services/synthesis_engine.py` — Answer synthesis
- `domain/prompts/` — System prompts for each expert role

## 📚 RAG System

The RAG engine searches Polish legal documents using FAISS vector store:

1. **Indexing**: Legal documents → OpenRouter embeddings → FAISS index (embeddings_1536d.json)
2. **Query**: User query → embedding → top-K document retrieval
3. **Context**: Retrieved documents passed to LLM as system context
4. **Synthesis**: LLM generates answer grounded in retrieved documents

**Key files:**
- `application/retrieval/` — RAG pipeline
- `services/vector_store.py` — FAISS wrapper
- `embeddings_1536d.json` — Pre-computed embeddings (do not edit by hand)

## 🔧 MCP Tools

Three MCP tools available to the AI:
- **Calculator**: `mcp.calculator(expression)` — math evaluation
- **Weather**: `mcp.weather(city)` — weather lookup
- **Legal Search**: `mcp.legal_search(query)` — search legal knowledge base

**Integration point:** `services/mcp_adapter.py`

## ⚙️ Configuration

Configuration is centralized in `config.py`. Key variables:

```python
# .env or config.py
OPENROUTER_API_KEY=...  # Multi-model LLM access
SUPABASE_URL=...
SUPABASE_KEY=...
FAISS_INDEX_PATH=./embeddings_1536d.json
MODEL_CACHE_PATH=./models_cache.json
```

Environment-specific settings:
- **Development**: Use `.env.local`
- **Production**: Use Supabase environment variables
- **Testing**: Use mock credentials in test files

## 🚀 Development Workflow

### Backend

1. **Setup**: `pip install -r requirements.txt`
2. **Run**: `python api.py` (starts FastAPI on port 8000)
3. **Debug**: Add breakpoints; inspect logs in console
4. **Test**: `python -m pytest tests/`

### Frontend

1. **Setup**: `npm install` (from `frontend/` folder)
2. **Dev**: `npm run dev` (Vite dev server on localhost:5173)
3. **Build**: `npm run build`
4. **Type check**: `npx tsc --noEmit`

### Database

- Use Supabase Studio for schema inspection
- Migrations stored in `supabase/migrations/`
- Run migrations: `supabase db reset` (development only)

## 📋 Common Tasks

### Adding a New LLM Model

1. Register model in `config.py` (OpenRouter model ID)
2. Update `services/llm_adapter.py` to handle model-specific parameters
3. Add model to orchestrator routing logic
4. Update frontend UI to include new option

### Extending RAG Knowledge Base

1. Add PDF to `lexmind_acts/` or `pdfs/` folder
2. Run indexing: `python scripts/index_documents.py`
3. Regenerate `embeddings_1536d.json`
4. Commit updated embeddings file

### Debugging a Chat Response

1. Open Quick Intelligence Panel in frontend
2. Check reasoning trail (Debate Engine outputs)
3. Inspect LLM inputs in backend logs
4. Verify RAG context in `DEBUG=1 python api.py`
5. Test query isolation (single LLM vs multi-model)

## 📌 Important Files

- **`README.md`** — Project overview (you are here)
- **`config.py`** — Centralized configuration
- **`requirements.txt`** — Python dependencies
- **`api.py`** — FastAPI application entry point
- **`frontend/package.json`** — JavaScript dependencies
- **`.github/copilot-instructions.md`** — This file

## ⚠️ Known Pitfalls

1. **Embeddings cache** — `embeddings_1536d.json` is large (~500MB). Don't commit unnecessary regenerations.
2. **OpenRouter rate limits** — Watch API usage; implement backoff for rate-limited requests.
3. **FAISS index staleness** — If documents are added but index not regenerated, RAG will miss new content.
4. **Supabase auth** — Tokens expire; refresh logic must be in frontend.
5. **Model response variability** — Different LLMs may disagree; Debate Engine reconciles but consensus is not guaranteed.

## 🔗 Useful Links

- [OpenRouter Documentation](https://openrouter.ai/docs)
- [Supabase Docs](https://supabase.com/docs)
- [FastAPI Docs](https://fastapi.tiangolo.com)
- [React Docs](https://react.dev)
- [FAISS Documentation](https://github.com/facebookresearch/faiss)

---

**Last updated:** 2026-07-17  
**Project:** LexMind AI v4.1  
**Platform:** Windows, macOS, Android, iOS, Web

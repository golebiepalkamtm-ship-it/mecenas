import streamlit as st  # type: ignore
import os, time
import requests  # type: ignore
from dotenv import load_dotenv  # type: ignore

# Force load latest environment variables
load_dotenv(override=True)

# ─── INSTANT BOOT SYSTEM ──────────────────────────────────────────────
st.set_page_config(page_title="Asesor AI 3.1 Ultra", page_icon="⚖️", layout="wide", initial_sidebar_state="collapsed")

if "booted" not in st.session_state:
    st.markdown("""
    <style>
    body { background: #030407 !important; overflow: hidden !important; }
    .boot-wrap { position: fixed; inset: 0; background: #030407; z-index: 999999; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .loader-bar { width: 300px; height: 1px; background: #111; margin-top: 40px; position: relative; overflow: hidden; }
    .loader-fill { position: absolute; height: 100%; width: 50%; background: #00f2ff; box-shadow: 0 0 15px #00f2ff; animation: flow 2s infinite linear; }
    @keyframes flow { from { left: -50%; } to { left: 100%; } }
    .logo { font-weight: 800; letter-spacing: 10px; color: white; font-size: 16px; opacity: 0.9; font-family: 'Plus Jakarta Sans', sans-serif; }
    </style>
    <div class="boot-wrap">
        <div class="logo">ASESOR AI 3.1</div>
        <div class="loader-bar"><div class="loader-fill"></div></div>
        <div style="margin-top:20px; font-size:9px; color:#475569; letter-spacing:3px;">SYSTEM READY _ LINKING CORE</div>
    </div>
    """, unsafe_allow_html=True)
    time.sleep(1.2)
    st.session_state.booted = True
    st.rerun()

# ─── CORE IMPORTS ───
from build_index import build_index, load_index, CHUNKS_PATH, FAISS_INDEX_PATH  # type: ignore
from langchain_google_genai import ChatGoogleGenerativeAI  # type: ignore
from langchain_core.prompts import ChatPromptTemplate  # type: ignore
from langchain_core.messages import HumanMessage, AIMessage  # type: ignore

# ─── DESIGN SYSTEM (OBSIDIAN ELITE) ───────────────────────────────────
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;600;800&display=swap');
:root { --bg: #030407; --border: rgba(255,255,255,0.08); --accent: #00f2ff; --violet: #bc13fe; }

[data-testid="stStatusWidget"], [data-testid="stHeader"], footer, #MainMenu { display: none !important; }
.stApp { background: var(--bg) !important; color: white !important; font-family: 'Plus Jakarta Sans', sans-serif !important; }
.stMainBlockContainer { padding: 0 !important; }

/* Custom Chat Style */
.stChatMessage { background: rgba(10,12,18,0.6) !important; border: 1px solid var(--border) !important; border-radius: 12px !important; margin-bottom: 2rem !important; padding: 2rem !important; }
.stChatMessage.user { border-left: 3px solid var(--violet) !important; }
.stChatMessage.user .stMarkdown { color: black !important; }
.stChatMessage.assistant { border-left: 3px solid var(--accent) !important; }

/* Chat Input Styling */
.stChatInput input { color: black !important; background-color: white !important; }
</style>
""", unsafe_allow_html=True)

if "messages" not in st.session_state: st.session_state.messages = []
if "running" not in st.session_state: st.session_state.running = False

# ─── AI ENGINE INITIALIZATION (Stateless Config) ───
# We initialize every rerun to ensure latest .env and model config are used
try:
    api_key = os.getenv("GOOGLE_API_KEY")
    # ALWAYS re-init LLM object to avoid being trapped in session_state with old model/key
    llm = ChatGoogleGenerativeAI(model="models/gemini-2.5-flash", temperature=0.7, api_key=api_key)
except Exception as e:
    st.error(f"ENGINE_ERROR: {e}")
    st.stop()

# ─── SIDEBAR ──────────────────────────────────────────────────────────
with st.sidebar:
    st.markdown('<div style="padding:40px 0;"><div style="font-size:18px; font-weight:800; color:#00f2ff; letter-spacing:5px;">ASESOR AI</div><div style="font-size:9px; color:#475569; letter-spacing:2px; margin-top:5px;">v3.1 ULTRA CORE</div></div>', unsafe_allow_html=True)
    st.divider()
    st.markdown('<div style="font-size:10px; color:#475569; margin-bottom:10px;">AKTYWNA BAZA WIEDZY:</div>', unsafe_allow_html=True)
    st.markdown('<div style="font-size:11px; color:#00ffaa;">✓ SYSTEM READY FOR QUERIES</div>', unsafe_allow_html=True)

# ─── MAIN UI ──────────────────────────────────────────────────────────
st.markdown('<div style="height:100px; display:flex; align-items:center; padding:0 5%; border-bottom:1px solid var(--border); font-size:9px; font-weight:800; color:#475569; letter-spacing:5px;">SYSTEM_OUTPUT_NODE [01] // ENCRYPTED_CONNECTION</div>', unsafe_allow_html=True)

# Display history
container = st.container()
with container:
    st.markdown('<div style="padding: 50px 5%;">', unsafe_allow_html=True)
    for m in st.session_state.messages:
        role = "user" if isinstance(m, HumanMessage) else "assistant"
        with st.chat_message(role):
            # Safe access to content
            content = getattr(m, "content", str(m))
            st.markdown(content)
            
            # Show sources if available
            if role == "assistant":
                add_kwargs = getattr(m, "additional_kwargs", {})
                sources = add_kwargs.get("sources", [])
                if sources:
                    st.markdown("---")
                    st.markdown("**ŹRÓDŁA:**")
                    cols = st.columns(len(sources))
                    for i, s in enumerate(sources):
                        cols[i].markdown(f"`📄 {s}`")
    st.markdown('</div>', unsafe_allow_html=True)

# Input Dock
q = st.chat_input("Zadaj pytanie dotyczące Twoich dokumentów...")
if q:
    st.session_state.messages.append(HumanMessage(content=q))
    st.session_state.running = True
    st.rerun()

# Processing Logic
if st.session_state.running:
    with st.status("🔗 Przetwarzanie zapytania...", expanded=True) as status:
        try:
            user_msg = st.session_state.messages[-1].content
            
            # 1. Retrieval
            status.update(label="📄 Przeszukiwanie bazy wiedzy (Supabase)...", state="running")
            API_KEY = os.getenv("OPENROUTER_API_KEY")
            
            # Obtain embeddings
            url_emb = "https://openrouter.ai/api/v1/embeddings"
            headers = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}
            payload = {"model": "openai/text-embedding-3-large", "input": [user_msg]}
            res_emb = requests.post(url_emb, json=payload, headers=headers, timeout=20)
            res_emb.raise_for_status()
            embedding = res_emb.json()["data"][0]["embedding"]

            # Query Supabase
            supabase_func_url = "https://dhyvxspgsktpbjonejek.supabase.co/functions/v1/import-knowledge"
            query_payload = {
                "action": "query",
                "query_embedding": embedding,
                "match_threshold": 0.3,
                "match_count": 5
            }
            res_db = requests.post(supabase_func_url, json=query_payload, timeout=20)
            res_db.raise_for_status()
            docs = res_db.json().get("data", [])
            
            raw_sources = [d.get("metadata", {}).get("filename", "Nieznany") for d in docs]
            unique_sources = sorted(list(set(raw_sources)))
            src_list = unique_sources[:3]
            context_text = "\n\n".join([d.get("content", "") for d in docs])
            
            # 2. Reasoning
            status.update(label="🧠 Generowanie odpowiedzi prawnej...", state="running")
            template = "Jesteś ekspertem prawnym. Odpowiadaj profesjonalnie na podstawie kontekstu.\nKontekst: {context}\nPytanie: {question}\nOdpowiedź:"
            prompt = ChatPromptTemplate.from_template(template)
            
            # Direct invocation instead of pipe to avoid LCEL-related 429/404 ghosting
            formatted_prompt = prompt.format(context=context_text, question=user_msg)
            response = llm.invoke(formatted_prompt)
            
            st.session_state.messages.append(AIMessage(content=response.content, additional_kwargs={"sources": src_list}))
            status.update(label="✅ Gotowe!", state="complete", expanded=False)
        except Exception as e:
            st.session_state.messages.append(AIMessage(content=f"CORE_FAULT: {e}"))
            status.update(label="❌ Błąd systemowy", state="error")
            
    st.session_state.running = False
    st.rerun()

from langchain_core.embeddings import Embeddings
import pickle
from pathlib import Path
from dotenv import load_dotenv
import fitz
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document
from sentence_transformers import SentenceTransformer
from typing import List
import numpy as np

load_dotenv()

EMBEDDINGS_MODEL = "sentence-transformers/all-MiniLM-L6-v2"

# ─── GLOBAL MODEL CACHE (process-level, survives Streamlit reruns) ────
_model_cache: SentenceTransformer | None = None

def _get_model() -> SentenceTransformer:
    """Get or create cached SentenceTransformer model."""
    global _model_cache
    if _model_cache is None:
        _model_cache = SentenceTransformer(EMBEDDINGS_MODEL)
    return _model_cache


class LocalEmbeddings(Embeddings):
    """Wrapper for sentence-transformers to work with LangChain."""
    
    def __init__(self, model_name: str = EMBEDDINGS_MODEL):
        self.model = _get_model()  # Use cached model
        self.model_name = model_name
    
    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        embeddings = self.model.encode(texts, convert_to_numpy=True)
        return embeddings.tolist()
    
    def embed_query(self, text: str) -> List[float]:
        embedding = self.model.encode([text], convert_to_numpy=True)
        return embedding[0].tolist()


def get_embeddings():
    return LocalEmbeddings(EMBEDDINGS_MODEL)


CACHE_DIR = Path("cache")
PDF_DIR = Path("pdfs")
CHUNKS_PATH = CACHE_DIR / "all_chunks.pkl"
FAISS_INDEX_PATH = CACHE_DIR / "faiss_index_store"


def extract_chunks_from_pdfs(progress_cb=None) -> List[Document]:
    if CHUNKS_PATH.exists():
        try:
            with open(CHUNKS_PATH, "rb") as f:
                data = pickle.load(f)
                if isinstance(data, list):
                    return data
        except Exception:
            pass
    
    pdf_files = list(PDF_DIR.glob("*.pdf")) + list(Path(".").glob("*.pdf"))
    if not pdf_files:
        return []
    
    all_chunks: List[Document] = []
    splitter = RecursiveCharacterTextSplitter(chunk_size=1500, chunk_overlap=300)
    unique_pdfs = list(set(pdf_files))
    
    for idx, pdf_path in enumerate(unique_pdfs):
        if progress_cb:
            progress_cb(f"Przetwarzanie: {pdf_path.name}", (idx + 1) / len(unique_pdfs) * 0.5)
        try:
            doc = fitz.open(str(pdf_path))
            text = "".join([page.get_text() for page in doc])  # type: ignore
            doc.close()
            chunks = splitter.create_documents([text], metadatas=[{"source": pdf_path.name}])
            all_chunks.extend(chunks)
        except Exception as e:
            pass
    
    if all_chunks:
        CACHE_DIR.mkdir(exist_ok=True)
        with open(CHUNKS_PATH, "wb") as f:
            pickle.dump(all_chunks, f)
    return all_chunks


def build_index(progress_cb=None):
    """Build FAISS index with optional progress callback."""
    try:
        if progress_cb:
            progress_cb("Ładowanie modelu AI...", 0.1)
        emb = get_embeddings()
    except Exception as e:
        return
    
    if progress_cb:
        progress_cb("Ekstrakcja tekstu z PDF...", 0.2)
    
    chunks_raw = extract_chunks_from_pdfs(progress_cb)
    if not chunks_raw:
        return
    
    texts = [doc.page_content for doc in chunks_raw]
    metadatas = [doc.metadata for doc in chunks_raw]
    
    if progress_cb:
        progress_cb(f"Tworzenie indeksu FAISS ({len(texts)} fragmentów)...", 0.75)
    
    CACHE_DIR.mkdir(exist_ok=True)
    vs = FAISS.from_texts(texts, emb, metadatas=metadatas)
    vs.save_local(str(FAISS_INDEX_PATH))
    
    if progress_cb:
        progress_cb("Indeks zbudowany!", 1.0)


def load_index(progress_cb=None):
    """Load existing FAISS index with optional progress callback."""
    if not FAISS_INDEX_PATH.exists():
        return None
    
    try:
        if progress_cb:
            progress_cb("Ładowanie modelu embeddings...", 0.3)
        emb = get_embeddings()
        
        if progress_cb:
            progress_cb("Wczytywanie indeksu FAISS...", 0.6)
        vs = FAISS.load_local(str(FAISS_INDEX_PATH), emb, allow_dangerous_deserialization=False)
        
        if progress_cb:
            progress_cb("Gotowe!", 1.0)
        return vs
    except Exception as e:
        return None


if __name__ == "__main__":
    build_index()

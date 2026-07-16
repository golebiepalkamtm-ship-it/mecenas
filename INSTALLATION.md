# LexMind AI - Installation Guide

Quick setup guide for different installation profiles.

## Quick Start (Linux/Mac)

```bash
bash scripts/setup.sh
```

## Quick Start (Windows)

```cmd
scripts\setup.bat
```

## Manual Setup

### 1. Prerequisites

- **Python 3.8+** ([download](https://www.python.org/downloads/))
- **Node.js 18+** (for frontend, [download](https://nodejs.org/))
- **Git**

### 2. Clone & Setup Environment

```bash
# Clone repository
git clone <repo-url>
cd "moj prawnik"

# Create virtual environment
python -m venv .venv

# Activate venv
# Linux/Mac:
source .venv/bin/activate
# Windows:
.venv\Scripts\activate

# Copy environment file
cp .env.example .env
# Windows:
copy .env.example .env
```

### 3. Edit `.env`

Edit `.env` and add your API keys:

```env
OPENROUTER_API_KEY=sk-or-your-key-here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

See `docs/ENVIRONMENT_CONFIGURATION.md` for all available variables.

### 4. Install & Run (Choose One Profile)

#### CORE Profile (Minimal)

```bash
# Install dependencies
pip install -r requirements-core.txt

# Start backend
python api.py
# Runs on http://127.0.0.1:8003
```

#### OCR Profile (with Vision/Document Processing)

```bash
# Install dependencies
pip install -r requirements-core.txt -r requirements-ocr.txt

# If you have CUDA GPU:
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

# Start backend
python api.py
```

#### DEV Profile (Development/Contributing)

```bash
# Install dependencies
pip install -r requirements-core.txt -r requirements-ocr.txt -r requirements-dev.txt

# Run tests
pytest tests/ -v

# Start backend
python api.py

# Code quality checks
black . --check
ruff check .
mypy .
```

### 5. Frontend (Separate Terminal)

```bash
cd frontend

# Install dependencies
npm install

# Copy environment
cp .env.example .env

# Start dev server
npm run dev
# Runs on http://localhost:3000

# Build for production
npm run build
```

## Profiles Comparison

| Feature | CORE | OCR | DEV |
|---------|------|-----|-----|
| FastAPI backend | ✓ | ✓ | ✓ |
| LLM orchestration | ✓ | ✓ | ✓ |
| Vector embeddings | ✓ | ✓ | ✓ |
| Document parsing (PDF, DOCX) | ✓ | ✓ | ✓ |
| **PyTorch** | — | ✓ | ✓ |
| **PaddleOCR** | — | ✓ | ✓ |
| **Vision models** | — | ✓ | ✓ |
| **Testing (pytest)** | — | — | ✓ |
| **Code quality (black, ruff, mypy)** | — | — | ✓ |
| **Debugging (ipdb, IPython)** | — | — | ✓ |

## Troubleshooting

### Problem: `ModuleNotFoundError: No module named 'langchain'`

**Solution:** Make sure you've activated the virtual environment and installed dependencies:

```bash
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r requirements-core.txt
```

### Problem: `MISSING REQUIRED: OPENROUTER_API_KEY`

**Solution:** Add your API key to `.env`:

```
OPENROUTER_API_KEY=sk-or-...
```

Get a key from https://openrouter.ai/keys

### Problem: `Port 8003 already in use`

**Solution:** Kill the existing process or use a different port:

```bash
# Start on port 8004 instead
uvicorn api:app --host 127.0.0.1 --port 8004
```

### Problem: Frontend can't connect to backend

**Solution:** Check `frontend/.env` has correct `VITE_API_URL`:

```
VITE_API_URL=http://127.0.0.1:8003
```

### Problem: `ImportError: No module named 'paddleocr'`

**Solution:** You need the OCR profile:

```bash
pip install -r requirements-ocr.txt
```

### Problem: GPU not detected (PyTorch)

**Solution:** Install CUDA version of PyTorch:

```bash
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
```

(Change `cu118` to your CUDA version)

## Configuration & Customization

### Environment Variables

See `docs/ENVIRONMENT_CONFIGURATION.md` for all variables:

- `LEXMIND_*` — Application settings (Feature Flags, limits)
- `SUPABASE_*` — Cloud database integration
- `OPENROUTER_API_KEY` — LLM provider
- `GOOGLE_API_KEY`, `COHERE_API_KEY` — Additional integrations

### Validate Configuration

```bash
python -c "from services.config_validator import ConfigValidator; ConfigValidator.print_quick_reference()"
```

## Development Workflow

### Running Tests

```bash
# Activate DEV profile first
pip install -r requirements-dev.txt

# Run all tests
pytest tests/ -v

# Run specific test
pytest tests/test_chat.py::test_sse_stream -v

# Run with coverage
pytest --cov=. tests/
```

### Code Quality

```bash
# Format code
black .

# Check formatting
black . --check

# Linting
ruff check .
pylint .

# Type checking
mypy .
```

### Debugging

```bash
# Debug a test
pytest tests/test_chat.py -v -s --pdb

# Python REPL with project context
ipython

# With debugger
python -m ipdb api.py
```

## Deployment

For production deployment:

1. Use `requirements-core.txt` (no dev dependencies)
2. Set environment variables via secret manager (not `.env`)
3. Enable HTTPS and proper authentication
4. Use production database (Supabase recommended)
5. See `docs/ENVIRONMENT_CONFIGURATION.md` for security best practices

## Next Steps

- **Read:** `docs/ENVIRONMENT_CONFIGURATION.md`
- **Code:** Start in `api.py` (FastAPI entry point)
- **Backend:** See `routes/` and `services/` directories
- **Frontend:** See `frontend/src/` directory
- **Tests:** See `tests/` directory

## Need Help?

- Check error messages carefully (they include solutions)
- See `docs/ENVIRONMENT_CONFIGURATION.md` for detailed config
- Look at `.env.example` for all available variables
- Run `python -c "from services.config_validator import ConfigValidator; ConfigValidator.print_quick_reference()"`

---

**Happy coding! 🚀**

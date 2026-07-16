#!/bin/bash
# LexMind AI - Setup Helper Script
# Helps setup the project for different installation profiles

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo -e "\n${BLUE}================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

cd "$PROJECT_ROOT"

print_header "LexMind AI - Setup Helper"

# Check Python
if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
    print_error "Python not found. Please install Python 3.8+"
    exit 1
fi

PYTHON_CMD=$(command -v python3 || command -v python)
print_success "Found Python: $PYTHON_CMD"

# Check if venv exists
if [ ! -d ".venv" ]; then
    print_warning "Virtual environment not found. Creating..."
    $PYTHON_CMD -m venv .venv
    print_success "Virtual environment created"
fi

# Activate venv
if [ -f ".venv/bin/activate" ]; then
    source .venv/bin/activate
    print_success "Virtual environment activated"
fi

# Check .env
if [ ! -f ".env" ]; then
    print_warning ".env not found. Creating from .env.example..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_success ".env created"
        print_warning "Please edit .env and add your API keys!"
    else
        print_error ".env.example not found"
        exit 1
    fi
else
    print_success ".env exists"
fi

# Menu
echo -e "\n${BLUE}Select Installation Profile:${NC}\n"
echo "1) CORE   - Minimal setup (LexMind + FastAPI)"
echo "2) OCR    - Core + OCR capabilities (torch, paddleocr)"
echo "3) DEV    - OCR + Development tools (pytest, linters)"
echo "4) VALIDATE - Only validate configuration"
echo ""
read -p "Choose [1-4]: " CHOICE

case $CHOICE in
    1)
        print_header "Installing CORE Profile"
        pip install --upgrade pip
        pip install -r requirements-core.txt
        print_success "CORE profile installed"
        print_header "Next Steps"
        echo -e "Edit .env with your API keys, then:"
        echo -e "  ${BLUE}python api.py${NC}"
        ;;
    2)
        print_header "Installing OCR Profile"
        pip install --upgrade pip
        pip install -r requirements-core.txt -r requirements-ocr.txt
        print_success "OCR profile installed"
        print_warning "Note: PyTorch CPU version installed. For GPU:"
        echo -e "  ${YELLOW}pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118${NC}"
        print_header "Next Steps"
        echo -e "Edit .env with your API keys, then:"
        echo -e "  ${BLUE}python api.py${NC}"
        ;;
    3)
        print_header "Installing DEV Profile"
        pip install --upgrade pip
        pip install -r requirements-core.txt -r requirements-ocr.txt -r requirements-dev.txt
        print_success "DEV profile installed"
        print_header "Next Steps"
        echo -e "Run tests:"
        echo -e "  ${BLUE}pytest tests/ -v${NC}"
        echo -e "\nStart backend:"
        echo -e "  ${BLUE}python api.py${NC}"
        ;;
    4)
        print_header "Validating Configuration"
        python -c "
from services.config_validator import ConfigValidator
validator = ConfigValidator(profile='core')
is_valid, errors, warnings = validator.validate_all()
validator.print_report(verbose=True)
"
        ;;
    *)
        print_error "Invalid choice"
        exit 1
        ;;
esac

echo ""

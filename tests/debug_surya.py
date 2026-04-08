import sys
import os
import subprocess
import importlib.util

def check_package(package_name):
    spec = importlib.util.find_spec(package_name)
    if spec is None:
        return False, "Not found"
    try:
        importlib.import_module(package_name)
        return True, "Imported successfully"
    except Exception as e:
        return False, str(e)

def get_pip_version(package_name):
    try:
        result = subprocess.run([sys.executable, "-m", "pip", "show", package_name], capture_output=True, text=True)
        if result.returncode == 0:
            for line in result.stdout.splitlines():
                if line.startswith("Version:"):
                    return line.split(":")[1].strip()
        return "Not found in pip"
    except:
        return "Error checking pip"

print("=== Surya OCR Diagnostic Script ===")
print(f"Python Executable: {sys.executable}")
print(f"Python Version: {sys.version}")
print("-" * 30)

packages_to_check = [
    "surya",
    "transformers",
    "torch",
    "PIL",
    "numpy",
]

for pkg in packages_to_check:
    print(f"Checking package: {pkg}")
    pip_ver = get_pip_version(pkg)
    can_import, msg = check_package(pkg)
    status = "✅" if can_import else "❌"
    print(f"  - Pip Version: {pip_ver}")
    print(f"  - Import Status: {status} {msg}")
    print("-" * 10)

print("\nDetailed Surya Import Test:")
try:
    from surya.models import load_predictors
    print("✅ Successfully imported load_predictors from surya.models")
except Exception as e:
    print(f"❌ Failed to import from surya.models: {e}")
    import traceback
    traceback.print_exc()

print("\nChecking for CUDA:")
try:
    import torch
    print(f"  - Torch version: {torch.__version__}")
    print(f"  - CUDA available: {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        print(f"  - CUDA device: {torch.cuda.get_device_name(0)}")
except Exception as e:
    print(f"  - Error checking CUDA: {e}")

print("\n=== End of Diagnostic ===")

#!/bin/bash
# PhantomShield X - Linux/Mac Agent Installer

echo "============================================"
echo "  PhantomShield X -- Device Agent Installer"
echo "============================================"
echo ""

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] Python3 is not installed."
    echo "Install it with: sudo apt install python3 (Linux) or brew install python (Mac)"
    exit 1
fi

echo "[OK] Python3 found: $(python3 --version)"
echo ""

# Install dependencies
echo "[~] Installing required packages..."
pip3 install psutil httpx --quiet --upgrade
echo "[OK] Packages installed."
echo ""

# Download agent.py if not present
if [ ! -f "agent.py" ]; then
    echo "[~] Downloading agent.py..."
    curl -L "https://raw.githubusercontent.com/DeepuCodesss/PhantomShield-x/main/agent.py" -o agent.py
    chmod +x agent.py
    echo "[OK] agent.py downloaded."
fi

echo ""
echo "============================================"
echo "  Starting PhantomShield X Agent..."
echo "  Press Ctrl+C anytime to stop."
echo "============================================"
echo ""

# Run the agent — change URL to your backend
python3 agent.py --server https://phantomshield-x.onrender.com

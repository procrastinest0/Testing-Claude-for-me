#!/usr/bin/env bash
# Raspberry Pi setup script for the Google Calendar Dashboard
# Run: chmod +x setup_pi.sh && ./setup_pi.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== Google Calendar Dashboard - Raspberry Pi Setup ==="

# Install system dependencies
echo "[1/4] Installing system dependencies..."
sudo apt-get update -qq
sudo apt-get install -y python3 python3-pip python3-venv

# Create virtual environment
echo "[2/4] Setting up Python virtual environment..."
cd "$SCRIPT_DIR"
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
echo "[3/4] Installing Python packages..."
pip install --upgrade pip
pip install -r requirements.txt

# Create systemd service for auto-start
echo "[4/4] Setting up systemd service..."
SERVICE_FILE="/etc/systemd/system/calendar-dashboard.service"

sudo tee "$SERVICE_FILE" > /dev/null <<EOF
[Unit]
Description=Google Calendar Dashboard
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$SCRIPT_DIR
ExecStart=$SCRIPT_DIR/venv/bin/python app.py
Restart=always
RestartSec=10
Environment=DASHBOARD_HOST=0.0.0.0
Environment=DASHBOARD_PORT=5000
Environment=CALENDAR_DAYS_AHEAD=7

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable calendar-dashboard.service

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Before starting, you need to:"
echo "  1. Place your Google credentials.json in: $SCRIPT_DIR/"
echo "  2. Run the app once manually to authorize:"
echo "     cd $SCRIPT_DIR && source venv/bin/activate && python app.py"
echo "  3. Open http://localhost:5000 and complete the Google sign-in"
echo "  4. After auth succeeds, stop the app (Ctrl+C) and start the service:"
echo "     sudo systemctl start calendar-dashboard"
echo ""
echo "Dashboard will be available at: http://$(hostname -I | awk '{print $1}'):5000"

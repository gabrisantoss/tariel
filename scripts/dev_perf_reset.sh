#!/usr/bin/env bash
set -euo pipefail

echo "[1/4] Encerrando processos headless presos..."
pkill -f playwright || true
pkill -f chrome-headless-shell || true

echo "[2/4] Encerrando Chromium temporario do Playwright..."
pkill -f "/tmp/playwright_chromiumdev_profile-" || true

echo "[3/4] Resetando swap..."
if sudo -n true 2>/dev/null; then
  sudo swapoff -a
  sudo swapon -a
else
  echo "sudo sem modo non-interactive; pulando reset de swap."
fi

echo "[4/4] Estado atual da memoria:"
free -h
echo
ps -eo pid,comm,%mem,%cpu,rss,args --sort=-rss | head -n 12

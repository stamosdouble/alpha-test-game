#!/usr/bin/env bash
# Double-click or: ./start.sh
# Serves the game with no-cache so PNG swaps always show after refresh.
cd "$(dirname "$0")"
PORT="${PORT:-8080}"
echo "Paper Squadron — http://127.0.0.1:${PORT}/"
echo "Leave this window open. Swap PNGs in /assets, then refresh the browser."
if command -v node >/dev/null 2>&1; then
  exec node scripts/dev-server.js
fi
python3 -m http.server "$PORT" --bind 127.0.0.1

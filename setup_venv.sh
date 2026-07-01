#!/bin/bash
# Recreates the .venv that the mulesoft-rag MCP server config expects.
set -e
cd "$(dirname "$0")"

# Prefer a mature Python version — 3.14 is too new for some pinned deps.
PY=""
for candidate in python3.12 python3.13 python3.11 python3; do
  if command -v "$candidate" >/dev/null 2>&1; then
    PY="$candidate"
    break
  fi
done

echo "Using $($PY --version) at $(which $PY)"
rm -rf .venv
"$PY" -m venv .venv
.venv/bin/pip install --upgrade pip
.venv/bin/pip install -r backend/requirements.txt

echo ""
echo "✅ venv created. Verifying the exact command Claude Desktop runs:"
.venv/bin/python --version
echo ""
echo "Now fully quit Claude Desktop (Cmd+Q) and reopen it."

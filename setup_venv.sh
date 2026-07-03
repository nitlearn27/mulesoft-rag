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
echo "✅ venv created. Verifying python version:"
.venv/bin/python --version

# Generate project-scoped MCP configuration with absolute paths dynamically
WORKSPACE_DIR=$(pwd)
mkdir -p .agents
cat <<EOF > .agents/mcp_config.json
{
  "mcpServers": {
    "mulesoft-rag-mcp": {
      "command": "${WORKSPACE_DIR}/.venv/bin/python",
      "args": [
        "${WORKSPACE_DIR}/backend/mcp_server.py"
      ],
      "env": {
        "RESOURCES_DIR": "${WORKSPACE_DIR}/resources"
      }
    }
  }
}
EOF
echo ""
echo "✅ Workspace MCP configuration generated at .agents/mcp_config.json"

# Write tips for global configuration
GLOBAL_CONFIG_DIR="$HOME/.gemini/config"
if [ -d "$GLOBAL_CONFIG_DIR" ]; then
  cat <<EOF > "$GLOBAL_CONFIG_DIR/mcp_config.json"
{
  "mcpServers": {
    "mulesoft-rag-mcp": {
      "command": "${WORKSPACE_DIR}/.venv/bin/python",
      "args": [
        "${WORKSPACE_DIR}/backend/mcp_server.py"
      ],
      "env": {
        "RESOURCES_DIR": "${WORKSPACE_DIR}/resources"
      }
    }
  }
}
EOF
  echo "✅ Global Antigravity MCP configuration updated at $GLOBAL_CONFIG_DIR/mcp_config.json"
fi

echo ""
echo "Now fully quit Antigravity 2.0 / Claude Desktop (Cmd+Q) and reopen it to load the server."

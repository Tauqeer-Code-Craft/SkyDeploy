#!/bin/bash
set -e

CLONE_DIR="/home/app/repo"

# Clone repo if URL is provided
if [ -n "$GIT_REPOSITORY__URL" ]; then
    git clone "$GIT_REPOSITORY__URL" "$CLONE_DIR"
fi

# Monorepo support
if [ -n "$PROJECT_ROOT" ]; then
    cd "$CLONE_DIR/$PROJECT_ROOT"
else
    cd "$CLONE_DIR"
fi

# Export ENV_KEYS
if [ -n "$ENV_KEYS" ]; then
    IFS=',' read -ra KV_PAIRS <<< "$ENV_KEYS"
    for kv in "${KV_PAIRS[@]}"; do
        export "$kv"
    done
fi

# Always expose same container port
export PORT=3000

exec python /home/app/script.py

#!/bin/bash
set -e

# Default paths
CLONE_DIR="/home/app/repo"

# Clone repo if URL is provided
if [ -n "$GIT_REPOSITORY__URL" ]; then
    git clone "$GIT_REPOSITORY__URL" "$CLONE_DIR"
fi

# Change into project module/root
if [ -n "$PROJECT_ROOT" ]; then
    cd "$CLONE_DIR/$PROJECT_ROOT"
else
    cd "$CLONE_DIR"
fi

# Export user-provided environment variables
if [ -n "$ENV_KEYS" ]; then
    # ENV_KEYS format: KEY1=value1,KEY2=value2
    IFS=',' read -ra KV_PAIRS <<< "$ENV_KEYS"
    for kv in "${KV_PAIRS[@]}"; do
        export "$kv"
    done
fi

# Run Node script
exec node /home/app/script.js

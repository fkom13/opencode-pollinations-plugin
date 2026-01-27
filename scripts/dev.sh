#!/bin/bash

# Configuration
SOURCE_DIST="dist/index.js"
TARGET_DIR="$HOME/.config/opencode/plugins"
TARGET_FILE="$TARGET_DIR/pollinations.js"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}[DEV] Starting Build & Watch Cycle...${NC}"

# Ensure target directory exists
mkdir -p "$TARGET_DIR"

# Function to copy file
copy_plugin() {
    if [ -f "$SOURCE_DIST" ]; then
        echo -e "${GREEN}[DEV] Build detected. Deploying to $TARGET_FILE...${NC}"
        cp "$SOURCE_DIST" "$TARGET_FILE"
        echo -e "${GREEN}[DEV] Deployed successfully. Reload OpenCode to test.${NC}"
    fi
}

# Initial build
npm run build
copy_plugin

# Watch for changes
# Requires 'nodemon' or similar, but for simplicity we rely on tsc -w and a separate watcher or just hook into tsc output if possible.
# Ideally, use 'concurrently' in package.json to run tsc -w and a watcher.
# For now, let's keep it simple: This script is intended to be run ONCE to setup, 
# but for continuous dev, we should use 'nodemon' watching dist/

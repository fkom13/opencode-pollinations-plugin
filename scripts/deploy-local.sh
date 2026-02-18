#!/bin/bash
set -e

# Resolve Project Root (script is in scripts/ folder)
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$DIR")"
cd "$PROJECT_ROOT"

# Target specific to User's setup
DEST="$HOME/.config/opencode/node_modules/opencode-pollinations-plugin"

echo "📍 Working in: $PROJECT_ROOT"
echo "🚧 Building plugin..."
npm run build

echo "🧹 Cleaning previous install at $DEST..."
rm -rf "$DEST"
mkdir -p "$DEST"

echo "📦 Deploying to local node_modules..."
# Copy everything needed for runtime
cp -r dist package.json README.md "$DEST"

# Handle deps? 
# Usually local dev assumes deps are hoisted or installed. 
# But since we are copying to ~/.config/opencode/node_modules, we might need deps there.
# However, if we copy package.json, OpenCode might try to npm install?
# Best approach for "Quick Dev": Copy `node_modules` too if feasible, or rely on global?
# The user wants "Develop quietly".
# Copying local `node_modules` is heavy.
# Let's assume user ran `npm install` in the project root, and we symlink or copy.
# Symlink is risky if paths differ, but Copying dist is safer.
# We will NOT copy node_modules. We expect OpenCode to handle deps or find them?
# Actually, standard OpenCode usage via `node_modules` expects fully installed package.
# So we run `npm install --production` in target?
echo "📥 Installing production dependencies in target..."
cd "$DEST"
npm install --production --silent

echo "✅ Deployed! Reload OpenCode window to test."

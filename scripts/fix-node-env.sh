#!/bin/bash

# Fix Node.js environment issues for Chatterbot development
# This script addresses the NODE_OPTIONS preload issue and provides clean npm commands

echo "🔧 Fixing Node.js environment for Chatterbot..."

# Check if NODE_OPTIONS is set to the problematic Cursor bootloader
if [[ "$NODE_OPTIONS" == *"cursor-server"* ]] || [[ "$NODE_OPTIONS" == *"ms-vscode.js-debug"* ]]; then
    echo "⚠️  Detected problematic NODE_OPTIONS: $NODE_OPTIONS"
    echo "🔄 Temporarily clearing NODE_OPTIONS for this session..."
    export NODE_OPTIONS=""
    echo "✅ NODE_OPTIONS cleared"
else
    echo "✅ NODE_OPTIONS is clean or not set"
fi

# Function to run npm commands with clean environment
run_npm_clean() {
    local cmd="$1"
    echo "🚀 Running: $cmd"
    NODE_OPTIONS="" $cmd
}

# Function to run git commands with clean environment
run_git_clean() {
    local cmd="$1"
    echo "🚀 Running: $cmd"
    NODE_OPTIONS="" $cmd
}

# Show current environment
echo ""
echo "📋 Current Environment:"
echo "  NODE_OPTIONS: ${NODE_OPTIONS:-'not set'}"
echo "  Node.js version: $(node --version)"
echo "  npm version: $(npm --version)"
echo ""

# Provide usage examples
echo "💡 Usage Examples:"
echo "  run_npm_clean 'npm audit'"
echo "  run_npm_clean 'npm install'"
echo "  run_git_clean 'git commit'"
echo ""

echo "✅ Environment fix complete!"
echo "💡 Tip: Use 'run_npm_clean' or 'run_git_clean' functions for clean execution"

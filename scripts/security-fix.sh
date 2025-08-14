#!/bin/bash

# Security vulnerability fix script for Chatterbot
# This script addresses the identified security issues

echo "🔒 Chatterbot Security Vulnerability Fix Script"
echo "================================================"

# Function to run commands with clean Node.js environment
run_clean() {
    local cmd="$1"
    echo "🚀 Running: $cmd"
    NODE_OPTIONS="" $cmd
}

# Step 1: Check current vulnerabilities
echo ""
echo "📊 Step 1: Checking current vulnerabilities..."
run_clean "npm audit"

# Step 2: Try to fix auto-fixable vulnerabilities
echo ""
echo "🔧 Step 2: Attempting to fix auto-fixable vulnerabilities..."
run_clean "npm audit fix --legacy-peer-deps"

# Step 3: Check remaining vulnerabilities
echo ""
echo "📊 Step 3: Checking remaining vulnerabilities..."
run_clean "npm audit"

# Step 4: Address specific vulnerabilities
echo ""
echo "🎯 Step 4: Addressing specific vulnerabilities..."

# Check if crewai is being used
if grep -q "crewai" package.json; then
    echo "⚠️  Found crewai dependency with vulnerabilities"
    echo "   - This depends on embedchain which has axios and pdfjs-dist vulnerabilities"
    echo "   - Consider alternatives or update when available"
fi

# Check if we can update pdfjs-dist directly
echo ""
echo "📦 Checking for direct pdfjs-dist updates..."
run_clean "npm list pdfjs-dist"

# Step 5: Generate security report
echo ""
echo "📋 Step 5: Generating security report..."
echo "Security vulnerabilities found:" > security-report.txt
run_clean "npm audit --json" >> security-report.txt 2>/dev/null || echo "Could not generate JSON report" >> security-report.txt

echo ""
echo "✅ Security fix script completed!"
echo "📄 Security report saved to: security-report.txt"
echo ""
echo "💡 Recommendations:"
echo "   1. Review security-report.txt for detailed vulnerability info"
echo "   2. Consider removing crewai if not essential (has multiple vulnerabilities)"
echo "   3. Monitor for updates to embedchain and related packages"
echo "   4. Run 'npm audit' regularly to check for new vulnerabilities"

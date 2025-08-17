#!/bin/bash

# Quick Production Validation Script
# This script provides a fast overview of production readiness

echo "🚀 Quick Production Validation"
echo "=============================="

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
success() { echo -e "${GREEN}✅ $1${NC}"; }
warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; }
info() { echo -e "${BLUE}ℹ️  $1${NC}"; }

# Track validation results
PASSED=0
FAILED=0
WARNINGS=0

# Check required environment variables
echo ""
echo "📋 Environment Variables"
echo "------------------------"

required_vars=("DISCORD_TOKEN" "DISCORD_CLIENT_ID" "GEMINI_API_KEY" "NODE_ENV" "DATABASE_URL")
for var in "${required_vars[@]}"; do
    if [ -n "${!var}" ]; then
        success "$var is set"
        ((PASSED++))
    else
        error "$var is missing"
        ((FAILED++))
    fi
done

# Check Node environment
if [ "$NODE_ENV" = "production" ]; then
    success "NODE_ENV is production"
else
    warning "NODE_ENV is '$NODE_ENV' (expected: production)"
    ((WARNINGS++))
fi

# Check critical files
echo ""
echo "📁 Critical Files"
echo "-----------------"

critical_files=(
    "src/index.ts"
    "src/services/core-intelligence.service.ts" 
    "src/services/performance-monitoring.service.ts"
    "package.json"
    "prisma/schema.prisma"
)

for file in "${critical_files[@]}"; do
    if [ -f "$file" ]; then
        success "$file exists"
        ((PASSED++))
    else
        error "$file missing"
        ((FAILED++))
    fi
done

# Check TypeScript compilation
echo ""
echo "🔧 TypeScript Compilation"
echo "-------------------------"

if npx tsc --noEmit >/dev/null 2>&1; then
    success "TypeScript compilation successful"
    ((PASSED++))
else
    error "TypeScript compilation failed"
    ((FAILED++))
fi

# Check AI Enhancement Services
echo ""
echo "🤖 AI Enhancement Services"
echo "---------------------------"

ai_services=(
    "sentiment-analysis"
    "context-memory"
    "conversation-summarization"
    "intent-recognition"
    "response-personalization"
    "learning-system"
    "conversation-threading"
    "qdrant-vector"
    "neo4j-knowledge-graph"
    "qwen-vl-multimodal"
    "crawl4ai-web"
    "dspy-rag-optimization"
    "ai-evaluation"
)

available_services=0
for service in "${ai_services[@]}"; do
    file="src/services/${service}.service.ts"
    if [ -f "$file" ]; then
        ((available_services++))
    fi
done

total_services=${#ai_services[@]}
percentage=$(( (available_services * 100) / total_services ))

if [ $percentage -ge 90 ]; then
    success "AI Services: $available_services/$total_services ($percentage%)"
    ((PASSED++))
elif [ $percentage -ge 80 ]; then
    warning "AI Services: $available_services/$total_services ($percentage%)"
    ((WARNINGS++))
else
    error "AI Services: $available_services/$total_services ($percentage%)"
    ((FAILED++))
fi

# Check feature flags
echo ""
echo "🚩 Core Feature Flags"
echo "---------------------"

core_flags=("ENABLE_ENHANCED_INTELLIGENCE" "ENABLE_AGENTIC_INTELLIGENCE" "ENABLE_ANSWER_VERIFICATION")
enabled_flags=0

for flag in "${core_flags[@]}"; do
    if [ "${!flag}" = "true" ]; then
        success "$flag: enabled"
        ((enabled_flags++))
        ((PASSED++))
    elif [ "${!flag}" = "false" ]; then
        warning "$flag: disabled"
        ((WARNINGS++))
    else
        error "$flag: not set"
        ((FAILED++))
    fi
done

# Check database
echo ""
echo "💾 Database"
echo "-----------"

if [ -n "$DATABASE_URL" ]; then
    if [[ "$DATABASE_URL" == file:* ]]; then
        info "Using SQLite database"
        # Check if directory exists for SQLite file
        db_dir=$(dirname "${DATABASE_URL#file:}")
        if [ "$db_dir" = "/data" ] || [ "$db_dir" = "./prisma" ]; then
            success "Database directory path is valid"
            ((PASSED++))
        else
            warning "Database directory path: $db_dir"
            ((WARNINGS++))
        fi
    elif [[ "$DATABASE_URL" == postgresql:* ]]; then
        info "Using PostgreSQL database"
        if [ "$FEATURE_PGVECTOR" = "true" ]; then
            success "pgvector support enabled"
            ((PASSED++))
        else
            info "pgvector support not enabled"
        fi
    fi
else
    error "DATABASE_URL not configured"
    ((FAILED++))
fi

# Check Prisma
if npx prisma generate >/dev/null 2>&1; then
    success "Prisma client generation successful"
    ((PASSED++))
else
    error "Prisma client generation failed"
    ((FAILED++))
fi

# Summary
echo ""
echo "📊 Validation Summary"
echo "===================="

total_checks=$((PASSED + FAILED))
success_rate=0
if [ $total_checks -gt 0 ]; then
    success_rate=$(( (PASSED * 100) / total_checks ))
fi

info "Passed: $PASSED"
if [ $WARNINGS -gt 0 ]; then
    warning "Warnings: $WARNINGS"
fi
if [ $FAILED -gt 0 ]; then
    error "Failed: $FAILED"
fi

echo ""
echo "Success Rate: $success_rate%"

# Final assessment
echo ""
if [ $FAILED -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    success "🎉 PRODUCTION READY"
    echo "All validation checks passed successfully!"
    exit 0
elif [ $FAILED -eq 0 ]; then
    warning "✅ PRODUCTION READY WITH WARNINGS"
    echo "Deployment can proceed, but address warnings for optimal performance."
    exit 0
else
    error "❌ NOT PRODUCTION READY"
    echo "Critical issues must be resolved before production deployment."
    exit 1
fi
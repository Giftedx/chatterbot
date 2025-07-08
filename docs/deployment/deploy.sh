#!/bin/bash

# Discord Gemini Bot - Production Deployment Script
# This script handles the complete deployment process

set -e  # Exit on any error

echo "🚀 Starting Discord Gemini Bot production deployment..."

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please copy .env.example to .env and configure it."
    exit 1
fi

# Validate required environment variables
source .env
if [ -z "$DISCORD_TOKEN" ] || [ -z "$DISCORD_CLIENT_ID" ] || [ -z "$GEMINI_API_KEY" ]; then
    echo "❌ Required environment variables missing. Please check your .env file."
    echo "Required: DISCORD_TOKEN, DISCORD_CLIENT_ID, GEMINI_API_KEY"
    exit 1
fi

echo "✅ Environment validation passed"

# Build the application
echo "🔨 Building TypeScript application..."
npm run build

# Run database migrations
echo "🗄️  Running database migrations..."
npm run db:migrate

# Build Docker image
echo "🐳 Building Docker image..."
npm run docker:build

# Deploy with Docker Compose
echo "🚀 Deploying with Docker Compose..."
if [ "$1" == "--with-analytics" ]; then
    echo "📊 Including analytics dashboard..."
    npm run deploy:analytics
else
    npm run docker:run
fi

# Wait for service to be ready
echo "⏳ Waiting for service to start..."
sleep 10

# Health check
echo "🔍 Performing health check..."
if curl -f http://localhost:${ANALYTICS_DASHBOARD_PORT:-3001}/health >/dev/null 2>&1; then
    echo "✅ Service is healthy"
else
    echo "⚠️  Health check failed, but service may still be starting..."
fi

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "📋 Service Information:"
echo "   • Bot Status: Check Docker logs with 'npm run docker:logs'"
echo "   • Analytics API: http://localhost:${ANALYTICS_DASHBOARD_PORT:-3001}/api/overview"
echo "   • Health Check: http://localhost:${ANALYTICS_DASHBOARD_PORT:-3001}/health"
echo ""
echo "📖 Useful Commands:"
echo "   • View logs: npm run docker:logs"
echo "   • Stop service: npm run docker:stop"
echo "   • Database studio: npm run db:studio"
echo ""

if [ "$ENABLE_ANALYTICS_DASHBOARD" == "true" ]; then
    echo "📊 Analytics Dashboard is enabled on port ${ANALYTICS_DASHBOARD_PORT:-3001}"
    echo "   • API endpoints: /api/stats, /api/metrics, /api/overview"
fi

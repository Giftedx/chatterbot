# Environment Configuration Guide

This comprehensive guide covers all environment variables for configuring Chatterbot's AI enhancement services, providers, and deployment scenarios.

## Overview

Chatterbot uses environment variables for configuration, allowing flexible deployment across different environments (development, staging, production) with appropriate feature sets enabled for each scenario.

**Total Configuration Variables**: 60+ environment variables covering:
- Core Discord and AI functionality
- 17 AI Enhancement Services with detailed configurations
- Multiple AI provider integrations
- Performance monitoring and observability
- Database and caching systems
- Security and privacy controls

## Quick Start Templates

### Minimal Configuration (Basic Bot)
```env
# Discord Configuration (Required)
DISCORD_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_discord_client_id

# AI Provider (Required - at least one)
GEMINI_API_KEY=your_gemini_api_key

# Core Configuration
HEALTH_CHECK_PORT=3000
ENABLE_ENHANCED_INTELLIGENCE=true
ENABLE_AGENTIC_INTELLIGENCE=true
DEFAULT_PROVIDER=gemini

# Database
DATABASE_URL=file:./prisma/dev.db
```

### Development Configuration
```env
# Discord Configuration
DISCORD_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_discord_client_id

# AI Providers
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key

# Core AI Features
ENABLE_ENHANCED_INTELLIGENCE=true
ENABLE_AGENTIC_INTELLIGENCE=true
ENABLE_ANSWER_VERIFICATION=true
CROSS_MODEL_VERIFICATION=true
MAX_RERUNS=1
DEFAULT_PROVIDER=gemini

# AI Enhancement Services (Development Set)
ENABLE_PERFORMANCE_MONITORING=true
ENABLE_SENTIMENT_ANALYSIS=true
ENABLE_CONTEXT_MEMORY=true
ENABLE_INTENT_RECOGNITION=true
ENABLE_ENHANCED_OBSERVABILITY=true

# Performance Monitoring
PERFORMANCE_ALERT_THRESHOLD_ERROR_RATE=0.10
PERFORMANCE_ALERT_THRESHOLD_RESPONSE_TIME=10000
PERFORMANCE_RETENTION_HOURS=48

# Development Tools
NODE_ENV=development
LOG_LEVEL=debug
HEALTH_CHECK_PORT=3000
ENABLE_ANALYTICS_DASHBOARD=true
ANALYTICS_DASHBOARD_PORT=3001

# Database
DATABASE_URL=file:./prisma/dev.db
```

### Production Configuration
```env
# Discord Configuration
DISCORD_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_discord_client_id

# AI Providers (Multiple for Redundancy)
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
GROQ_API_KEY=your_groq_api_key

# Core AI Features
ENABLE_ENHANCED_INTELLIGENCE=true
ENABLE_AGENTIC_INTELLIGENCE=true
ENABLE_ANSWER_VERIFICATION=true
CROSS_MODEL_VERIFICATION=true
MAX_RERUNS=1
DEFAULT_PROVIDER=gemini

# All AI Enhancement Services (Full Production)
ENABLE_ENHANCED_OBSERVABILITY=true
ENABLE_PERFORMANCE_MONITORING=true
ENABLE_SENTIMENT_ANALYSIS=true
ENABLE_CONTEXT_MEMORY=true
ENABLE_CONVERSATION_SUMMARIZATION=true
ENABLE_INTENT_RECOGNITION=true
ENABLE_RESPONSE_PERSONALIZATION=true
ENABLE_LEARNING_SYSTEM=true
ENABLE_CONVERSATION_THREADING=true
ENABLE_QDRANT_INTEGRATION=true
ENABLE_KNOWLEDGE_GRAPH=true
ENABLE_MULTIMODAL_PROCESSING=true
ENABLE_WEB_CRAWLING=true
ENABLE_RAG_OPTIMIZATION=true
ENABLE_AI_EVALUATION=true
ENABLE_PREDICTIVE_RESPONSES=true

# External Service Integrations
QDRANT_URL=http://qdrant:6333
QDRANT_API_KEY=your_qdrant_api_key
QDRANT_COLLECTION_NAME=chatterbot-production
NEO4J_URI=bolt://neo4j:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_neo4j_password
REDIS_URL=redis://redis:6379

# Performance Monitoring (Production Thresholds)
PERFORMANCE_ALERT_THRESHOLD_ERROR_RATE=0.05
PERFORMANCE_ALERT_THRESHOLD_RESPONSE_TIME=5000
PERFORMANCE_ALERT_THRESHOLD_OPERATIONS_PER_MINUTE=200
PERFORMANCE_RETENTION_HOURS=168
PERFORMANCE_CLEANUP_INTERVAL_MINUTES=30
PERFORMANCE_MAX_OPERATIONS_IN_MEMORY=50000

# Observability
LANGFUSE_PUBLIC_KEY=pk_your_public_key
LANGFUSE_SECRET_KEY=sk_your_secret_key
LANGFUSE_BASE_URL=https://cloud.langfuse.com

# Production Settings
NODE_ENV=production
LOG_LEVEL=info
HEALTH_CHECK_PORT=3000
ENABLE_ANALYTICS_DASHBOARD=true
ANALYTICS_DASHBOARD_PORT=3001

# Database (Production)
DATABASE_URL=file:/data/production.db
FEATURE_PGVECTOR=true
POSTGRES_URL=postgresql://user:password@postgres:5432/chatterbot

# Security
FEATURE_SEMANTIC_CACHE=true
FEATURE_SEMANTIC_CACHE_PERSIST=true
SEMANTIC_CACHE_TTL_MS=3600000
```

## Core Configuration Variables

### Discord Integration (Required)

```env
# Discord Bot Configuration
DISCORD_TOKEN=your_discord_bot_token                    # Bot token from Discord Developer Portal
DISCORD_CLIENT_ID=your_discord_client_id                # Application ID from Discord Developer Portal
DISCORD_GUILD_ID=your_test_guild_id                     # Optional: Guild ID for development testing
```

### AI Providers

#### Primary Providers
```env
# Google Gemini (Recommended Default)
GEMINI_API_KEY=your_gemini_api_key                      # From Google AI Studio
DEFAULT_PROVIDER=gemini                                 # Set as default provider

# OpenAI
OPENAI_API_KEY=your_openai_api_key                      # From OpenAI Platform

# Anthropic Claude
ANTHROPIC_API_KEY=your_anthropic_api_key                # From Anthropic Console

# Groq
GROQ_API_KEY=your_groq_api_key                          # From Groq Console

# Mistral
MISTRAL_API_KEY=your_mistral_api_key                    # From Mistral Platform
```

#### OpenAI-Compatible Providers
```env
# OpenAI-Compatible Configuration
OPENAI_COMPAT_API_KEY=your_compatible_api_key           # API key for compatible provider
OPENAI_COMPAT_BASE_URL=https://api.provider.com/v1     # Base URL for API endpoint
OPENAI_COMPAT_MODEL=model-name                          # Default model name

# Preset Models for Compatible Providers
OPENAI_COMPAT_MODEL_GEMMA3=google/gemma-3-27b-it       # Gemma 3 model identifier
OPENAI_COMPAT_MODEL_GPT_OSS=deepseek-ai/DeepSeek-R1    # Open source model identifier

# Provider Restrictions (Optional)
DISALLOW_PROVIDERS=provider1,provider2                  # Comma-separated list of disabled providers
```

#### Self-Hosted Examples

**vLLM Configuration:**
```env
OPENAI_COMPAT_BASE_URL=http://localhost:8000/v1
OPENAI_COMPAT_API_KEY=dummy-key-not-required            # vLLM may not require authentication
OPENAI_COMPAT_MODEL=your-model-name                     # Model loaded in vLLM
DEFAULT_PROVIDER=openai_compat
```

**Ollama Configuration:**
```env
OPENAI_COMPAT_BASE_URL=http://localhost:11434/v1
OPENAI_COMPAT_MODEL_GEMMA3=gemma3:27b-instruct
OPENAI_COMPAT_MODEL_GPT_OSS=deepseek-r1:32b
DEFAULT_PROVIDER=openai_compat
```

### Core AI Features

```env
# Core Intelligence Features
ENABLE_ENHANCED_INTELLIGENCE=true                       # Enable advanced AI capabilities
ENABLE_AGENTIC_INTELLIGENCE=true                        # Enable agent behaviors and tools

# Answer Verification
ENABLE_ANSWER_VERIFICATION=true                         # Enable post-generation verification
CROSS_MODEL_VERIFICATION=true                           # Compare outputs across models
MAX_RERUNS=1                                           # Maximum verification reruns

# Token Management
FEATURE_PRECISE_TOKENIZER=true                          # Enable accurate token counting
TOKENIZER_ENCODING=cl100k_base                         # Tokenizer encoding method
```

## AI Enhancement Services Configuration

### Core Enhancement Services

#### Enhanced Observability (Langfuse Integration)
```env
ENABLE_ENHANCED_OBSERVABILITY=true                      # Enable Langfuse tracing
LANGFUSE_PUBLIC_KEY=pk_your_public_key                  # Langfuse public key
LANGFUSE_SECRET_KEY=sk_your_secret_key                  # Langfuse secret key
LANGFUSE_BASE_URL=https://cloud.langfuse.com           # Langfuse endpoint URL
FEATURE_LANGFUSE=true                                   # Legacy flag for compatibility
```

#### Performance Monitoring
```env
ENABLE_PERFORMANCE_MONITORING=true                      # Enable performance tracking

# Alert Thresholds
PERFORMANCE_ALERT_THRESHOLD_ERROR_RATE=0.05            # 5% error rate threshold
PERFORMANCE_ALERT_THRESHOLD_RESPONSE_TIME=5000         # 5 second response time threshold
PERFORMANCE_ALERT_THRESHOLD_OPERATIONS_PER_MINUTE=100  # 100 ops/min throughput threshold

# Data Retention
PERFORMANCE_RETENTION_HOURS=168                        # 7 days retention
PERFORMANCE_CLEANUP_INTERVAL_MINUTES=60                # Hourly cleanup
PERFORMANCE_MAX_OPERATIONS_IN_MEMORY=10000             # Memory limit for operations

# Dashboard and Export
PERFORMANCE_EXPORT_FORMAT=json                         # Export format: json, csv, prometheus
PERFORMANCE_DASHBOARD_REFRESH_INTERVAL=30000           # 30 second refresh interval
PERFORMANCE_LOG_LEVEL=info                             # Logging level: debug, info, warn, error

# Alert Delivery (Optional)
PERFORMANCE_ALERT_DISCORD_WEBHOOK=https://discord.com/api/webhooks/...
PERFORMANCE_ALERT_WEBHOOK_URL=https://your-monitoring.com/alerts
PERFORMANCE_ALERT_COOLDOWN=300                         # 5 minute alert cooldown
```

### Cognitive Services

```env
# Sentiment Analysis
ENABLE_SENTIMENT_ANALYSIS=true                         # Enable emotion and sentiment detection

# Context Memory
ENABLE_CONTEXT_MEMORY=true                             # Enable long-term conversation memory
CONTEXT_MEMORY_RETENTION_DAYS=30                       # Memory retention period
CONTEXT_MEMORY_MAX_ENTRIES_PER_USER=1000              # Maximum memory entries per user

# Conversation Summarization  
ENABLE_CONVERSATION_SUMMARIZATION=true                 # Enable conversation summarization
SUMMARIZATION_MIN_MESSAGES=10                          # Minimum messages before summarization
SUMMARIZATION_TOKEN_THRESHOLD=2000                     # Token threshold for summarization

# Intent Recognition
ENABLE_INTENT_RECOGNITION=true                         # Enable intent classification
INTENT_CONFIDENCE_THRESHOLD=0.7                        # Minimum confidence for intent classification

# Response Personalization
ENABLE_RESPONSE_PERSONALIZATION=true                   # Enable user-specific responses
PERSONALIZATION_LEARNING_RATE=0.1                      # Learning rate for adaptation

# Learning System
ENABLE_LEARNING_SYSTEM=true                            # Enable continuous learning
LEARNING_FEEDBACK_THRESHOLD=5                          # Minimum feedback for learning

# Conversation Threading
ENABLE_CONVERSATION_THREADING=true                     # Enable conversation flow management
THREADING_MAX_CONCURRENT_THREADS=10                    # Maximum concurrent threads per user
```

### External Integration Services

#### Qdrant Vector Database
```env
ENABLE_QDRANT_INTEGRATION=true                         # Enable Qdrant vector search
QDRANT_URL=http://localhost:6333                       # Qdrant server URL
QDRANT_API_KEY=your_qdrant_api_key                     # Qdrant API key (if required)
QDRANT_COLLECTION_NAME=chatterbot-vectors              # Collection name for vectors
QDRANT_VECTOR_SIZE=1536                                # Vector dimension size
QDRANT_DISTANCE_METRIC=cosine                          # Distance metric: cosine, euclid, dot
QDRANT_MAX_RESULTS=50                                  # Maximum search results
```

#### Neo4j Knowledge Graph
```env
ENABLE_KNOWLEDGE_GRAPH=true                            # Enable Neo4j knowledge graph
NEO4J_URI=bolt://localhost:7687                        # Neo4j connection URI
NEO4J_USERNAME=neo4j                                   # Neo4j username
NEO4J_PASSWORD=your_neo4j_password                     # Neo4j password
NEO4J_DATABASE=neo4j                                   # Database name
NEO4J_MAX_CONNECTION_POOL_SIZE=50                      # Connection pool size
NEO4J_CONNECTION_TIMEOUT=30000                         # Connection timeout (ms)
```

#### Multimodal Processing (Qwen VL)
```env
ENABLE_MULTIMODAL_PROCESSING=true                      # Enable image analysis
QWEN_VL_API_KEY=your_qwen_vl_api_key                   # Qwen VL API key
QWEN_VL_MODEL=qwen-vl-plus                             # Model variant
QWEN_VL_MAX_IMAGE_SIZE=10485760                        # Max image size (10MB)
QWEN_VL_SUPPORTED_FORMATS=jpg,jpeg,png,gif,webp        # Supported image formats
```

#### Web Crawling (Crawl4AI)
```env
ENABLE_WEB_CRAWLING=true                               # Enable web content extraction
CRAWL4AI_API_KEY=your_crawl4ai_api_key                 # Crawl4AI API key
WEB_CRAWL_TIMEOUT=30000                                # Crawl timeout (30 seconds)
WEB_CRAWL_MAX_PAGES=5                                  # Maximum pages per crawl
WEB_CRAWL_USER_AGENT=ChatterbotAI/1.0                 # User agent string
WEB_CRAWL_RESPECT_ROBOTS_TXT=true                      # Respect robots.txt
```

#### RAG Optimization (DSPy)
```env
ENABLE_RAG_OPTIMIZATION=true                           # Enable RAG optimization
RAG_OPTIMIZATION_MODEL=gpt-4                           # Model for optimization
RAG_RETRIEVAL_LIMIT=10                                 # Maximum retrieval results
RAG_CONTEXT_WINDOW=4000                                # Context window size
RAG_SIMILARITY_THRESHOLD=0.75                          # Similarity threshold
RAG_RERANK_TOP_K=5                                     # Top K results after reranking
```

### Evaluation and Monitoring Services

```env
# AI Evaluation
ENABLE_AI_EVALUATION=true                              # Enable evaluation framework
AI_EVALUATION_SAMPLE_RATE=0.1                          # 10% of interactions evaluated
AI_EVALUATION_BATCH_SIZE=100                           # Evaluation batch size

# Predictive Responses
ENABLE_PREDICTIVE_RESPONSES=true                       # Enable proactive responses
PREDICTIVE_RESPONSE_THRESHOLD=0.8                      # Confidence threshold
PREDICTIVE_RESPONSE_MAX_SUGGESTIONS=3                  # Maximum suggestions
```

## Database Configuration

### SQLite (Default)
```env
DATABASE_URL=file:./prisma/dev.db                      # Local development
DATABASE_URL=file:/data/production.db                  # Docker production
```

### PostgreSQL (Optional for pgvector)
```env
FEATURE_PGVECTOR=true                                  # Enable PostgreSQL vector support
DATABASE_URL=postgresql://user:pass@localhost:5432/db  # PostgreSQL connection
POSTGRES_URL=postgresql://user:pass@localhost:5432/db  # Alternative connection string
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=chatterbot
POSTGRES_USER=chatterbot
POSTGRES_PASSWORD=your_postgres_password
```

## Caching and Storage

### Redis Configuration
```env
REDIS_URL=redis://localhost:6379                       # Redis connection URL
REDIS_HOST=localhost                                   # Redis host
REDIS_PORT=6379                                        # Redis port
REDIS_PASSWORD=your_redis_password                     # Redis password (if required)
REDIS_DB=0                                             # Redis database number
```

### Semantic Caching
```env
FEATURE_SEMANTIC_CACHE=true                            # Enable semantic caching
FEATURE_SEMANTIC_CACHE_PERSIST=true                    # Persist cache in Redis
SEMANTIC_CACHE_TTL_MS=3600000                          # Cache TTL (1 hour)
SEMANTIC_CACHE_MAX_ENTRIES=10000                       # Maximum cache entries
SEMANTIC_CACHE_DISTANCE=0.15                           # Distance threshold (85% similarity)
```

## Tools and External APIs

### Search and Content Tools
```env
BRAVE_API_KEY=your_brave_api_key                       # Brave Search API
FIRECRAWL_API_KEY=your_firecrawl_api_key              # Firecrawl content extraction
SERP_API_KEY=your_serp_api_key                        # Alternative search API
```

### Media and Creative Tools
```env
ELEVENLABS_API_KEY=your_elevenlabs_api_key            # Text-to-speech
ELEVENLABS_VOICE_ID=default_voice_id                   # Default voice
TENOR_API_KEY=your_tenor_api_key                       # GIF search
STABILITY_API_KEY=your_stability_api_key               # Stable Diffusion image generation
```

### Retrieval and Reranking
```env
# Reranking Services
FEATURE_RERANK=true                                    # Enable result reranking
RERANK_PROVIDER=auto                                   # Reranking provider: cohere, voyage, local, auto

# Cohere Reranking
COHERE_API_KEY=your_cohere_api_key
COHERE_RERANK_MODEL=rerank-english-v3.0

# Voyage Reranking  
VOYAGE_API_KEY=your_voyage_api_key
VOYAGE_RERANK_MODEL=rerank-2.5

# Local Reranking (Self-hosted)
FEATURE_LOCAL_RERANK=true
LOCAL_RERANK_MODEL=Xenova/all-MiniLM-L6-v2

# Hybrid Retrieval
ENABLE_HYBRID_RETRIEVAL=true                           # Combine web + knowledge base
HYBRID_RETRIEVAL_WEIGHT_KB=0.6                         # Knowledge base weight
HYBRID_RETRIEVAL_WEIGHT_WEB=0.4                        # Web search weight
```

## Observability and Monitoring

### Health and Metrics
```env
HEALTH_CHECK_PORT=3000                                 # Health check endpoint port
ENABLE_ANALYTICS_DASHBOARD=true                        # Enable analytics dashboard
ANALYTICS_DASHBOARD_PORT=3001                          # Dashboard port
```

### Helicone Proxy (Optional)
```env
HELICONE_BASE_URL=https://oai.helicone.ai/v1          # Helicone proxy URL
HELICONE_API_KEY=your_helicone_api_key                 # Helicone API key
HELICONE_CACHE_ENABLED=true                            # Enable proxy caching
HELICONE_CACHE_MAX_AGE=300                             # Cache max age (5 minutes)
```

### Telemetry and Logging
```env
FEATURE_PERSIST_TELEMETRY=true                         # Persist telemetry in database
LOG_LEVEL=info                                         # Logging level: debug, info, warn, error
NODE_ENV=production                                    # Node environment
```

## Security and Privacy

### Privacy Controls
```env
PRIVACY_CONSENT_REQUIRED=true                          # Require user consent
PRIVACY_DATA_RETENTION_DAYS=90                         # Data retention period
PRIVACY_ALLOW_DATA_EXPORT=true                         # Allow data export
PRIVACY_ALLOW_DATA_DELETION=true                       # Allow data deletion
```

### Security Settings
```env
RATE_LIMIT_MAX_REQUESTS=100                            # Max requests per minute per user
RATE_LIMIT_WINDOW_MINUTES=1                            # Rate limit window
CONTENT_FILTER_ENABLED=true                            # Enable content filtering
CONTENT_FILTER_STRICTNESS=medium                       # Strictness: low, medium, high
```

## Advanced Configuration

### Decision Engine Overrides
```env
DECISION_OVERRIDES_JSON='{"ambientThreshold":0.7,"burstCountThreshold":5,"defaultModelTokenLimit":4000}'
```

### Feature Toggles
```env
FEATURE_VERCEL_AI=true                                 # Enable Vercel AI SDK
FEATURE_OPENAI_RESPONSES=true                          # Enable OpenAI Responses API
FEATURE_OPENAI_RESPONSES_TOOLS=true                    # Enable OpenAI tools with Responses
FEATURE_LANGGRAPH=true                                 # Enable LangGraph integration
FEATURE_TEMPORAL=true                                  # Enable Temporal orchestration
```

## Environment-Specific Configurations

### Development Environment (.env.development)
```env
# Optimized for development speed and debugging
NODE_ENV=development
LOG_LEVEL=debug

# Reduced thresholds for testing
PERFORMANCE_ALERT_THRESHOLD_ERROR_RATE=0.20
PERFORMANCE_ALERT_THRESHOLD_RESPONSE_TIME=10000
PERFORMANCE_RETENTION_HOURS=24

# Limited AI services to reduce external dependencies
ENABLE_PERFORMANCE_MONITORING=true
ENABLE_SENTIMENT_ANALYSIS=true
ENABLE_CONTEXT_MEMORY=true
ENABLE_INTENT_RECOGNITION=true

# Disabled resource-intensive services
ENABLE_KNOWLEDGE_GRAPH=false
ENABLE_QDRANT_INTEGRATION=false
ENABLE_WEB_CRAWLING=false
ENABLE_RAG_OPTIMIZATION=false

# Development database
DATABASE_URL=file:./prisma/dev.db

# Debug features
ENABLE_ANALYTICS_DASHBOARD=true
ANALYTICS_DASHBOARD_PORT=3001
```

### Staging Environment (.env.staging)
```env
# Staging mirrors production with relaxed thresholds
NODE_ENV=staging
LOG_LEVEL=info

# Staging-specific thresholds
PERFORMANCE_ALERT_THRESHOLD_ERROR_RATE=0.10
PERFORMANCE_ALERT_THRESHOLD_RESPONSE_TIME=7500
PERFORMANCE_RETENTION_HOURS=72

# Most AI services enabled for testing
ENABLE_ENHANCED_OBSERVABILITY=true
ENABLE_PERFORMANCE_MONITORING=true
ENABLE_SENTIMENT_ANALYSIS=true
ENABLE_CONTEXT_MEMORY=true
ENABLE_CONVERSATION_SUMMARIZATION=true
ENABLE_INTENT_RECOGNITION=true
ENABLE_RESPONSE_PERSONALIZATION=true
ENABLE_LEARNING_SYSTEM=true
ENABLE_CONVERSATION_THREADING=true
ENABLE_MULTIMODAL_PROCESSING=true
ENABLE_AI_EVALUATION=true

# Limited external integrations
ENABLE_KNOWLEDGE_GRAPH=true
ENABLE_QDRANT_INTEGRATION=false  # Expensive for staging
ENABLE_WEB_CRAWLING=true
ENABLE_RAG_OPTIMIZATION=true

# Staging database
DATABASE_URL=file:/data/staging.db
```

### Production Environment (.env.production)
```env
# Production optimized for performance and reliability
NODE_ENV=production
LOG_LEVEL=info

# Strict production thresholds
PERFORMANCE_ALERT_THRESHOLD_ERROR_RATE=0.05
PERFORMANCE_ALERT_THRESHOLD_RESPONSE_TIME=5000
PERFORMANCE_ALERT_THRESHOLD_OPERATIONS_PER_MINUTE=200
PERFORMANCE_RETENTION_HOURS=168
PERFORMANCE_MAX_OPERATIONS_IN_MEMORY=50000

# All AI services enabled
ENABLE_ENHANCED_OBSERVABILITY=true
ENABLE_PERFORMANCE_MONITORING=true
ENABLE_SENTIMENT_ANALYSIS=true
ENABLE_CONTEXT_MEMORY=true
ENABLE_CONVERSATION_SUMMARIZATION=true
ENABLE_INTENT_RECOGNITION=true
ENABLE_RESPONSE_PERSONALIZATION=true
ENABLE_LEARNING_SYSTEM=true
ENABLE_CONVERSATION_THREADING=true
ENABLE_QDRANT_INTEGRATION=true
ENABLE_KNOWLEDGE_GRAPH=true
ENABLE_MULTIMODAL_PROCESSING=true
ENABLE_WEB_CRAWLING=true
ENABLE_RAG_OPTIMIZATION=true
ENABLE_AI_EVALUATION=true
ENABLE_PREDICTIVE_RESPONSES=true

# Production database with backup
DATABASE_URL=file:/data/production.db
FEATURE_PGVECTOR=true
POSTGRES_URL=postgresql://user:pass@postgres:5432/chatterbot

# Production monitoring
LANGFUSE_PUBLIC_KEY=pk_production_key
LANGFUSE_SECRET_KEY=sk_production_key
REDIS_URL=redis://redis:6379

# Multiple providers for redundancy
GEMINI_API_KEY=your_gemini_key
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
GROQ_API_KEY=your_groq_key
```

## Docker Configuration

### Docker Compose Environment
```yaml
# docker-compose.yml environment section
environment:
  - DISCORD_TOKEN=${DISCORD_TOKEN}
  - DISCORD_CLIENT_ID=${DISCORD_CLIENT_ID}
  - GEMINI_API_KEY=${GEMINI_API_KEY}
  - DATABASE_URL=file:/data/production.db
  - REDIS_URL=redis://redis:6379
  - NEO4J_URI=bolt://neo4j:7687
  - QDRANT_URL=http://qdrant:6333
  - NODE_ENV=production
  - ENABLE_PERFORMANCE_MONITORING=true
```

### Multi-Container Setup
```yaml
# Complete docker-compose.yml with all services
version: '3.8'
services:
  chatterbot:
    image: ghcr.io/giftedx/chatterbot:main
    environment:
      # Load from .env file
      - DISCORD_TOKEN
      - DISCORD_CLIENT_ID
      - GEMINI_API_KEY
      # Service connections
      - REDIS_URL=redis://redis:6379
      - NEO4J_URI=bolt://neo4j:7687
      - QDRANT_URL=http://qdrant:6333
      # Enable all services
      - ENABLE_ENHANCED_OBSERVABILITY=true
      - ENABLE_PERFORMANCE_MONITORING=true
      - ENABLE_KNOWLEDGE_GRAPH=true
      - ENABLE_QDRANT_INTEGRATION=true
    volumes:
      - bot-data:/data
    depends_on:
      - redis
      - neo4j
      - qdrant

  redis:
    image: redis:alpine
    volumes:
      - redis-data:/data

  neo4j:
    image: neo4j:latest
    environment:
      - NEO4J_AUTH=neo4j/your_password
    volumes:
      - neo4j-data:/data

  qdrant:
    image: qdrant/qdrant
    volumes:
      - qdrant-data:/qdrant/storage
```

## Environment Validation

### Configuration Checker Script
```bash
#!/bin/bash
# check-config.sh - Validate environment configuration

echo "Chatterbot Configuration Checker"
echo "================================"

# Check required variables
REQUIRED_VARS=("DISCORD_TOKEN" "DISCORD_CLIENT_ID" "GEMINI_API_KEY")
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Missing required variable: $var"
        exit 1
    else
        echo "✅ $var is set"
    fi
done

# Check AI enhancement services
AI_SERVICES=("ENABLE_PERFORMANCE_MONITORING" "ENABLE_SENTIMENT_ANALYSIS" "ENABLE_CONTEXT_MEMORY")
echo ""
echo "AI Enhancement Services:"
for service in "${AI_SERVICES[@]}"; do
    if [ "${!service}" = "true" ]; then
        echo "✅ $service: enabled"
    else
        echo "⚠️ $service: disabled"
    fi
done

# Check external service connections
echo ""
echo "External Services:"
if [ -n "$REDIS_URL" ]; then
    echo "✅ Redis: $REDIS_URL"
else
    echo "⚠️ Redis: not configured"
fi

if [ -n "$NEO4J_URI" ]; then
    echo "✅ Neo4j: $NEO4J_URI"
else
    echo "⚠️ Neo4j: not configured"
fi

if [ -n "$QDRANT_URL" ]; then
    echo "✅ Qdrant: $QDRANT_URL"
else
    echo "⚠️ Qdrant: not configured"
fi

echo ""
echo "Configuration check complete!"
```

## Troubleshooting Configuration Issues

### Common Configuration Problems

#### 1. Missing Required Variables
```bash
# Symptom: Bot fails to start
# Check: Ensure all required variables are set
DISCORD_TOKEN=your_token
DISCORD_CLIENT_ID=your_client_id
GEMINI_API_KEY=your_api_key
```

#### 2. Service Connection Failures
```bash
# Symptom: External service integration fails
# Check: Verify service URLs and credentials
REDIS_URL=redis://localhost:6379  # Check Redis is running
NEO4J_URI=bolt://localhost:7687    # Check Neo4j is accessible
QDRANT_URL=http://localhost:6333   # Check Qdrant is running
```

#### 3. Performance Issues
```bash
# Symptom: High response times or errors
# Solution: Adjust performance thresholds
PERFORMANCE_ALERT_THRESHOLD_RESPONSE_TIME=10000  # Increase threshold
PERFORMANCE_MAX_OPERATIONS_IN_MEMORY=5000        # Reduce memory usage
```

#### 4. Feature Conflicts
```bash
# Symptom: Services not working as expected
# Solution: Check feature flag combinations
ENABLE_ENHANCED_INTELLIGENCE=true     # Required for AI services
ENABLE_QDRANT_INTEGRATION=true        # Requires Qdrant URL
QDRANT_URL=http://localhost:6333      # Must be accessible
```

### Environment Variable Precedence

1. **Command Line**: `DISCORD_TOKEN=abc npm start`
2. **Environment File**: `.env`, `.env.local`, `.env.production`
3. **System Environment**: Variables set in shell/system
4. **Default Values**: Hardcoded defaults in application

### Configuration Testing

```bash
# Test configuration without starting the bot
npm run config:test

# Validate specific service configuration
npm run config:validate -- --service=performance-monitoring

# Check external service connectivity
npm run config:check-connections
```

## Best Practices

### 1. Environment Separation
- Use different `.env` files for each environment
- Never commit `.env` files to version control
- Use environment-specific configuration templates

### 2. Security
- Rotate API keys regularly
- Use environment variables for all secrets
- Limit permissions for service accounts

### 3. Monitoring
- Enable performance monitoring in all environments
- Set appropriate alert thresholds for each environment
- Monitor configuration drift between environments

### 4. Documentation
- Document all custom configuration changes
- Maintain configuration templates for new deployments
- Keep environment variable documentation up to date

## Conclusion

This comprehensive environment configuration guide provides all the settings needed to deploy Chatterbot with the full suite of AI enhancement services across different environments. Use the provided templates as starting points and customize based on your specific requirements and infrastructure setup.
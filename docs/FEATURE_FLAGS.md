# Feature Flags

All advanced features are **enabled by default** for optimal experience. Disable selectively via environment variables if needed.

## Core
- ENABLE_ENHANCED_INTELLIGENCE: Personalization, enhanced memory, MCP‑backed features *(enabled by default)*
- ENABLE_AGENTIC_INTELLIGENCE: Agent behaviors and tools *(enabled by default)*

## AI Enhancement Services (17 Advanced Capabilities)

*All AI Enhancement Services are **enabled by default** for production-ready performance.*

### Core Enhancement Services
- ENABLE_ENHANCED_OBSERVABILITY: Comprehensive conversation tracing and analytics with Langfuse integration *(enabled by default)*
- ENABLE_PERFORMANCE_MONITORING: Real-time performance tracking and alerting for all AI services *(enabled by default)*

### Cognitive Services
- ENABLE_SENTIMENT_ANALYSIS: Real-time emotion and sentiment detection for personalized responses *(enabled by default)*
- ENABLE_CONTEXT_MEMORY: Long-term conversation memory with intelligent retrieval and user preferences *(enabled by default)*
- ENABLE_CONVERSATION_SUMMARIZATION: Automatic conversation summarization for context efficiency *(enabled by default)*
- ENABLE_INTENT_RECOGNITION: Advanced intent classification and routing for appropriate response handling *(enabled by default)*
- ENABLE_RESPONSE_PERSONALIZATION: User-specific response adaptation based on interaction patterns *(enabled by default)*
- ENABLE_LEARNING_SYSTEM: Continuous learning from user interactions to improve response quality *(enabled by default)*
- ENABLE_CONVERSATION_THREADING: Intelligent conversation flow management and thread continuity *(enabled by default)*

### External Integration Services
- ENABLE_QDRANT_INTEGRATION: Advanced vector storage and similarity search with Qdrant database *(enabled by default)*
- ENABLE_KNOWLEDGE_GRAPH: Entity relationship mapping and semantic analysis with Neo4j integration *(enabled by default)*
- ENABLE_MULTIMODAL_PROCESSING: Advanced image analysis with OCR, object detection, and visual reasoning *(enabled by default)*
- ENABLE_WEB_CRAWLING: Intelligent web scraping and content extraction with Crawl4AI integration *(enabled by default)*
- ENABLE_RAG_OPTIMIZATION: Advanced RAG pipeline optimization with query analysis and adaptive retrieval *(enabled by default)*

### Evaluation and Monitoring
- ENABLE_AI_EVALUATION: Comprehensive performance benchmarking and quality assessment framework *(enabled by default)*
- ENABLE_PREDICTIVE_RESPONSES: Proactive response generation based on conversation patterns *(enabled by default)*

### Service-Specific Configuration

#### Enhanced Observability (Langfuse)
```env
ENABLE_ENHANCED_OBSERVABILITY=true
LANGFUSE_PUBLIC_KEY=pk-...
LANGFUSE_SECRET_KEY=sk-...
LANGFUSE_BASE_URL=https://cloud.langfuse.com
```

#### Performance Monitoring
```env
ENABLE_PERFORMANCE_MONITORING=true
PERFORMANCE_ALERT_THRESHOLD_ERROR_RATE=0.05
PERFORMANCE_ALERT_THRESHOLD_RESPONSE_TIME=5000
PERFORMANCE_RETENTION_HOURS=168
PERFORMANCE_DASHBOARD_REFRESH_INTERVAL=30000
```

#### Qdrant Vector Integration
```env
ENABLE_QDRANT_INTEGRATION=true
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=your-api-key
QDRANT_COLLECTION_NAME=chatterbot-vectors
```

#### Neo4j Knowledge Graph
```env
ENABLE_KNOWLEDGE_GRAPH=true
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=password
```

#### Multimodal Processing (Qwen VL)
```env
ENABLE_MULTIMODAL_PROCESSING=true
QWEN_VL_API_KEY=your-api-key
QWEN_VL_MODEL=qwen-vl-plus
```

#### Web Crawling (Crawl4AI)
```env
ENABLE_WEB_CRAWLING=true
CRAWL4AI_API_KEY=your-api-key
WEB_CRAWL_TIMEOUT=30000
WEB_CRAWL_MAX_PAGES=5
```

#### RAG Optimization (DSPy)
```env
ENABLE_RAG_OPTIMIZATION=true
RAG_OPTIMIZATION_MODEL=gpt-4
RAG_RETRIEVAL_LIMIT=10
RAG_CONTEXT_WINDOW=4000
```

## Verification
- ENABLE_ANSWER_VERIFICATION: Enable post‑generation verification
- CROSS_MODEL_VERIFICATION: Compare with alternative model outputs
- MAX_RERUNS: Reruns if low agreement (default 1)

## Retrieval & RAG
- FEATURE_PGVECTOR: Enable Postgres pgvector repository for vector‑first retrieval
- FEATURE_RERANK: Enable reranking for RAG candidates
	- RERANK_PROVIDER: cohere | voyage | auto (default: auto)
	- Cohere: COHERE_API_KEY, COHERE_RERANK_MODEL (e.g., rerank-english-v3.0 or rerank-3.5-mini)
	- Voyage: VOYAGE_API_KEY, VOYAGE_RERANK_MODEL (e.g., rerank-2.5)
	- Local (OSS): FEATURE_LOCAL_RERANK=true, LOCAL_RERANK_MODEL (default Xenova/all-MiniLM-L6-v2) — set RERANK_PROVIDER=local
- ENABLE_HYBRID_RETRIEVAL: Combine web + KB grounding path

## Providers / SDKs
- FEATURE_VERCEL_AI: Enable Vercel AI provider wrapper and streaming path
- FEATURE_OPENAI_RESPONSES: Use OpenAI Responses API path
- FEATURE_OPENAI_RESPONSES_TOOLS: Enable Responses API tools loop (pair with FEATURE_OPENAI_RESPONSES)
- FEATURE_LANGGRAPH: Enable LangGraph intent conditioning in response generation
  
### Observability / Proxy
- HELICONE_BASE_URL: e.g., https://oai.helicone.ai/v1 to route OpenAI traffic via Helicone
- HELICONE_API_KEY: Helicone gateway key to enable dashboards and rate policies
- HELICONE_CACHE_ENABLED=true to enable proxy‑side caching
- HELICONE_CACHE_MAX_AGE=300 to set Cache‑Control max‑age

### Tokenization
- FEATURE_PRECISE_TOKENIZER=true to enable gpt‑tokenizer for accurate counting
- TOKENIZER_ENCODING=cl100k_base (default) or other supported encodings

### Caching
- FEATURE_SEMANTIC_CACHE=true to enable semantic similarity response caching (in-memory + optional embeddings)
- REDIS_URL=redis://localhost:6379
- SEMANTIC_CACHE_TTL_MS=300000
- FEATURE_SEMANTIC_CACHE_PERSIST=true to persist semantic cache entries (embeddings+output) in Redis

## Orchestration
- FEATURE_TEMPORAL: Enable Temporal worker/runtime

## Telemetry
- FEATURE_PERSIST_TELEMETRY: Persist model selection telemetry in DB
- FEATURE_LANGFUSE: Enable Langfuse event logging (safe no-op if keys missing)
- LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY, LANGFUSE_BASE_URL (default cloud)

## Deployment Scenarios

*Note: All AI Enhancement Services are enabled by default. The following sections show how to configure specific scenarios or disable features if needed.*

### Default Configuration
All features are **enabled by default**. No additional configuration needed for full capabilities:
```bash
# All AI enhancement services enabled by default
# Just provide required API keys for services you want to use
OPENAI_API_KEY=your-api-key
GEMINI_API_KEY=your-gemini-key
```

### Minimal Configuration
To use minimal functionality, selectively disable AI enhancements:
```bash
ENABLE_ENHANCED_INTELLIGENCE=true
ENABLE_PERFORMANCE_MONITORING=true
# Disable specific services if needed:
ENABLE_SENTIMENT_ANALYSIS=false
ENABLE_CONTEXT_MEMORY=false
ENABLE_CONVERSATION_SUMMARIZATION=false
# ... (disable other services as needed)
```

### Custom Configuration Example
Example of selective feature control:
```bash
# Keep core intelligence but disable resource-intensive features
ENABLE_ENHANCED_INTELLIGENCE=true
ENABLE_PERFORMANCE_MONITORING=true
ENABLE_SENTIMENT_ANALYSIS=true
ENABLE_CONTEXT_MEMORY=true
ENABLE_INTENT_RECOGNITION=true
# Disable compute-intensive features if resources are limited
ENABLE_MULTIMODAL_PROCESSING=false
ENABLE_KNOWLEDGE_GRAPH=false
ENABLE_RAG_OPTIMIZATION=false

Examples:
```bash
ENABLE_ANSWER_VERIFICATION=true CROSS_MODEL_VERIFICATION=true MAX_RERUNS=1 npm run dev
FEATURE_PGVECTOR=true docker compose --profile postgres up -d
FEATURE_VERCEL_AI=true AI_API_KEY=sk-... npm run dev
FEATURE_RERANK=true RERANK_PROVIDER=cohere COHERE_API_KEY=... npm run dev
ENABLE_SENTIMENT_ANALYSIS=true ENABLE_CONTEXT_MEMORY=true npm run dev
```

## Related environment keys
- Providers: OPENAI_API_KEY, ANTHROPIC_API_KEY, GROQ_API_KEY, MISTRAL_API_KEY, OPENAI_COMPAT_API_KEY/BASE_URL/MODEL
- Tools: BRAVE_API_KEY, FIRECRAWL_API_KEY, ELEVENLABS_API_KEY, TENOR_API_KEY, STABILITY_API_KEY
- Verification: ENABLE_ANSWER_VERIFICATION, CROSS_MODEL_VERIFICATION, MAX_RERUNS
- Observability: ENABLE_ANALYTICS_DASHBOARD, ANALYTICS_DASHBOARD_PORT, HEALTH_CHECK_PORT
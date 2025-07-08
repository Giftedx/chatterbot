# Discord Gemini Bot - Enterprise Grade

A **production-ready** Discord bot with advanced AI integration. Built with **TypeScript** and **Discord.js v14**, featuring streaming responses, comprehensive moderation, analytics, and enterprise deployment capabilities.

---

## ✨ Features

### 🤖 Advanced AI Integration

* **Streaming responses** with real-time updates and interactive controls
* **Multimodal support** - text and image processing with Gemini 1.5-flash
* **Persona system** - customizable AI personalities per guild/channel
* **Context management** - conversation history and continuity
* **Rate limiting** - intelligent API usage management

### 🛡️ Safety & Moderation

* **Text content filtering** - automated safety checks
* **Image safety moderation** - NSFW and harmful content detection
* **Configurable safety levels** - per-guild moderation settings

### 📊 Analytics & Monitoring

* **Usage analytics** - detailed command and user metrics
* **REST API dashboard** - real-time statistics and insights
* **Performance monitoring** - API usage and cost tracking
* **Admin statistics** - guild-level usage reports

### 🚀 Production Features

* **Docker containerization** - multi-stage builds with security hardening
* **Health checks** - automated monitoring and recovery
* **Horizontal scaling** - cloud-ready deployment
* **Comprehensive testing** - 20+ test suites with full coverage

---

## 🚀 Quick Start

```bash
# 1. Clone & install
npm install

# 2. Configure environment vars (.env)
DISCORD_TOKEN=<your_bot_token>
DISCORD_CLIENT_ID=<your_app_id>
GEMINI_API_KEY=<your_gemini_key>

# 3. Run database migrations (first time)
npx prisma migrate dev --name init

# 4. Run in dev mode (TSX watcher)
npm run dev
```

The bot will register advanced slash commands automatically:

```bash
/gemini prompt: Hello    # AI conversation with streaming responses
/persona list           # Manage AI personalities
/persona set <name>     # Switch persona
/stats                  # View usage analytics (admin)
```

---

## 🎮 Commands

| Command | Description | Features |
|---------|------------|----------|
| `/gemini <prompt> [image]` | AI conversation | Streaming responses, multimodal, context-aware |
| `/persona list` | List available personas | Built-in personalities + custom |
| `/persona set <name>` | Switch active persona | Per-guild settings |
| `/persona create <name> <prompt>` | Create custom persona | Admin-only custom personalities |
| `/stats` | Usage statistics | Admin analytics dashboard |

---

## 🛠️ Scripts

| Script | Purpose | Features |
|--------|---------|----------|
| `npm run dev` | Development mode | TSX watcher, hot reload |
| `npm run build` | Production build | TypeScript compilation |
| `npm start` | Production start | Compiled JS execution |
| `npm test` | Test suite | 20+ comprehensive tests |
| `npm run lint` | Code quality | ESLint validation |
| `npm run deploy:prod` | Production deploy | Docker build + deploy |

---

## 📁 Project Structure

```text
.
├── src/
│   ├── index.ts                    # Main bot entry with streaming
│   ├── services/
│   │   ├── gemini.service.ts       # Advanced Gemini API integration
│   │   ├── persona-manager.ts      # Personality management
│   │   ├── analytics.ts            # Usage analytics
│   │   ├── analytics-dashboard.ts  # REST API server
│   │   └── context-manager.ts      # Conversation history
│   ├── moderation/
│   │   ├── text-filters.ts         # Text safety moderation
│   │   └── image-safety.ts         # Image content filtering
│   ├── ui/
│   │   ├── components.ts           # Interactive UI components
│   │   └── stream-utils.ts         # Real-time streaming
│   ├── utils/
│   │   ├── rate-limiter.ts         # API rate management
│   │   └── image-helper.ts         # Multimodal processing
│   └── db/
│       └── prisma.ts               # Database client
├── prisma/
│   └── schema.prisma               # Database schema
├── __tests__/                      # Comprehensive test suite
├── Dockerfile                      # Production container
├── docker-compose.yml              # Orchestration
└── deploy.sh                       # Automated deployment
```

---

## 🗄️ Database & Personas

The bot uses **Prisma ORM** with **SQLite** for development and **PostgreSQL** for production.

### Database Commands

```bash
# Initialize database
npx prisma migrate dev --name init

# Open database browser
npx prisma studio

# Production deployment
npx prisma migrate deploy
```

### Built-in Personas

* **friendly** - Warm, helpful assistant
* **professional** - Business-focused responses  
* **creative** - Artistic and imaginative
* **technical** - Developer and engineering focused
* **sarcastic** - Witty with attitude

### Custom Personas

Administrators can create guild-specific personas:

```bash
/persona create mentor "You are a wise mentor who provides thoughtful guidance..."
```

---

## 📝 Environment Variables

| Variable | Description | Required |
|----------|------------|----------|
| `DISCORD_TOKEN` | Bot token from Discord developer portal | ✅ |
| `DISCORD_CLIENT_ID` | Application / client ID | ✅ |
| `GEMINI_API_KEY` | Google Gemini API key | ✅ |
| `ENABLE_ANALYTICS_DASHBOARD` | Enable analytics API (true/false) | ❌ |
| `ANALYTICS_DASHBOARD_PORT` | Analytics API port (default: 3001) | ❌ |
| `NODE_ENV` | Environment (development/production) | ❌ |
| `DATABASE_URL` | Database connection string | ❌ |

Create a `.env` file (see `.env.example`). Values are loaded automatically via `dotenv`.

---

## 🐳 Production Deployment

### Docker (Recommended)

```bash
# Quick deployment
npm run deploy:prod

# Or manual steps:
npm run build
npm run docker:build  
npm run docker:run
```

### Advanced Deployment

```bash
# Full stack with analytics dashboard
npm run deploy:analytics

# View logs
npm run docker:logs

# Stop services
npm run docker:stop
```

### Cloud Deployment

The bot is ready for deployment on:

* **Railway** - `railway up`
* **Render** - Connect GitHub repo
* **fly.io** - `flyctl deploy`
* **DigitalOcean** - Docker droplet
* **AWS ECS** - Container service

---

## 📊 Analytics Dashboard

When `ENABLE_ANALYTICS_DASHBOARD=true`, access analytics at:

* **Health**: `http://localhost:3001/health`
* **Statistics**: `http://localhost:3001/api/stats`
* **Metrics**: `http://localhost:3001/api/metrics?timeRange=today`
* **Overview**: `http://localhost:3001/api/overview`

### API Endpoints

| Endpoint | Description | Parameters |
|----------|------------|------------|
| `GET /api/stats` | Detailed usage statistics | None |
| `GET /api/metrics` | Usage metrics with time filtering | `timeRange: today\|week\|month\|all` |
| `GET /api/overview` | Summary dashboard data | None |

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Test coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

**Test Coverage**: 20+ comprehensive tests covering:

* Persona management and switching
* Analytics collection and reporting  
* Context management and history
* Image processing and safety
* Rate limiting and API usage
* Database operations

---

## 🔐 Security Features

### Content Moderation

* **Automated text filtering** - keyword and pattern detection
* **Image safety scanning** - NSFW and harmful content blocking
* **Configurable thresholds** - per-guild safety levels
* **Admin overrides** - manual content approval

### System Security

* **Non-root containers** - security-hardened Docker images
* **Input validation** - comprehensive sanitization
* **Rate limiting** - API abuse prevention
* **Error handling** - graceful failure management

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feat/amazing-feature`
3. Add comprehensive tests for new features
4. Ensure all tests pass: `npm test`
5. Submit pull request with detailed description

### Development Guidelines

* Follow TypeScript strict mode
* Maintain 100% test coverage for new features
* Use conventional commit messages
* Update documentation for new features

---

## 📄 License

MIT © 2025 - See [LICENSE](LICENSE) file for details.

---

## 🏆 Enterprise Features

This Discord bot includes enterprise-grade capabilities:

✅ **High Availability** - Health checks and auto-recovery  
✅ **Horizontal Scaling** - Multi-instance deployment support  
✅ **Comprehensive Monitoring** - Analytics and performance metrics  
✅ **Advanced Security** - Multi-layer content moderation  
✅ **Production Ready** - Docker containerization with best practices  
✅ **API Integration** - RESTful analytics dashboard  
✅ **Database Management** - Migration system with Prisma ORM

Perfect for communities requiring professional-grade AI integration with Discord.

---

*Want to see it in action? Join our [Discord Server](https://discord.gg/your-server) for a live demo!*

```bash
# Made with ❤️ by the Discord Gemini Bot team
echo "Ready for production deployment!"
```

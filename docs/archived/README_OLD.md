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

```
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

- **friendly** - Warm, helpful assistant
- **professional** - Business-focused responses  
- **creative** - Artistic and imaginative
- **technical** - Developer and engineering focused
- **sarcastic** - Witty with attitude

### Custom Personas

Administrators can create guild-specific personas:

```bash
/persona create mentor "You are a wise mentor who provides thoughtful guidance..."
```
The bot now persists data in a local **SQLite** database managed by **Prisma ORM**.

Commands:

```bash
# Initialize / apply pending migrations
npx prisma migrate dev
# Open Prisma Studio for inspection
npx prisma studio
```

The Prisma client is instantiated once in `src/db/prisma.ts`, and models are defined in `prisma/schema.prisma` (`Persona`, `AnalyticsEvent`).

## 📝 Environment Variables

| Variable            | Description                          |
|---------------------|--------------------------------------|
| `DISCORD_TOKEN`     | Bot token from Discord developer portal |
| `DISCORD_CLIENT_ID` | Application / client ID                |
| `GEMINI_API_KEY`    | Google Gemini API key                  |

Create a `.env` file (see `.env.example`). Values are loaded automatically via `dotenv`.

---

## 🐳 Docker (optional)

```Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist/ ./dist/
COPY .env.example ./
CMD ["node", "dist/index.js"]
```

Build & run:
```bash
docker build -t discord-gemini-bot .
docker run -e DISCORD_TOKEN -e DISCORD_CLIENT_ID -e GEMINI_API_KEY discord-gemini-bot
```

---

## 🤝 Contributing

1. Fork the repo
2. `git checkout -b feat/<name>`
3. Add tests for new features
4. Submit PR

---

## License

MIT © 2025

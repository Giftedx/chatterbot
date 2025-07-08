# Discord Gemini Bot - MVP

A **Discord AI bot** built with **TypeScript** and **Discord.js v14** that provides AI conversation capabilities using Google Gemini. This is an **MVP (Minimum Viable Product)** with solid core functionality and room for expansion.

## ⚠️ Current Status: MVP

**What Actually Works:**
- ✅ Basic Discord bot with AI conversation via `/gemini` command
- ✅ Google Gemini integration with streaming responses
- ✅ Persona system (built-in + custom personas)
- ✅ User memory and conversation context
- ✅ Basic invisible intelligence via `/optin` command
- ✅ Image processing (multimodal AI)
- ✅ Basic analytics and usage tracking
- ✅ SQLite database with Prisma ORM

**What Needs Work:**
- ❌ TypeScript compilation has 274 errors across 31 files
- ❌ Advanced MCP tool integration (architecture exists, but broken)
- ❌ Enhanced invisible intelligence service (compilation errors)
- ❌ Test coverage is limited (documentation claims are overstated)
- ❌ Many advanced features are planned but not implemented

---

## ✨ Working Features

### 🤖 Core AI Integration

- **Basic AI conversation** via `/gemini` command with Google Gemini 1.5-flash
- **Streaming responses** with real-time updates
- **Image processing** (multimodal AI) - analyze uploaded images
- **Context awareness** - maintains conversation history per channel
- **Rate limiting** - prevents API abuse (10 requests/minute per user)

### 👤 Persona System

- **Built-in personas** (friendly, professional, sarcastic, etc.)
- **Custom persona creation** via `/persona create` command
- **Per-guild persona settings** - each Discord server can have its own active persona
- **Persona switching** via `/persona set` command

### 🧠 Basic Invisible Intelligence

- **`/optin` command** enables natural conversation mode
- **Automatic AI processing** of messages and images
- **Memory integration** - remembers user preferences and context
- **Smart content detection** - processes uploads automatically

### 📊 Analytics & Data

- **Usage tracking** - commands, users, success rates
- **Basic statistics** via `/stats` command (admin-only)
- **SQLite database** with Prisma ORM for data persistence
- **Optional analytics dashboard** (REST API at port 3001)

### 🛡️ Safety Features

- **Basic text filtering** - keyword-based content moderation
- **Image safety checks** - NSFW detection for uploaded images
- **Error handling** - graceful failure management

---

## 🚀 Quick Start

```bash
# 1. Clone and install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env
# Edit .env with your tokens:
# DISCORD_TOKEN=your_bot_token
# DISCORD_CLIENT_ID=your_app_id  
# GEMINI_API_KEY=your_gemini_key

# 3. Set up database
npx prisma migrate dev --name init

# 4. Start development server
npm run dev
```

**Note:** The bot works in development mode despite TypeScript compilation errors.

The bot will register these working commands:

- `/gemini <prompt> [image]` - AI conversation with optional image
- `/optin [enable]` - Enable/disable invisible intelligence mode
- `/persona list` - Show available personas
- `/persona set <name>` - Switch active persona
- `/persona create <name> <prompt>` - Create custom persona (admin)
- `/stats` - Show usage statistics (admin only)

---

## 🎮 Available Commands

| Command | Description | Status |
|---------|------------|--------|
| `/gemini <prompt> [image]` | AI conversation with Gemini | ✅ Working |
| `/optin [enable]` | Enable natural conversation mode | ✅ Working |
| `/persona list` | List available personas | ✅ Working |
| `/persona set <name>` | Switch active persona | ✅ Working |
| `/persona create <name> <prompt>` | Create custom persona | ✅ Working |
| `/stats` | View usage analytics | ✅ Working |

---

## 🛠️ Development Status

| Script | Purpose | Status |
|--------|---------|--------|
| `npm run dev` | Development with hot reload | ✅ Working |
| `npm run build` | TypeScript compilation | ❌ 274 errors |
| `npm start` | Run compiled version | ⚠️ Works if build succeeds |
| `npm test` | Run test suite | ⚠️ Limited test coverage |
| `npm run lint` | Code quality check | ✅ Working |

---

## 📁 Project Structure

```text
src/
├── index.ts                    # Main bot entry point (working)
├── services/
│   ├── gemini.service.ts      # Gemini API integration (working)
│   ├── persona-manager.ts     # Persona management (working)
│   ├── analytics.ts           # Usage analytics (working)
│   ├── context-manager.ts     # Conversation history (working)
│   └── enhanced-invisible-intelligence.service.ts  # ❌ Broken
├── commands/
│   ├── invisible-intelligence.service.ts  # ✅ Working
│   └── super-invisible-intelligence.service.ts  # ❌ Broken
├── memory/
│   └── user-memory.service.ts # ✅ Working
├── moderation/
│   └── text-filters.ts        # ✅ Basic working
├── ui/
│   ├── components.ts          # ✅ Working
│   └── stream-utils.ts        # ✅ Working
└── utils/
    ├── rate-limiter.ts        # ✅ Working
    └── image-helper.ts        # ✅ Working
```

---

## 🗄️ Database

Uses **Prisma ORM** with **SQLite** for development:

```bash
# View database
npx prisma studio

# Create migration
npx prisma migrate dev --name description

# Reset database
npx prisma migrate reset
```

### Built-in Personas

- **friendly** - Warm, helpful assistant
- **professional** - Business-focused responses  
- **sarcastic** - Witty responses with attitude
- **technical** - Developer-focused explanations

---

## 📝 Environment Variables

Create a `.env` file with:

```env
DISCORD_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_discord_app_id
GEMINI_API_KEY=your_google_gemini_key

# Optional
ENABLE_ANALYTICS_DASHBOARD=true
ANALYTICS_DASHBOARD_PORT=3001
NODE_ENV=development
```

---

## 🐳 Docker Support

Basic Docker setup is available:

```bash
# Build image
npm run docker:build

# Run with docker-compose
npm run docker:run

# View logs
npm run docker:logs
```

---

## 🔧 Known Issues

### TypeScript Compilation Errors (274 total)

The main issues preventing clean compilation:

1. **Enhanced services** - Advanced invisible intelligence has broken imports
2. **MCP integration** - Mock implementations have type mismatches
3. **Test files** - Many tests have async/await issues
4. **Advanced features** - Many planned features have incomplete implementations

### What's Broken

- Enhanced invisible intelligence service (compilation errors)
- Advanced MCP tool integration (mock implementations)
- Many advanced features in `src/commands/` and `src/multimodal/`
- Test coverage doesn't match documentation claims

### What Works Despite Errors

The core bot functionality works in development mode because TypeScript compilation errors don't prevent runtime execution for the working features.

---

## 🚧 Development Roadmap

### Phase 1: Fix Core Issues
- [ ] Resolve TypeScript compilation errors
- [ ] Fix enhanced invisible intelligence service
- [ ] Clean up broken imports and mock implementations

### Phase 2: MCP Integration
- [ ] Implement real MCP tool connections
- [ ] Add proper memory graph integration
- [ ] Connect web search and browser automation

### Phase 3: Testing & Documentation
- [ ] Add comprehensive test coverage
- [ ] Update documentation to match reality
- [ ] Implement proper CI/CD pipeline

### Phase 4: Advanced Features
- [ ] Complete multimodal integration
- [ ] Add production monitoring
- [ ] Implement feature flags

---

## 🤝 Contributing

This project has good architecture but needs technical fixes:

1. **Start with TypeScript fixes** - Nothing else works until compilation is clean
2. **Focus on working features first** - Don't break what's currently functional
3. **Test incrementally** - Ensure working features continue to work
4. **Document honestly** - Match claims to actual implementation

---

## 📄 License

MIT © 2025

---

## 🎯 Summary

This is a **solid MVP Discord bot** with good architecture and working core features. The main issues are:

- **Overstated documentation** - Claims don't match implementation
- **TypeScript compilation errors** - 274 errors need fixing
- **Incomplete advanced features** - Many planned features not implemented

The bot works well for basic AI conversation, persona management, and invisible intelligence. It's a good foundation for expansion once the compilation issues are resolved.

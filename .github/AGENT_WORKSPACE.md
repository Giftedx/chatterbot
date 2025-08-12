# Agent Development Workspace

This workspace is specifically configured for GitHub Copilot agents and collaborative AI development.

## Workspace Configuration

### IDE Settings
```json
{
  "typescript.preferences.includePackageJsonAutoImports": "on",
  "typescript.suggest.autoImports": true,
  "typescript.updateImportsOnFileMove.enabled": "always",
  "eslint.validate": ["typescript", "javascript"],
  "jest.autoRun": "off",
  "files.associations": {
    "*.mjs": "javascript"
  },
  "files.exclude": {
    "**/node_modules": false,
    "**/.git": true,
    "**/dist": true,
    "**/coverage": true
  }
}
```

### Debugging Configuration
```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Bot",
  "program": "${workspaceFolder}/src/index.ts",
  "runtimeArgs": ["--loader", "tsx/esm"],
  "env": {
    "NODE_ENV": "development",
    "DEBUG": "*"
  },
  "console": "integratedTerminal",
  "skipFiles": ["<node_internals>/**"]
}
```

## Agent-Specific Tools

### Quick Validation
```bash
# Complete environment validation
node scripts/agent-env-validator.mjs

# Quick health check
npm run dev:health && curl http://localhost:3000/health

# Generate comprehensive context
node scripts/context-snapshot.mjs
```

### Development Workflow
```bash
# 1. Setup (run once)
cp env.example .env
npm install

# 2. Validate environment
node scripts/agent-env-validator.mjs

# 3. Run tests
npm test

# 4. Start development
npm run dev:health
```

### Code Quality Checks
```bash
# Run all quality checks
npm run lint
npm test
npm run typecheck  # May fail - see known issues

# Fix formatting
npm run format
```

## AI Agent Integration

### Context Files Priority
1. `.github/COPILOT_INSTRUCTIONS.md` - **Primary context**
2. `docs/ARCHITECTURE.md` - System overview  
3. `docs/context/agent-brief.md` - Working agreements
4. `package.json` - Dependencies and scripts

### Common Agent Tasks

#### Environment Setup
```bash
# Verify all requirements
node scripts/agent-env-validator.mjs

# Check specific components
node scripts/verify-env.mjs --strict
```

#### Code Analysis
```bash
# Generate full repository snapshot
node scripts/context-snapshot.mjs

# Check architecture compliance
npm run lint

# Validate TypeScript
npm run typecheck
```

#### Testing and Validation
```bash
# Run comprehensive test suite
npm test

# Check health endpoints
npm run dev:health &
sleep 2
curl http://localhost:3000/health
curl http://localhost:3000/metrics
kill %1
```

### Known Limitations

#### Network Restrictions
Some domains may be blocked in agent environments:
- `binaries.prisma.sh` - Prisma binary downloads
- `example.com`, `test.com` - Test domains
- External APIs without allowlist approval

#### Build Issues
- TypeScript build may fail due to Prisma client issues
- Use `tsx` for development instead of compiled builds
- CI handles these gracefully with `continue-on-error`

### Agent Best Practices

#### Code Changes
- Make small, incremental changes
- Test frequently with `npm test`
- Validate with `npm run lint`
- Use `npm run dev:health` for quick checks

#### Context Management
- Always read `.github/COPILOT_INSTRUCTIONS.md` first
- Generate snapshots before major changes
- Update documentation when adding features
- Maintain environment variable examples

#### Error Handling
- Check logs for Prisma client issues
- Use health endpoints for validation
- Validate environment setup first
- Follow graceful degradation patterns

## Troubleshooting

### Common Issues

#### "MediaFile export not found"
- **Cause**: Incomplete Prisma client generation
- **Solution**: Use `tsx` for development, ignore build errors
- **Status**: Known issue, documented in CI

#### Tests failing
- **Check**: Environment variables set correctly
- **Check**: Dependencies installed (`npm install`)
- **Check**: Database accessible (health endpoint)

#### Health check failing
- **Check**: Port 3000 available
- **Check**: Environment variables in `.env`
- **Check**: Dependencies installed

#### Network timeouts
- **Check**: Allowlist configuration
- **Check**: Firewall settings
- **Check**: External service availability

### Getting Help

#### Documentation
- `.github/COPILOT_AGENT_SETUP.md` - Complete setup guide
- `.github/COPILOT_INSTRUCTIONS.md` - Architecture guide
- `docs/ARCHITECTURE.md` - System overview
- `docs/context/agent-brief.md` - Quick reference

#### Validation Tools
- `node scripts/agent-env-validator.mjs` - Environment check
- `node scripts/verify-env.mjs` - Configuration check  
- `node scripts/context-snapshot.mjs` - Generate overview

#### Support Commands
```bash
# Comprehensive diagnostics
node scripts/agent-env-validator.mjs > diagnostics.txt

# Quick status check
npm run dev:health && echo "Health OK"

# Test core functionality
npm test -- --testNamePattern="core"
```

This workspace is optimized for AI agent collaboration while maintaining compatibility with human development workflows.
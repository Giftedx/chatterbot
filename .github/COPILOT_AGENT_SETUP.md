# GitHub Copilot Agent Setup Guide

This document provides comprehensive setup and configuration for optimal GitHub Copilot agent collaboration within this repository.

## Quick Setup Checklist

- [ ] Environment variables configured (see `env.example`)
- [ ] Dependencies installed (`npm install`)
- [ ] Database setup completed (`npx prisma generate`)
- [ ] Tests passing (`npm test`)
- [ ] Health check working (`npm run dev:health`)

## Agent Context Files

The following files provide essential context for AI agents:

### Primary Context
- `.github/COPILOT_INSTRUCTIONS.md` - Complete bot architecture and patterns
- `docs/ARCHITECTURE.md` - High-level system overview
- `docs/context/agent-brief.md` - Working agreements and commands
- `package.json` - Dependencies and available scripts

### Development Context
- `env.example` - Required environment variables
- `tsconfig.json` - TypeScript configuration
- `jest.config.js` - Test configuration
- `Makefile` - Common development tasks

### Code Structure
- `src/index.ts` - Main entry point
- `src/services/` - Core business logic
- `src/test/` - Test utilities and setup

## Commands for Agents

### Validation Commands (Always Safe)
```bash
# Lint code (5 seconds)
npm run lint

# Run test suite (37 seconds, 540/541 tests pass)
npm test

# Health-only server (works without tokens)
npm run dev:health
```

### Environment Commands
```bash
# Verify environment setup
node scripts/verify-env.mjs

# Generate repository snapshot
node scripts/context-snapshot.mjs

# Copy environment template
cp env.example .env
```

### Development Commands
```bash
# Development server (TypeScript via tsx)
npm run dev

# Type checking (may fail due to Prisma issues)
npm run typecheck

# Build (may fail due to Prisma issues)
npm run build
```

### Database Commands
```bash
# Generate Prisma client (may fail in restricted environments)
npx prisma generate

# Push schema changes
npx prisma db push

# View database
npx prisma studio
```

## Known Issues & Workarounds

### Prisma Client Issues
- **Problem**: `Module '"@prisma/client"' has no exported member 'MediaFile'`
- **Cause**: Incomplete Prisma client generation in restricted environments
- **Workaround**: Use `tsx` for development, accept build/typecheck failures in CI

### Network Restrictions
The following domains may be blocked in Copilot agent environments:
- `binaries.prisma.sh` (Prisma binary downloads)
- External test domains (`example.com`, `test.com`, etc.)

### Docker Build Issues
- **Problem**: Build fails due to missing `tsconfig.json`
- **Cause**: File excluded in `.dockerignore` but required by Dockerfile
- **Status**: Known issue, documented in CI

## Best Practices for Agents

### File Structure Understanding
```
src/
├── index.ts                 # Main bot entry point
├── services/               # Business logic
│   ├── intelligence/       # AI service modules  
│   ├── core/              # Shared services
│   └── enhanced-intelligence/ # Advanced features
├── test/                  # Test utilities
├── mcp/                   # MCP tool wrappers
└── utils/                 # Shared utilities
```

### Testing Strategy
- **Unit Tests**: Fast, isolated component tests
- **Integration Tests**: Service interaction validation
- **Property Tests**: Edge case discovery with `fast-check`
- **Performance Tests**: Rate limiting and optimization

### Code Patterns
- **ESM Modules**: Always use `.js` extensions in imports
- **Dependency Injection**: Constructor injection for testability
- **Graceful Degradation**: Fallbacks when external services fail
- **Type Safety**: Comprehensive TypeScript interfaces

### Environment Management
- **Feature Flags**: Environment-based intelligence levels
- **Configuration**: Externalized via environment variables
- **Secrets**: Never commit, use GitHub Secrets
- **Validation**: Automatic environment checking

## Agent Workflow

### Initial Setup
1. Read `.github/COPILOT_INSTRUCTIONS.md` for complete context
2. Run `node scripts/verify-env.mjs` to check environment
3. Execute `npm install` (allow 120+ seconds)
4. Validate with `npm run lint` and `npm test`

### Development Workflow
1. Make small, incremental changes
2. Test frequently with `npm run lint` and `npm test`
3. Use `npm run dev:health` for quick validation
4. Generate snapshots with `node scripts/context-snapshot.mjs`

### Debugging Process
1. Check health endpoint: `curl http://localhost:3000/health`
2. Review logs for error patterns
3. Validate environment with `node scripts/verify-env.mjs`
4. Use TypeScript strict checking: `npm run typecheck`

## Collaboration Guidelines

### Communication
- Use clear, descriptive commit messages
- Document complex changes in code comments
- Update relevant documentation files
- Follow existing code style and patterns

### Quality Standards
- All tests must pass (540/541 expected)
- Code must lint without errors
- Changes should maintain backward compatibility
- Performance regressions should be avoided

### Change Management
- Make minimal, focused changes
- Test thoroughly before submitting
- Document breaking changes clearly
- Provide migration paths when needed

## Troubleshooting

### Common Issues
1. **Tests Failing**: Check environment setup, ensure all dependencies installed
2. **TypeScript Errors**: Known Prisma issues, use workarounds documented
3. **Health Check Failing**: Verify port 3000 availability, check environment
4. **Performance Issues**: Review resource usage, check for memory leaks

### Getting Help
- Review existing documentation in `docs/` directory
- Check GitHub issues for known problems
- Examine test output for specific error details
- Use debug scripts in `scripts/` directory

## Advanced Configuration

### Custom Environment Setup
See `.github/copilot-extensions.yml` for advanced agent configuration including:
- Pre-installed dependencies
- Environment variable setup
- Command allowlists
- Performance optimizations

### CI/CD Integration
The repository includes comprehensive CI pipelines:
- **ci.yml**: Core validation (lint, test, optional build)
- **ci-cd.yml**: Full deployment pipeline
- Both handle known issues gracefully

This setup ensures optimal collaboration between human developers and AI agents while maintaining code quality and system reliability.
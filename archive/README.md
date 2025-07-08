# Archive Directory

This directory contains legacy files, outdated code, and historical documents that are no longer used in the current production system but are preserved for reference.

## Directory Structure

### `legacy-source/`
Legacy source code files that have been replaced by the unified intelligence architecture:

#### Replaced Index Files:
- `index-old.ts` - Original bot entry point before modularization
- `index-unified.ts` - Intermediate version during refactoring
- `index.ts.backup` - Backup of index file during major changes

#### Legacy Command System:
- `commands/` - Entire legacy command directory (replaced by unified intelligence service)
  - `invisible-intelligence.service.ts` - Old invisible intelligence implementation
  - `super-invisible-intelligence.service.ts` - Advanced command prototype
  - `conversation.commands.ts` - Legacy conversation commands
  - `memory-commands.ts` - Legacy memory management commands
  - `moderation-commands.ts` - Legacy moderation commands
  - `multimodal.commands.ts` - Legacy multimodal commands
  - `command-registry.ts` - Old command registration system

#### Legacy Test Files:
- `integration_tests.ts` - Old integration test suite
- `testing_infrastructure.ts` - Legacy testing setup
- `test-unified-service.js` - Early unified service tests

#### Legacy Configuration:
- `discord-gemini-bot.tsx` - Original bot implementation
- `discord-gemini-bot-complete.tsx` - Complete legacy implementation
- `eslint_config.js` - Old ESLint configuration
- `updated_package_json.json` - Legacy package.json updates

#### Debug and Build Files:
- `debug-attachment.js` - Legacy debugging utilities
- `build.log` - Historical build output logs

### `zone-identifier-files/`
Windows Zone.Identifier files that were automatically downloaded with various assets:
- Various `*.Zone.Identifier` files from file downloads

## Why These Files Are Archived

### Legacy Source Code
The original command-based architecture was replaced with a unified intelligence service that:
- Provides simpler user experience (single `/optin` command)
- Offers more sophisticated AI-driven feature selection
- Maintains better separation of concerns through modular services
- Delivers better performance and maintainability

### Zone Identifier Files
These Windows-specific metadata files serve no purpose in the Linux development environment and were cluttering the project structure.

## Important Notes

- **Do not restore these files** - They are incompatible with the current architecture
- **Historical reference only** - Preserved for understanding project evolution
- **Current implementation** - See `src/services/unified-intelligence.service.ts` for the modern approach

## Related Documentation

- [Main README](../README.md) - Current project status and architecture
- [Architecture Documentation](../docs/architecture/) - Modern system design
- [Development Documentation](../docs/development/) - Current development process

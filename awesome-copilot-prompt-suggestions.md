# Awesome GitHub Copilot Prompt Suggestions

Analysis of relevant GitHub Copilot prompt files from the [awesome-copilot repository](https://github.com/github/awesome-copilot/tree/main/prompts) compared against existing prompts in this repository.

## Repository Context Analysis

**Current Repository Pattern Detection:**

- 🖥️ **Primary Tech Stack**: TypeScript, Node.js, Discord.js
- 🤖 **AI Integration**: Gemini API, MCP (Model Context Protocol)
- 🧪 **Testing Framework**: Jest with comprehensive test coverage
- 📦 **Package Management**: npm
- 🛠️ **Build System**: TypeScript compilation
- 📊 **Database**: Prisma ORM with SQLite/PostgreSQL
- 🔧 **Development Tools**: ESM modules, tsx workflow

**Existing Local Prompt Coverage (34 prompts total):**

- Documentation generation and updates
- ADR (Architectural Decision Records) creation
- Component documentation standards
- JavaScript/TypeScript/Jest testing guidance
- Implementation planning workflows
- GitHub integration templates

## Suggested Awesome-Copilot Prompts

| Awesome-Copilot Prompt | Description | Status | Similar Local Prompt | Suggestion Rationale |
|-------------------------|-------------|--------|---------------------|---------------------|
| [Multi Stage Dockerfile](https://github.com/github/awesome-copilot/blob/main/prompts/multi-stage-dockerfile.prompt.md) | Create optimized multi-stage Dockerfiles for any language or framework | ❌ Not installed | None | Would enhance containerization workflow for the Discord bot deployment |
| [My Issues](https://github.com/github/awesome-copilot/blob/main/prompts/my-issues.prompt.md) | List my issues in the current repository | ❌ Not installed | None | Useful for issue management in active development project |
| [My Pull Requests](https://github.com/github/awesome-copilot/blob/main/prompts/my-pull-requests.prompt.md) | List my pull requests in the current repository | ❌ Not installed | None | Would streamline PR review workflow for development team |
| [Update Markdown File Index](https://github.com/github/awesome-copilot/blob/main/prompts/update-markdown-file-index.prompt.md) | Update a markdown file section with an index/table of files from a specified folder | ❌ Not installed | None | Helpful for maintaining documentation indexes like README files |
| [Comment Code Generate A Tutorial](https://github.com/github/awesome-copilot/blob/main/prompts/comment-code-generate-a-tutorial.prompt.md) | Transform Python script into a polished, beginner-friendly project with tutorial | ❌ Not installed | None | Could help create educational content for the AI bot codebase |
| [Entity Framework Core Best Practices](https://github.com/github/awesome-copilot/blob/main/prompts/ef-core.prompt.md) | Get best practices for Entity Framework Core | ❌ Not installed | None | Not directly applicable (project uses Prisma ORM) |
| [Spring Boot Best Practices](https://github.com/github/awesome-copilot/blob/main/prompts/java-springboot.prompt.md) | Get best practices for developing applications with Spring Boot | ❌ Not installed | None | Not applicable (TypeScript/Node.js project) |
| [Create LLMs.txt File](https://github.com/github/awesome-copilot/blob/main/prompts/create-llms.prompt.md) | Create an llms.txt file from scratch based on repository structure | ❌ Not installed | None | Highly relevant for AI-focused repository documentation |
| [Update LLMs.txt File](https://github.com/github/awesome-copilot/blob/main/prompts/update-llms.prompt.md) | Update the llms.txt file to reflect changes in documentation | ❌ Not installed | None | Complementary to create-llms prompt for ongoing maintenance |
| [C# Documentation Best Practices](https://github.com/github/awesome-copilot/blob/main/prompts/csharp-docs.prompt.md) | Ensure C# types are documented with XML comments | ❌ Not installed | None | Not applicable (TypeScript project) |
| [ASP.NET Minimal API with OpenAPI](https://github.com/github/awesome-copilot/blob/main/prompts/aspnet-minimal-api-openapi.prompt.md) | Create ASP.NET Minimal API endpoints with proper OpenAPI documentation | ❌ Not installed | None | Not applicable (Discord bot, not web API) |

## High Priority Recommendations

### 🎯 **Immediate Value**

1. **[Multi Stage Dockerfile](https://github.com/github/awesome-copilot/blob/main/prompts/multi-stage-dockerfile.prompt.md)** - Essential for production deployment
2. **[Create LLMs.txt File](https://github.com/github/awesome-copilot/blob/main/prompts/create-llms.prompt.md)** - Perfect for AI-focused repository
3. **[Update LLMs.txt File](https://github.com/github/awesome-copilot/blob/main/prompts/update-llms.prompt.md)** - Maintenance companion to create-llms

### 🔧 **Development Workflow Enhancement**

1. **[My Issues](https://github.com/github/awesome-copilot/blob/main/prompts/my-issues.prompt.md)** - Issue management automation
2. **[My Pull Requests](https://github.com/github/awesome-copilot/blob/main/prompts/my-pull-requests.prompt.md)** - PR workflow optimization
3. **[Update Markdown File Index](https://github.com/github/awesome-copilot/blob/main/prompts/update-markdown-file-index.prompt.md)** - Documentation maintenance

### 📚 **Educational Content**

1. **[Comment Code Generate A Tutorial](https://github.com/github/awesome-copilot/blob/main/prompts/comment-code-generate-a-tutorial.prompt.md)** - Creating educational content from codebase

## Installation Instructions

To add any of the suggested prompts to this repository:

1. **Manual Installation**:

   ```bash
   curl -o ".github/prompts/[prompt-name].prompt.md" "https://raw.githubusercontent.com/github/awesome-copilot/main/prompts/[prompt-filename].prompt.md"
   ```

2. **VS Code Installation** (for immediate use):
   - Click the VS Code install badge next to any prompt in the awesome-copilot repository
   - Or use the install links provided in the table above

3. **Bulk Installation** (top 3 recommendations):

   ```bash
   cd .github/prompts/
   curl -o "multi-stage-dockerfile.prompt.md" "https://raw.githubusercontent.com/github/awesome-copilot/main/prompts/multi-stage-dockerfile.prompt.md"
   curl -o "create-llms.prompt.md" "https://raw.githubusercontent.com/github/awesome-copilot/main/prompts/create-llms.prompt.md"
   curl -o "update-llms.prompt.md" "https://raw.githubusercontent.com/github/awesome-copilot/main/prompts/update-llms.prompt.md"
   ```

## Gap Analysis Summary

**Identified Gaps in Current Prompt Library:**

- ❌ **Containerization**: No Docker-related prompts
- ❌ **Issue/PR Management**: No GitHub workflow automation
- ❌ **LLMs.txt Support**: Missing AI-optimized documentation format
- ❌ **Documentation Indexing**: No automated markdown file index maintenance
- ❌ **Tutorial Generation**: No educational content creation prompts

**Well-Covered Areas:**

- ✅ **Documentation**: Comprehensive component documentation prompts
- ✅ **Testing**: Strong JavaScript/TypeScript/Jest coverage
- ✅ **Architecture**: ADR creation and implementation planning
- ✅ **Planning**: Feature specification and implementation workflows

The suggested prompts would fill critical gaps while building on the repository's existing strengths in documentation and planning workflows.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Essential Commands

```bash
# Install dependencies
pnpm install

# Development server (runs on http://localhost:5173)
pnpm run dev

# Build production
pnpm run build

# Run tests
pnpm test
pnpm test:watch      # Watch mode
pnpm test:coverage   # With coverage

# Type checking
pnpm run typecheck

# Linting and formatting
pnpm run lint
pnpm run lint:fix    # Auto-fix issues

# Preview production build
pnpm run preview
```

### Docker Commands

```bash
# Build Docker image
npm run dockerbuild       # Development
npm run dockerbuild:prod  # Production

# Run with Docker Compose
docker compose --profile development up
```

## Architecture Overview

### Core Stack
- **Framework**: Remix (React-based full-stack framework)
- **Language**: TypeScript with strict mode enabled
- **Styling**: SCSS modules + UnoCSS
- **State Management**: Nanostores for reactive state
- **Build Tool**: Vite
- **Runtime**: Cloudflare Workers/Pages

### Key Architectural Patterns

1. **Provider System**: Extensible LLM provider architecture
   - Base provider class: `app/lib/modules/llm/base-provider.ts`
   - Provider implementations in `app/lib/modules/llm/providers/`
   - Dynamic model discovery and caching

2. **Streaming Architecture**: Real-time AI responses
   - Message streaming via `SwitchableStream`
   - Artifact extraction during streaming
   - Action execution pipeline

3. **WebContainer Integration**: In-browser code execution
   - Virtual file system
   - Terminal emulation
   - Live preview with error forwarding

4. **Agent System**: Specialized AI agents for different tasks
   - Agent manager coordinates multiple agents
   - Memory management (short-term and long-term)
   - Swarm coordination for complex tasks

### Project Structure

```
app/
├── components/        # React components
│   ├── chat/         # Chat interface components
│   ├── workbench/    # Code editor and preview
│   └── ui/           # Reusable UI components
├── lib/              # Core libraries
│   ├── modules/      # Feature modules
│   │   ├── llm/      # LLM provider system
│   │   ├── agents/   # Agent implementations
│   │   └── swarm/    # Swarm coordination
│   ├── runtime/      # Message parsing and actions
│   └── stores/       # Nanostores for state
├── routes/           # Remix routes and API endpoints
└── styles/           # Global styles and variables
```

### Key Files and Their Purposes

- `app/routes/api.chat.ts` - Main chat API endpoint handling streaming responses
- `app/lib/modules/llm/manager.ts` - LLM provider registry and management
- `app/components/chat/BaseChat.tsx` - Core chat interface component
- `app/lib/runtime/message-parser.ts` - Parses AI responses for artifacts and actions
- `app/lib/runtime/action-runner.ts` - Executes file operations and shell commands
- `app/components/workbench/Workbench.client.tsx` - Code editor and preview interface

### Development Guidelines

1. **File Naming Conventions**:
   - `.client.tsx` - Client-only components
   - `.server.ts` - Server-only code
   - Component files use PascalCase
   - Utility files use camelCase

2. **State Management**:
   - Use Nanostores for reactive state
   - Store definitions in `app/lib/stores/`
   - Prefer computed stores for derived state

3. **Provider Development**:
   - Extend `BaseProvider` class
   - Implement required methods (getModelList, chat)
   - Self-register in provider file
   - Add provider icon in `public/icons/`

4. **Testing**:
   - Jest for unit tests
   - Test files use `.spec.ts` or `.test.ts` suffix
   - Mock WebContainer and external APIs
   - Focus on business logic testing

5. **Performance Considerations**:
   - Use streaming for long responses
   - Implement proper error boundaries
   - Lazy load heavy components
   - Cache API responses when appropriate

### Common Tasks

**Adding a new LLM provider**:
1. Create provider file in `app/lib/modules/llm/providers/`
2. Extend `BaseProvider` class
3. Implement required methods
4. Add provider configuration to types
5. Add provider icon to `public/icons/`

**Modifying chat behavior**:
1. Check `app/routes/api.chat.ts` for request handling
2. Review `StreamingMessageParser` for response parsing
3. Update `ActionRunner` for new action types

**Working with WebContainer**:
1. WebContainer API in `app/lib/webcontainer/`
2. File operations through `files` store
3. Terminal operations through `terminal` store

### Important Notes

- The project uses merge conflicts in some files (marked with `<<<<<<<` and `>>>>>>>`). Check git status before making changes.
- WebContainer requires Chrome Canary for local development
- API keys are stored in cookies, not environment variables
- Provider base URLs can be customized through settings
- The project follows a plugin architecture for extensibility
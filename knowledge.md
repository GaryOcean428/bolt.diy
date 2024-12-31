# TypeScript Development

## Type Checking

- Use `pnpm run typecheck` to check types
- If type checking times out without errors, it likely passed
- For faster checks during development, can use `pnpm exec tsc --noEmit --incremental`
- Type checking may time out on large codebases, especially after dependency updates
- A timeout without errors usually indicates success

## ESLint Rules

## no-unused-vars

- Must disable base ESLint `no-unused-vars` rule when using `@typescript-eslint/no-unused-vars`
- Variables prefixed with `_` are conventionally ignored
- Recommended configuration:
```json
{
  "rules": {
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": ["error", {
      "args": "all",
      "argsIgnorePattern": "^_",
      "caughtErrors": "all", 
      "caughtErrorsIgnorePattern": "^_",
      "destructuredArrayIgnorePattern": "^_",
      "varsIgnorePattern": "^_",
      "ignoreRestSiblings": true
    }]
  }
}
```

Benefits over TypeScript's `noUnusedLocals`/`noUnusedParameters`:
- More configurable patterns for ignoring variables
- Can be disabled inline or per file
- Won't block builds

Reference: https://typescript-eslint.io/rules/no-unused-vars/

# Server-Side Rendering

## Model Selection
- Must initialize LLM manager and model list before server-side rendering to prevent hydration mismatches
- Always provide fallback values for provider and model selection to ensure consistent server/client rendering
- Use currentProvider/currentModel pattern to handle undefined initial states

# Agent System

## Task Routing
- Always provide fallback agent selection
- Prefer language agents as fallback
- Default to first available agent if no better match
- Never return "no suitable agent" if any agents are registered

## Chat Integration
- Chat messages are routed through AgentManager for intelligent task distribution
- Agents specialize in different aspects: code generation, review, testing, etc.
- Task complexity determines agent selection:
  - Token count
  - Specialized knowledge requirements
  - Security sensitivity
  - Language specificity
  - Expected duration

## Code Generation
- Agents can generate and execute code actions
- Actions are streamed back through chat interface
- Supported actions:
  - File modifications
  - Shell commands
- Code blocks in agent responses automatically convert to actions
- Code blocks must include file path on first line after triple backticks
- Format: ```language path/to/file.ext
- 

# Server-Side Rendering

## Component Hydration
- Components with dynamic state must initialize consistently between server and client
- Use useEffect to set initial state after mount when needed
- Avoid state changes during render to prevent hydration mismatches
- Ensure sorted lists maintain consistent order between server/client
- Initialize dynamic state in useEffect rather than during render
- For sorted lists, apply sort in render but initialize selection in useEffect

# Agent System

## Testing Strategy
- Use full-stack TypeScript applications for evaluation
- Include mix of frontend/backend code
- Register default agents before testing:
  - Code generation agent
  - Testing agent
  - Documentation agent
  - Review agent
  - Language agent (required for language detection)
- Test scenarios:
  - Component refactoring
  - API integration
  - Test generation
  - Documentation updates
  - Performance optimization
- Test coverage requirements:
  - Minimum 80% coverage for all metrics
  - Test agent registration and initialization
  - Test task routing and execution
  - Test agent activation/deactivation
  - Test complexity-based selection

## Development Workflow
- After code changes:
  1. Run type checker: `pnpm typecheck`
  2. Run tests: `pnpm test`
  3. Check test coverage: `pnpm test:coverage`
- Evaluate:
  - Multi-agent collaboration
  - Code quality
  - Test coverage
  - Documentation clarity
  - Type safety

## Security
- Environment files (.env, .env.local) are intentionally ignored
- API keys and credentials must be handled securely
- Never commit environment files to version control
- Use environment variables for sensitive configuration

## Agent Architecture
- Agents work in specialized teams with defined roles
- Inter-agent communication is logged for user visibility
- Memory systems: Vector (ChromaDB), Redis cache, SQL persistence
- Self-improvement through automated learning
- Security-first approach with encryption and access control

## Implementation Notes
- Agent classes extending EventEmitter must call super() in constructor
- Base agents should be instantiated before specialization
- Agent registration must happen after proper initialization
- Language agents require proper inheritance chain:
  1. BaseAgent
  2. LanguageAgentImpl
  3. Specific language implementation
- Test scenarios:
  - Component refactoring
  - API integration
  - Test generation
  - Documentation updates
  - Performance optimization
- Evaluate:
  - Multi-agent collaboration
  - Code quality
  - Test coverage
  - Documentation clarity
  - Type safety

## Implementation Notes
- Agent classes extending EventEmitter must call super() in constructor
- Base agents should be instantiated before specialization
- Agent registration must happen after proper initialization
- Language agents require proper inheritance chain:
  1. BaseAgent
  2. LanguageAgentImpl
  3. Specific language implementation
```

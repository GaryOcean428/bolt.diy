# Model Selection and Validation

## Allowed Models
- Must strictly follow models.md for allowed models
- Default to Granite 3.1 Dense 2B (granite3.1-dense:2b)
- Validate model selection on both client and server side
- Never allow models not listed in models.md
- Provide fallback to default model if invalid selection
- All models must include:
  - maxTokens and maxTokenAllowed
  - type: 'text-generation'
  - capabilities array
  - proper provider attribution
- Model interfaces must:
  - Handle both Record<string, string> and Env types for serverEnv
  - Provide explicit type annotations for completion parameters
  - Use consistent naming for model properties across providers
  - Use 'name' instead of 'id' for model identification

# Accessibility Requirements

## Form Controls
- All form controls must have accessible names
- Use aria-label when visual label is not present
- Select elements must have accessible names via label or aria-label
- Buttons must have discernible text via content or aria-label

# TypeScript Development

## Import Paths
- Always use absolute imports with '~/' prefix instead of relative imports
- This applies to all files including tests
- Example: `import { Foo } from '~/lib/foo'` instead of `import { Foo } from '../foo'`

## Type Checking

### Type Safety Guidelines
- Use `as const` assertions sparingly and prefer proper type definitions
- Always provide explicit type annotations for component props
- Handle undefined values explicitly in components with optional props
- Use discriminated unions for complex state types
- Ensure all async functions have proper return types
- Use type guards for runtime type checking
- When organizing agent types:
  - Define clear enums for agent capabilities and specializations
  - Use interfaces for agent configurations and results
  - Extend base interfaces for specialized agents
  - Include metrics and context in agent interfaces
  - Define strict types for agent actions and tasks
- Use `as const` assertions sparingly and prefer proper type definitions
- Always provide explicit type annotations for component props
- Handle undefined values explicitly in components with optional props
- Use discriminated unions for complex state types
- Ensure all async functions have proper return types
- Use type guards for runtime type checking
- When using verbatim module syntax:
  - Use `import type` for type-only imports
  - Use regular imports for values and enums
  - Split type and value imports into separate statements
- Use `as const` assertions sparingly and prefer proper type definitions
- Always provide explicit type annotations for component props
- Handle undefined values explicitly in components with optional props
- Use discriminated unions for complex state types
- Ensure all async functions have proper return types
- Use type guards for runtime type checking
- When chaining array methods:
  - Break complex chains into separate statements for better type inference
  - Use intermediate variables with explicit types
  - Avoid method chaining when TypeScript has trouble inferring types
  - Consider using separate statements when dealing with optional chaining
- Use `as const` assertions sparingly and prefer proper type definitions
- Always provide explicit type annotations for component props
- Handle undefined values explicitly in components with optional props
- Use discriminated unions for complex state types
- Ensure all async functions have proper return types
- Use type guards for runtime type checking
- Initialize state with proper type annotations and empty values rather than converting types
- When dealing with agent systems:
  - Define clear interfaces for agent communication
  - Use discriminated unions for agent messages
  - Ensure proper typing of agent metrics and status
  - Handle agent state transitions with type safety
- Use `as const` assertions sparingly and prefer proper type definitions
- Always provide explicit type annotations for component props
- Handle undefined values explicitly in components with optional props
- Use discriminated unions for complex state types
- Ensure all async functions have proper return types
- Use type guards for runtime type checking
- Initialize state with proper type annotations and empty values rather than converting types
- Use `as const` assertions sparingly and prefer proper type definitions
- Always provide explicit type annotations for component props
- Handle undefined values explicitly in components with optional props
- Use discriminated unions for complex state types
- Ensure all async functions have proper return types
- Use type guards for runtime type checking

## Provider Types
- Provider lists should be mutable arrays for component props
- Convert readonly arrays to mutable using Array.from() when passing to components
- Handle undefined providers explicitly in components
- Use Object.values().flatMap() to convert nested readonly arrays
- When dealing with complex readonly types, transform the data structure rather than trying to cast
- Provider interfaces should handle both Record<string, string> and Env types for serverEnv
- Provider lists should be mutable arrays for component props
- Convert readonly arrays to mutable using Array.from() when passing to components
- Handle undefined providers explicitly in components
- Use Object.values().flatMap() to convert nested readonly arrays
- When dealing with complex readonly types, transform the data structure rather than trying to cast
- Provider lists should be mutable arrays for component props
- Convert readonly arrays to mutable using Array.from() when passing to components
- Handle undefined providers explicitly in components
- Use Array.from() before accessing array methods on potentially readonly arrays
- Cast 'as const' when using literal string types in spread operations

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

# Power Management

## Dell G5 5500 Configuration
- Use intel profile with prime-select for better battery life
- Disable CPU turbo boost on battery
- Enable aggressive PCIe ASPM
- Configure TLP with Dell-specific settings:
  - CPU_SCALING_GOVERNOR_ON_BAT=powersave
  - PCIE_ASPM_ON_BAT=powersupersave
  - PLATFORM_PROFILE_ON_BAT=low-power
  - CPU_BOOST_ON_BAT=0
- Add GRUB parameters: pcie_aspm=force pcie_aspm.policy=powersupersave

# Chrome Management

## Multiple Chrome Versions
- Keep both Chrome stable and Canary
- Clear caches regularly: ~/.cache/google-chrome*/Default/Cache/*
- Remove testing artifacts: ~/.config/google-chrome-for-testing
- Avoid Guest Profile usage
- Keep Default profile clean
- Remove unused Service Worker caches

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

# Redis Configuration

## Best Practices
- Use TLS in production environments
- Implement exponential backoff for reconnection attempts
- Set maximum retry limits
- Handle all connection events (connect, ready, error, disconnect)
- Validate all required environment variables
- Use separate error messages for each missing config
- Log reconnection attempts with count
- Configure reasonable ping intervals

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
- When testing agents:
  - Mock internal implementations rather than public methods
  - Use protected method overrides instead of public method mocks
  - Test both success and failure scenarios
  - Use type assertions carefully and only in test code
  - Access private methods in tests using `(instance as any)._privateMethod`
  - Provide complete metrics in test responses
  - When testing collections, use Array.from() to convert Maps/Sets
  - Cast to 'any' for testing private properties when necessary
- When testing agents:
  - Mock internal implementations rather than public methods
  - Use protected method overrides instead of public method mocks
  - Test both success and failure scenarios
  - Use type assertions carefully and only in test code
  - Ensure test data matches production interfaces
  - Access private methods in tests using `(instance as any)._privateMethod`
  - Provide complete metrics in test responses
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
- When testing agents:
  - Mock internal implementations rather than public methods
  - Provide complete metrics in test responses
  - Use protected method overrides instead of public method mocks
  - Test both success and failure scenarios
  - Use type assertions carefully and only in test code
  - Ensure test data matches production interfaces
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

## Error Handling
- Use structured error responses with { valid: boolean, errors?: string[] } pattern
- Track error metrics including error types and rates
- Include context with all error logs (timestamp, error type, stack)
- Provide user-friendly error messages in UI
- Log all validation failures with full context

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

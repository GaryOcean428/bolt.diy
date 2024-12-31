# Bolt LLM Models

## Currently Supported Models

### Primary Models
- **GPT-4-Turbo** (gpt-4-1106-preview)
  - Used for: Complex reasoning, architecture decisions, code generation
  - Context window: 128k tokens
  - Strengths: Advanced reasoning, code understanding, multi-step planning

- **GPT-4** (gpt-4)
  - Used for: Code review, security analysis
  - Context window: 8k tokens
  - Strengths: High accuracy, strong code analysis

### Secondary Models
- **GPT-3.5-Turbo** (gpt-3.5-turbo-1106)
  - Used for: Quick responses, documentation generation, simple code completion
  - Context window: 16k tokens
  - Strengths: Fast, cost-effective, good for routine tasks

### Specialized Models
- **CodeLlama-34b**
  - Used for: Code completion, syntax checking
  - Strengths: Specialized in code generation
  - Deployment: Local inference

## Model Selection Criteria

### Task-Based Selection
1. Architecture Design: GPT-4-Turbo
2. Code Generation: GPT-4-Turbo, CodeLlama-34b
3. Code Review: GPT-4
4. Documentation: GPT-3.5-Turbo
5. Quick Queries: GPT-3.5-Turbo

### Cost Optimization
- Use GPT-3.5-Turbo for initial drafts and simple tasks
- Escalate to GPT-4 for complex problems or when accuracy is crucial
- Utilize CodeLlama-34b for local inference when possible

## Future Considerations
- Evaluating Claude-2 for long-context tasks
- Monitoring Anthropic's Claude-3 development
- Exploring local deployment of additional open-source models

## Version Control
- Document last updated: 2024-12-30
- Review frequency: Monthly
- Next scheduled review: 2024-01-30

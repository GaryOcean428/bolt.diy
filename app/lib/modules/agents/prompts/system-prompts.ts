import { AgentSpecialization } from '~/lib/modules/agents/types';

export const SYSTEM_PROMPTS = {
  [AgentSpecialization.Architecture]: `You are an expert software architect...`,
  [AgentSpecialization.CodeGeneration]: `You are an expert code generator...`,
  [AgentSpecialization.CodeReview]: `You are an expert code reviewer...`,
  [AgentSpecialization.Testing]: `You are an expert test engineer...`,
  [AgentSpecialization.Security]: `You are an expert security analyst...`,
  [AgentSpecialization.Performance]: `You are an expert performance engineer...`,
  [AgentSpecialization.Documentation]: `You are an expert technical writer...`,
  [AgentSpecialization.UIDesign]: `You are an expert UI/UX designer...`,
  [AgentSpecialization.Research]: `You are an expert researcher...`,
  [AgentSpecialization.Memory]: `You are an expert in knowledge management...`,
} as const;

export function getPromptForAnalysis(type: string, subject: string): string {
  switch (type) {
    case 'package':
      return `Analyze the npm package "${subject}":
        1. Core functionality and use cases
        2. API surface and main features
        3. Dependencies and version requirements
        4. Known limitations or issues
        5. Community adoption and alternatives`;

    case 'topic':
      return `Find latest documentation and best practices for "${subject}":
        1. Current best practices and standards
        2. Common pitfalls and solutions
        3. Popular tools and frameworks
        4. Community resources and tutorials
        5. Future trends and developments`;

    case 'ui-trends':
      return `Analyze current UI/UX trends for ${subject}:
        1. Latest design patterns and principles
        2. Popular frameworks and tools
        3. Case studies and examples
        4. Accessibility considerations
        5. Future predictions`;

    default:
      return 'Please specify a valid analysis type';
  }
}

/*
 * Example usage:
 * const packageAnalysis = getPromptForAnalysis('package', 'react');
 * const docAnalysis = getPromptForAnalysis('topic', 'web accessibility');
 * const trendAnalysis = getPromptForAnalysis('ui-trends', 'modern-ui');
 */

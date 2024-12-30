// Code Generation Tests
import { AgentManager } from '~/lib/modules/agents/agent-manager';
import type { TaskComplexity, CodeAction } from '~/lib/modules/agents/types';

describe('Code Generation', () => {
  let agentManager: AgentManager;

  beforeEach(() => {
    agentManager = new AgentManager();
  });

  it('should generate a React component', async () => {
    const task = [
      'Create a TypeScript React component that:',
      '- Takes a "user" prop with name and email',
      "- Shows the user's info in a card",
      '- Has proper TypeScript types',
      '- Includes error handling',
    ].join('\n');

    const complexity: TaskComplexity = {
      tokenCount: task.length,
      specializedKnowledge: true,
      securitySensitive: false,
      languageSpecific: true,
      expectedDuration: 1,
    };

    const result = await agentManager.executeTask(task, complexity);
    expect(result.success).toBe(true);

    const data = result.data as { actions: CodeAction[] };
    const actions = data.actions;
    actions.forEach((a: CodeAction) => {
      if (a.type === 'file') {
        expect(a).toBeDefined();
        expect(a.content).toContain('interface UserProps');
        expect(a.content).toContain('export function UserCard');
      }
    });
  });
});

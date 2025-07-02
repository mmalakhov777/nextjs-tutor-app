import { openai } from '@ai-sdk/openai';

export const TRIAGE_AGENT_CONFIG = {
  name: 'Triage Agent',
  model: openai('gpt-4.1'),
  systemPrompt: 'You are a triage agent that analyzes queries and determines the best specialized agent to handle them.',
  tools: {}, // No tools needed for triage
  description: 'An AI agent that routes queries to the most appropriate specialized assistant.',
  capabilities: [
    'Query analysis and classification',
    'Agent recommendation',
    'Intent recognition',
    'Multi-agent routing',
    'Task decomposition',
  ],
}; 
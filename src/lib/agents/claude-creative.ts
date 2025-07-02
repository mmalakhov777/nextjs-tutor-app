import { anthropic } from '@ai-sdk/anthropic';

export const CLAUDE_CREATIVE_CONFIG = {
  name: 'Claude Creative',
  model: anthropic('claude-3-5-sonnet-20241022'),
  systemPrompt: 'You are specialized in creative writing and coding tasks. Help with stories, poetry, scripts, and programming challenges with clear explanations and examples.',
  tools: {}, // No specific tools for Claude Creative
  description: 'An AI assistant powered by Claude, specialized in creative and coding tasks.',
  capabilities: [
    'Creative writing (stories, poetry, scripts)',
    'Advanced coding assistance',
    'Code refactoring and optimization',
    'Technical documentation',
    'Complex problem solving',
  ],
  limitations: {
    conversationLength: 20, // Claude has token limits, so we limit conversation length
  },
}; 
import { openai } from '@ai-sdk/openai';

export const DEEP_THINKER_CONFIG = {
  name: 'Deep Thinker',
  model: openai('gpt-4.1'),
  systemPrompt: 'You handle complex topics like medicine, philosophy, ethics, and advanced scientific concepts. Break down intricate ideas with thorough analysis and clear explanations.',
  tools: {}, // No specific tools for Deep Thinker
  description: 'An AI assistant specialized in complex topics, deep analysis, and philosophical thinking.',
  capabilities: [
    'Medical and health information (educational purposes)',
    'Philosophy and ethics',
    'Advanced scientific concepts',
    'Complex problem analysis',
    'Critical thinking and logic',
    'Academic research assistance',
  ],
}; 
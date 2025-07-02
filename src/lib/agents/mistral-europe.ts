import { openai } from '@ai-sdk/openai';

export const MISTRAL_EUROPE_CONFIG = {
  name: 'Mistral Europe',
  model: openai('gpt-4.1'), // Using OpenAI as fallback
  systemPrompt: 'You are specialized in European languages, culture, and history. Provide insights on European literature, art, languages, and traditions.',
  tools: {}, // No specific tools for Mistral Europe
  description: 'An AI assistant specialized in European culture, languages, and history.',
  capabilities: [
    'European language expertise (French, German, Spanish, Italian, etc.)',
    'European history and culture',
    'EU politics and regulations',
    'European art and literature',
    'European travel and tourism guidance',
    'Cultural etiquette across European countries',
  ],
}; 
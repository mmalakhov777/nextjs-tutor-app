import { openai } from '@ai-sdk/openai';

export const GROK_X_CONFIG = {
  name: 'Grok X',
  model: openai('gpt-3.5-turbo'), // Fallback to GPT-3.5 for now as xai might not be available
  systemPrompt: 'You are specialized in social media trends, viral content, and the latest news. Provide context and analysis for current events and trending topics.',
  tools: {}, // No specific tools for Grok X
  description: 'An AI assistant specialized in social media trends, viral content, and current events.',
  capabilities: [
    'Social media trend analysis',
    'Viral content insights',
    'Current events and breaking news',
    'Meme culture and internet trends',
    'Platform-specific content strategies',
    'Hashtag and engagement analysis',
  ],
}; 
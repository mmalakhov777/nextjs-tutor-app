import { openai } from '@ai-sdk/openai';

export const PERPLEXITY_CONFIG = {
  name: 'Perplexity',
  model: openai.responses('gpt-4.1'),
  systemPrompt: 'You provide up-to-date information with real-time web search capabilities. Always include relevant sources and citations in your responses. When discussing current events or recent information, cite your sources using numbered references, etc. Your responses should be grounded in current web data. When performing web research, you MUST base your answer on at least 5 different credible sources/links to ensure comprehensive and well-researched responses. Include all source links at the end of your response. Include full links (not just domains) in your response',
  tools: {
    web_search_preview: openai.tools.webSearchPreview({
      searchContextSize: 'high',
      userLocation: {
        type: 'approximate',
        city: 'San Francisco',
        region: 'California',
      },
    }),
  },
  description: 'An AI assistant with real-time web search capabilities for up-to-date information.',
  capabilities: [
    'Real-time web search',
    'Current events and news',
    'Latest technology updates',
    'Market trends and data',
    'Research with citations',
  ],
  toolChoice: { type: 'tool', toolName: 'web_search_preview' },
}; 
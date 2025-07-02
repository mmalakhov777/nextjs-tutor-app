import { openai } from '@ai-sdk/openai';
import { weatherTool, mathTool } from '../tools';

export const GENERAL_ASSISTANT_CONFIG = {
  name: 'General Assistant',
  model: openai('gpt-4.1'),
  systemPrompt: 'You are a helpful assistant. Provide comprehensive and accurate responses.',
  tools: {
    getWeather: weatherTool,
    calculateMath: mathTool,
  },
  description: 'A versatile AI assistant capable of answering questions, performing calculations, and checking weather.',
  capabilities: [
    'General knowledge Q&A',
    'Weather information',
    'Mathematical calculations',
    'Code assistance',
    'Writing help',
  ],
}; 
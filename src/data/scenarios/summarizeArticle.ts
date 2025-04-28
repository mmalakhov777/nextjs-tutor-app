import { FileText } from 'lucide-react';
import { ScenarioData } from '@/types/scenarios';

export const summarizeArticle: ScenarioData = {
  id: 'summarize-article',
  title: 'Summarize Article in 5 Bullet Points',
  description: 'Get a concise summary of any article in just 5 key points.',
  icon: FileText,
  color: '#6C63FF',
  steps: [
    {
      title: 'Select the article',
      description: 'Choose the article you want to summarize',
      actions: [
        {
          label: 'Find the article link or text',
          prompt: 'Can you copy and paste the article you want me to summarize?'
        }
      ]
    },
    {
      title: 'Summarize key points',
      description: 'Generate a short, clear summary',
      actions: [
        {
          label: 'Highlight the main ideas',
          prompt: 'Summarize this article into 5 main bullet points'
        },
        {
          label: 'Make it concise',
          prompt: 'Can you rewrite the summary in a more concise and easy-to-read way?'
        }
      ]
    },
    {
      title: 'Polish the summary',
      description: 'Adjust tone or format if needed',
      actions: [
        {
          label: 'Adapt for audience',
          prompt: 'Can you make the summary sound more professional/informal depending on the audience?'
        }
      ]
    }
  ]
}; 
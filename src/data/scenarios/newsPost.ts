import { Newspaper } from 'lucide-react';
import { ScenarioData } from '@/types/scenarios';

export const newsPost: ScenarioData = {
  id: 'news-post',
  title: 'Hot News Blog Post',
  description: 'Research and write engaging news blog posts',
  icon: Newspaper,
  color: '#FF6B6B',
  steps: [
    {
      title: 'Research the news',
      description: 'Find and analyze current hot topics',
      actions: [
        { 
          label: 'Find trending topics', 
          prompt: 'What are the most trending news topics right now that would make for an engaging blog post?',
          type: 'research'
        },
        { 
          label: 'Source reliable information', 
          prompt: 'How can I find reliable sources for my news blog post? What are some credible sources for current events?',
          type: 'research'
        },
        { 
          label: 'Analyze audience interests', 
          prompt: 'How do I identify what news topics my target audience would be most interested in?',
          type: 'research'
        }
      ]
    },
    {
      title: 'Write blog post',
      description: 'Craft an engaging and informative news article',
      actions: [
        { 
          label: 'Create compelling headline', 
          prompt: 'How do I write an attention-grabbing headline for a news blog post that isn\'t clickbait?' 
        },
        { 
          label: 'Structure the article', 
          prompt: 'What\'s the best structure for a news blog post? How should I organize the information?' 
        },
        { 
          label: 'Maintain journalistic standards', 
          prompt: 'How can I ensure my news blog post is factual, balanced, and ethical while still being engaging?' 
        }
      ]
    }
  ]
}; 
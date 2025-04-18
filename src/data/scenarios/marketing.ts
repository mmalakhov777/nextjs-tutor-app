import { MegaphoneIcon } from 'lucide-react';
import { ScenarioData } from '@/types/scenarios';

export const marketing: ScenarioData = {
  id: 'marketing',
  title: 'Marketing Copy',
  description: 'Create compelling marketing materials',
  icon: MegaphoneIcon,
  color: '#82D8A7',
  steps: [
    {
      title: 'Define your audience',
      description: 'Identify who your marketing copy is targeting',
      actions: [
        { 
          label: 'Help me identify my target audience', 
          prompt: 'I need to create marketing copy. How do I define and understand my target audience?' 
        },
        { 
          label: 'Create audience personas', 
          prompt: 'Can you help me create customer personas for my marketing campaign?' 
        },
        { 
          label: 'Segment my audience', 
          prompt: 'How should I segment my audience for more effective marketing?' 
        }
      ]
    },
    {
      title: 'Develop key messaging',
      description: 'Craft your core value proposition and messages',
      actions: [
        { 
          label: 'Help with value proposition', 
          prompt: 'How do I create a compelling value proposition for my product/service?' 
        },
        { 
          label: 'Develop brand messaging', 
          prompt: 'Help me develop consistent brand messaging for my marketing materials' 
        },
        { 
          label: 'Create persuasive claims', 
          prompt: 'What are techniques for creating persuasive marketing claims?' 
        }
      ]
    },
    {
      title: 'Choose marketing formats',
      description: 'Select the right channels and content formats',
      actions: [
        { 
          label: 'Compare marketing channels', 
          prompt: 'What marketing channels would work best for my product/service?' 
        },
        { 
          label: 'Social media strategy', 
          prompt: 'Help me create a social media marketing strategy' 
        },
        { 
          label: 'Email marketing tips', 
          prompt: 'What are best practices for effective email marketing campaigns?' 
        }
      ]
    },
    {
      title: 'Create and optimize',
      description: 'Refine your marketing copy for maximum impact',
      actions: [
        { 
          label: 'Improve conversion rates', 
          prompt: 'How can I optimize my marketing copy to improve conversion rates?' 
        },
        { 
          label: 'A/B testing strategies', 
          prompt: 'What A/B testing strategies should I use for my marketing copy?' 
        },
        { 
          label: 'SEO optimization tips', 
          prompt: 'How do I optimize my marketing content for better SEO performance?' 
        }
      ]
    }
  ]
}; 
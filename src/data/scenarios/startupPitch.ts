import { RocketIcon } from 'lucide-react';
import { ScenarioData } from '@/types/scenarios';

export const startupPitch: ScenarioData = {
  id: 'startupPitch',
  title: 'Startup Pitch',
  description: 'Craft a compelling startup pitch',
  icon: RocketIcon,
  color: '#FF6B6B',
  steps: [
    {
      title: 'Define your value proposition',
      description: 'Clearly articulate what problem you solve and why it matters',
      actions: [
        { 
          label: 'Identify customer problem', 
          prompt: 'Help me identify and articulate the key problem my startup solves' 
        },
        { 
          label: 'Craft unique value proposition', 
          prompt: 'How do I create a compelling unique value proposition for my startup?' 
        },
        { 
          label: 'Differentiate from competitors', 
          prompt: 'Help me articulate how my startup differs from existing solutions' 
        }
      ]
    },
    {
      title: 'Structure your pitch',
      description: 'Organize your pitch into a clear, compelling narrative',
      actions: [
        { 
          label: 'Create pitch outline', 
          prompt: 'What should be included in a successful startup pitch deck?' 
        },
        { 
          label: 'Develop compelling story', 
          prompt: 'Help me create a narrative structure for my startup pitch' 
        },
        { 
          label: 'Time my presentation', 
          prompt: 'How should I structure a 5-minute pitch presentation?' 
        }
      ]
    },
    {
      title: 'Showcase traction & market',
      description: 'Demonstrate your potential with data and market analysis',
      actions: [
        { 
          label: 'Present market size', 
          prompt: 'How should I present my total addressable market in a pitch?' 
        },
        { 
          label: 'Highlight existing traction', 
          prompt: 'What metrics should I include to show traction in my startup pitch?' 
        },
        { 
          label: 'Develop growth projections', 
          prompt: 'Help me create realistic but ambitious growth projections for my pitch' 
        }
      ]
    },
    {
      title: 'Perfect your delivery',
      description: 'Refine how you present your pitch for maximum impact',
      actions: [
        { 
          label: 'Handle objections', 
          prompt: 'What are common investor objections and how should I address them?' 
        },
        { 
          label: 'Create elevator pitch', 
          prompt: 'Help me craft a 30-second elevator pitch for my startup' 
        },
        { 
          label: 'Improve presentation skills', 
          prompt: 'What techniques can I use to deliver my pitch more confidently?' 
        }
      ]
    }
  ]
}; 
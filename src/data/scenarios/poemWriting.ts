import { PenTool } from 'lucide-react';
import { ScenarioData } from '@/types/scenarios';

export const poemWriting: ScenarioData = {
  id: 'poem-writing',
  title: 'Poem Writing',
  description: 'Create beautiful poems in various styles',
  icon: PenTool,
  color: '#FED770',
  steps: [
    {
      title: 'Choose poem style',
      description: 'Select the type of poem you want to write',
      actions: [
        { 
          label: 'Help me choose a poem style', 
          prompt: 'I want to write a poem. Can you explain different poem styles and help me choose one?' 
        },
        { 
          label: 'I want to write a sonnet', 
          prompt: 'I want to write a sonnet. What structure should I follow?' 
        },
        { 
          label: 'I want to create a haiku', 
          prompt: 'I want to create a haiku. Can you explain the format and give me some examples?' 
        }
      ]
    },
    {
      title: 'Select theme',
      description: 'Choose what your poem will be about',
      actions: [
        { 
          label: 'Suggest themes for my poem', 
          prompt: 'Can you suggest some powerful themes for my poem?' 
        },
        { 
          label: 'I want to write about nature', 
          prompt: 'I want to write a poem about nature. What aspects of nature work well in poetry?' 
        },
        { 
          label: 'Help me explore emotions in poetry', 
          prompt: 'How can I effectively express emotions in my poem?' 
        }
      ]
    },
    {
      title: 'Develop imagery',
      description: 'Create vivid images and metaphors',
      actions: [
        { 
          label: 'Help with poetic imagery', 
          prompt: 'How can I create strong imagery in my poem?' 
        },
        { 
          label: 'Suggest metaphors for my theme', 
          prompt: 'Can you suggest some metaphors related to my poem theme?' 
        },
        { 
          label: 'Tips for sensory descriptions', 
          prompt: 'Give me tips for incorporating sensory details in poetry' 
        }
      ]
    },
    {
      title: 'Finalize structure',
      description: 'Refine rhythm, rhyme, and overall structure',
      actions: [
        { 
          label: 'Help with rhythm and flow', 
          prompt: 'How can I improve the rhythm and flow of my poem?' 
        },
        { 
          label: 'Suggestions for better line breaks', 
          prompt: 'Can you give advice on effective line breaks in poetry?' 
        },
        { 
          label: 'Tips for a powerful ending', 
          prompt: 'How can I create a strong ending for my poem?' 
        }
      ]
    }
  ]
}; 
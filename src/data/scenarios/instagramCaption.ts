import { Image } from 'lucide-react';
import { ScenarioData } from '@/types/scenarios';

export const instagramCaption: ScenarioData = {
  id: 'instagram-caption',
  title: 'Write a Catchy Instagram Caption',
  description: 'Generate engaging and creative captions for your Instagram posts.',
  icon: Image,
  color: '#FFB347',
  steps: [
    {
      title: 'Describe your post',
      description: 'Tell what your photo or video is about',
      actions: [
        {
          label: 'Share post details',
          prompt: 'Can you describe the vibe and topic of your post?'
        }
      ]
    },
    {
      title: 'Generate caption ideas',
      description: 'Create engaging captions',
      actions: [
        {
          label: 'Casual/fun caption',
          prompt: 'Write a catchy and fun Instagram caption for this post'
        },
        {
          label: 'Emotional/relatable caption',
          prompt: 'Write an emotional or relatable caption for my audience'
        }
      ]
    },
    {
      title: 'Choose your style',
      description: 'Pick the best tone for your followers',
      actions: [
        {
          label: 'Adjust for engagement',
          prompt: 'Can you tweak this caption to get more comments and saves?'
        }
      ]
    }
  ]
}; 
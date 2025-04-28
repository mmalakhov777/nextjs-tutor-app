import { BookOpen } from 'lucide-react';
import { ScenarioData } from '@/types/scenarios';

export const studyPlan: ScenarioData = {
  id: 'study-plan',
  title: 'Create a Study Plan for My Exam',
  description: 'Organize your study schedule for an exam in 2 weeks.',
  icon: BookOpen,
  color: '#4DD599',
  steps: [
    {
      title: 'Define your goal',
      description: 'Clarify the subject and exam type',
      actions: [
        {
          label: 'Set exam details',
          prompt: 'What subject is the exam for and what type of questions will it include?'
        }
      ]
    },
    {
      title: 'Break down the material',
      description: 'Divide topics into daily tasks',
      actions: [
        {
          label: 'Create daily topics',
          prompt: 'Can you split the study material into 14-day chunks?'
        },
        {
          label: 'Prioritize weak areas',
          prompt: 'Which topics should I spend more time on based on difficulty?'
        }
      ]
    },
    {
      title: 'Build daily schedules',
      description: 'Organize a realistic study plan',
      actions: [
        {
          label: 'Set daily study hours',
          prompt: 'How many hours a day should I study based on my deadline?'
        },
        {
          label: 'Include revision sessions',
          prompt: 'Can you add revision days before the exam?'
        }
      ]
    }
  ]
}; 
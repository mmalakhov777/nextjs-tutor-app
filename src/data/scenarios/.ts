import { ScenarioData } from '../types';

const workplaceConflictResolution: ScenarioData = {
  id: 'workplaceConflictResolution',
  title: 'Workplace Conflict Resolution',
  description:
    'Learn and apply a step-by-step approach to effectively resolve conflicts in the workplace, from clarifying the issue to fostering a positive conflict culture.',
  steps: [
    {
      title: 'Clarify the Conflict',
      description:
        'Identify and define the workplace conflict to ensure all parties have a shared understanding.',
      actions: [
        {
          label: 'Clarify the issue',
          prompt:
            'How do I clearly define the workplace conflict and ensure everyone understands the problem?',
        },
        {
          label: 'Acknowledge the conflict',
          prompt:
            'What are effective ways to acknowledge and validate the existence of a workplace conflict?',
        },
      ],
    },
    {
      title: 'Gather Perspectives',
      description:
        'Collect information from all involved parties to understand their viewpoints and underlying causes.',
      actions: [
        {
          label: 'Gather information',
          prompt:
            'How can I gather all relevant perspectives and information about the workplace conflict?',
        },
        {
          label: 'Practice active listening',
          prompt:
            'What are the best techniques for active listening during conflict resolution?',
        },
      ],
    },
    {
      title: 'Establish Common Goals',
      description:
        'Identify shared objectives to shift focus from individual positions to mutual outcomes.',
      actions: [
        {
          label: 'Find common ground',
          prompt:
            'How do I help conflicting parties establish common goals for resolution?',
        },
        {
          label: 'Set shared objectives',
          prompt:
            'What are effective ways to set shared objectives in a workplace conflict?',
        },
      ],
    },
    {
      title: 'Explore Solutions',
      description:
        'Brainstorm and discuss possible solutions, considering different conflict resolution styles.',
      actions: [
        {
          label: 'Brainstorm solutions',
          prompt:
            'What are effective brainstorming techniques for resolving workplace conflict?',
        },
        {
          label: 'Choose a resolution style',
          prompt:
            'How do I select the most appropriate conflict resolution style for a given situation?',
        },
      ],
    },
    {
      title: 'Negotiate and Agree',
      description:
        'Negotiate, compromise, or collaborate to reach a mutually acceptable solution.',
      actions: [
        {
          label: 'Negotiate agreement',
          prompt:
            'What negotiation techniques can help reach a fair agreement in workplace conflict?',
        },
        {
          label: 'Formalize the solution',
          prompt:
            'How do I formalize and document the agreed-upon solution to a workplace conflict?',
        },
      ],
    },
    {
      title: 'Implement and Monitor',
      description:
        'Assign responsibilities, implement the solution, and monitor progress.',
      actions: [
        {
          label: 'Assign responsibilities',
          prompt:
            'How do I assign and communicate responsibilities for implementing the conflict resolution?',
        },
        {
          label: 'Monitor progress',
          prompt:
            'What are effective ways to monitor the progress and success of a conflict resolution agreement?',
        },
      ],
    },
    {
      title: 'Leverage HR and Mediation',
      description:
        'Involve HR or a neutral mediator if conflicts persist or require formal intervention.',
      actions: [
        {
          label: 'Involve HR',
          prompt:
            'When and how should I involve HR in workplace conflict resolution?',
        },
        {
          label: 'Use mediation',
          prompt:
            'How does workplace mediation work and when is it appropriate to use?',
        },
      ],
    },
    {
      title: 'Apply Specialized Techniques',
      description:
        'Consider emerging methods like appreciative inquiry, restorative justice, or online dispute resolution.',
      actions: [
        {
          label: 'Appreciative inquiry',
          prompt:
            'How can appreciative inquiry be used to resolve workplace conflict?',
        },
        {
          label: 'Restorative justice',
          prompt:
            'What is restorative justice and how can it help in workplace conflict resolution?',
        },
        {
          label: 'Online dispute resolution',
          prompt:
            'What are the benefits and steps of online dispute resolution for remote teams?',
        },
      ],
    },
    {
      title: 'Foster Emotional Intelligence and Communication',
      description:
        'Develop emotional intelligence and communication skills to prevent and manage conflicts.',
      actions: [
        {
          label: 'Build emotional intelligence',
          prompt:
            'How can I improve emotional intelligence to better handle workplace conflict?',
        },
        {
          label: 'Enhance communication skills',
          prompt:
            'What communication skills are essential for effective conflict resolution?',
        },
      ],
    },
    {
      title: 'Cultivate a Positive Conflict Culture',
      description:
        'Promote an organizational culture that values open communication, respect, and proactive conflict management.',
      actions: [
        {
          label: 'Promote open communication',
          prompt:
            'How do I foster a culture of open communication to reduce workplace conflict?',
        },
        {
          label: 'Model positive behaviors',
          prompt:
            'What leadership behaviors help create a positive conflict resolution culture?',
        },
      ],
    },
    {
      title: 'Review and Improve',
      description:
        'Regularly evaluate conflict resolution strategies and adapt based on feedback and best practices.',
      actions: [
        {
          label: 'Evaluate effectiveness',
          prompt:
            'How do I assess the effectiveness of our workplace conflict resolution strategies?',
        },
        {
          label: 'Incorporate feedback',
          prompt:
            'What are the best ways to gather and use feedback to improve conflict management processes?',
        },
      ],
    },
  ],
  tags: [
    'workplace',
    'conflict resolution',
    'communication',
    'emotional intelligence',
    'HR',
    'mediation',
    'leadership',
    'organizational culture',
    'best practices',
  ],
  estimatedTimeMinutes: 45,
  level: 'Intermediate',
  author: 'Next.js Tutor App Team',
};

export default workplaceConflictResolution;
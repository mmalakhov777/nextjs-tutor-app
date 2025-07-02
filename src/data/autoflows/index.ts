export interface FormField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'multiselect';
  placeholder?: string;
  options?: string[];
  required?: boolean;
  description?: string;
}

export interface AutoFlowExample {
  id: string;
  title: string;
  icon: string;
  description: string;
  prompt: string;
  category: 'business' | 'education' | 'content' | 'research';
  color: {
    bg: string;
    border: string;
    icon: string;
  };
  template: {
    title: string;
    description: string;
    fields: FormField[];
    promptTemplate: string; // Template with placeholders like {{field_id}}
  };
}

export const AUTO_FLOW_EXAMPLES: AutoFlowExample[] = [
  {
    id: 'market-research',
    title: 'Market Research',
    icon: '📊',
    description: 'Comprehensive market analysis with competitor research, target audience insights, and strategic recommendations.',
    prompt: 'Create a comprehensive market research report for a new sustainable fashion brand targeting Gen Z consumers',
    category: 'business',
    color: {
      bg: 'bg-blue-100',
      border: 'hover:border-blue-300',
      icon: 'text-blue-600'
    },
    template: {
      title: 'Market Research Configuration',
      description: 'Customize your market research project with specific details about your business and target market.',
      fields: [
        {
          id: 'industry',
          label: 'Industry/Business Type',
          type: 'text',
          placeholder: 'e.g., sustainable fashion, fintech, healthcare',
          required: true,
          description: 'What industry or type of business are you researching?'
        },
        {
          id: 'target_audience',
          label: 'Target Audience',
          type: 'text',
          placeholder: 'e.g., Gen Z consumers, small business owners, millennials',
          required: true,
          description: 'Who is your primary target audience?'
        },
        {
          id: 'geographic_scope',
          label: 'Geographic Scope',
          type: 'select',
          options: ['Local/City', 'Regional/State', 'National', 'International', 'Global'],
          required: true,
          description: 'What geographic area should the research cover?'
        },
        {
          id: 'research_focus',
          label: 'Research Focus Areas',
          type: 'multiselect',
          options: ['Competitor Analysis', 'Consumer Behavior', 'Market Size', 'Pricing Strategy', 'Trends Analysis', 'SWOT Analysis'],
          required: true,
          description: 'Select the key areas you want to focus on'
        },
        {
          id: 'additional_requirements',
          label: 'Additional Requirements',
          type: 'textarea',
          placeholder: 'Any specific requirements, constraints, or areas of interest...',
          required: false,
          description: 'Any additional details or specific requirements for your research?'
        }
      ],
      promptTemplate: 'Create a comprehensive market research report for {{industry}} targeting {{target_audience}} in the {{geographic_scope}} market. Focus on: {{research_focus}}. {{additional_requirements}}'
    }
  },
  {
    id: 'learning-curriculum',
    title: 'Learning Curriculum',
    icon: '🎓',
    description: 'Structured learning path with modules, assessments, and practical exercises tailored to your goals.',
    prompt: 'Design a comprehensive 12-week learning curriculum for mastering data science from beginner to intermediate level',
    category: 'education',
    color: {
      bg: 'bg-green-100',
      border: 'hover:border-green-300',
      icon: 'text-green-600'
    },
    template: {
      title: 'Learning Curriculum Setup',
      description: 'Create a personalized learning curriculum tailored to your subject, skill level, and timeline.',
      fields: [
        {
          id: 'subject',
          label: 'Subject/Topic',
          type: 'text',
          placeholder: 'e.g., data science, web development, digital marketing',
          required: true,
          description: 'What subject or skill do you want to learn?'
        },
        {
          id: 'current_level',
          label: 'Current Skill Level',
          type: 'select',
          options: ['Complete Beginner', 'Beginner', 'Intermediate', 'Advanced'],
          required: true,
          description: 'What is your current level in this subject?'
        },
        {
          id: 'target_level',
          label: 'Target Skill Level',
          type: 'select',
          options: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
          required: true,
          description: 'What level do you want to achieve?'
        },
        {
          id: 'duration',
          label: 'Learning Duration',
          type: 'select',
          options: ['4 weeks', '8 weeks', '12 weeks', '6 months', '1 year'],
          required: true,
          description: 'How long do you want the curriculum to be?'
        },
        {
          id: 'learning_style',
          label: 'Preferred Learning Methods',
          type: 'multiselect',
          options: ['Reading/Theory', 'Hands-on Projects', 'Video Tutorials', 'Interactive Exercises', 'Group Discussions', 'Case Studies'],
          required: true,
          description: 'How do you prefer to learn?'
        },
        {
          id: 'goals',
          label: 'Learning Goals',
          type: 'textarea',
          placeholder: 'e.g., get a job, build a personal project, advance current career...',
          required: false,
          description: 'What do you hope to achieve with this learning?'
        }
      ],
      promptTemplate: 'Design a comprehensive {{duration}} learning curriculum for mastering {{subject}} from {{current_level}} to {{target_level}} level. Use these learning methods: {{learning_style}}. Goals: {{goals}}'
    }
  },
  {
    id: 'content-strategy',
    title: 'Content Strategy',
    icon: '✍️',
    description: 'Multi-channel content plan with editorial calendar, engagement tactics, and performance metrics.',
    prompt: 'Develop a 6-month content marketing strategy for a B2B SaaS company including blog posts, social media, and email campaigns',
    category: 'content',
    color: {
      bg: 'bg-purple-100',
      border: 'hover:border-purple-300',
      icon: 'text-purple-600'
    },
    template: {
      title: 'Content Strategy Planning',
      description: 'Build a comprehensive content strategy tailored to your business, audience, and marketing goals.',
      fields: [
        {
          id: 'business_type',
          label: 'Business Type',
          type: 'text',
          placeholder: 'e.g., B2B SaaS, e-commerce, consulting',
          required: true,
          description: 'What type of business is this for?'
        },
        {
          id: 'target_audience',
          label: 'Target Audience',
          type: 'text',
          placeholder: 'e.g., small business owners, marketing managers, students',
          required: true,
          description: 'Who is your primary audience?'
        },
        {
          id: 'channels',
          label: 'Content Channels',
          type: 'multiselect',
          options: ['Blog/Website', 'Social Media', 'Email Marketing', 'YouTube', 'Podcasts', 'LinkedIn', 'Newsletter'],
          required: true,
          description: 'Which channels will you use for content distribution?'
        },
        {
          id: 'content_types',
          label: 'Content Types',
          type: 'multiselect',
          options: ['Blog Posts', 'Videos', 'Infographics', 'Case Studies', 'Tutorials', 'Webinars', 'Social Posts'],
          required: true,
          description: 'What types of content do you want to create?'
        },
        {
          id: 'timeline',
          label: 'Strategy Timeline',
          type: 'select',
          options: ['3 months', '6 months', '1 year'],
          required: true,
          description: 'What time period should this strategy cover?'
        },
        {
          id: 'goals',
          label: 'Content Goals',
          type: 'textarea',
          placeholder: 'e.g., increase brand awareness, generate leads, educate customers...',
          required: false,
          description: 'What are your main content marketing goals?'
        }
      ],
      promptTemplate: 'Develop a {{timeline}} content marketing strategy for {{business_type}} targeting {{target_audience}}. Include {{content_types}} across {{channels}}. Goals: {{goals}}'
    }
  },
  {
    id: 'business-plan',
    title: 'Business Plan',
    icon: '💼',
    description: 'Complete business plan with market analysis, financial projections, and operational strategy.',
    prompt: 'Create a detailed business plan for a tech startup focused on AI-powered personal finance management',
    category: 'business',
    color: {
      bg: 'bg-indigo-100',
      border: 'hover:border-indigo-300',
      icon: 'text-indigo-600'
    },
    template: {
      title: 'Business Plan Configuration',
      description: 'Create a comprehensive business plan with your specific business idea, market, and financial goals.',
      fields: [
        {
          id: 'business_idea',
          label: 'Business Idea/Concept',
          type: 'textarea',
          placeholder: 'Describe your business idea, product, or service...',
          required: true,
          description: 'What is your business idea or concept?'
        },
        {
          id: 'industry',
          label: 'Industry',
          type: 'text',
          placeholder: 'e.g., fintech, healthcare, e-commerce, SaaS',
          required: true,
          description: 'What industry does your business operate in?'
        },
        {
          id: 'business_model',
          label: 'Business Model',
          type: 'select',
          options: ['B2B', 'B2C', 'B2B2C', 'Marketplace', 'Subscription', 'Freemium', 'E-commerce'],
          required: true,
          description: 'What is your business model?'
        },
        {
          id: 'target_market',
          label: 'Target Market',
          type: 'text',
          placeholder: 'e.g., small businesses, millennials, healthcare providers',
          required: true,
          description: 'Who is your target market?'
        },
        {
          id: 'funding_goal',
          label: 'Funding Goal',
          type: 'select',
          options: ['Bootstrapped', '$10K-50K', '$50K-250K', '$250K-1M', '$1M+'],
          required: true,
          description: 'How much funding are you seeking?'
        },
        {
          id: 'timeline',
          label: 'Business Timeline',
          type: 'select',
          options: ['6 months', '1 year', '2 years', '3-5 years'],
          required: true,
          description: 'What timeline should the business plan cover?'
        }
      ],
      promptTemplate: 'Create a detailed business plan for {{business_idea}} in the {{industry}} industry. Target market: {{target_market}}. Business model: {{business_model}}. Funding goal: {{funding_goal}}. Timeline: {{timeline}}'
    }
  },
  {
    id: 'research-project',
    title: 'Research Project',
    icon: '🔬',
    description: 'Academic research methodology with literature review, data collection, and analysis framework.',
    prompt: 'Design a research project investigating the impact of remote work on employee productivity and well-being',
    category: 'research',
    color: {
      bg: 'bg-teal-100',
      border: 'hover:border-teal-300',
      icon: 'text-teal-600'
    },
    template: {
      title: 'Research Project Setup',
      description: 'Design a comprehensive research project with methodology, data collection, and analysis framework.',
      fields: [
        {
          id: 'research_topic',
          label: 'Research Topic',
          type: 'text',
          placeholder: 'e.g., impact of remote work, social media effects, climate change',
          required: true,
          description: 'What is the main topic of your research?'
        },
        {
          id: 'research_question',
          label: 'Research Question',
          type: 'textarea',
          placeholder: 'What specific question are you trying to answer?',
          required: true,
          description: 'What is your main research question or hypothesis?'
        },
        {
          id: 'research_type',
          label: 'Research Type',
          type: 'select',
          options: ['Qualitative', 'Quantitative', 'Mixed Methods', 'Literature Review', 'Case Study'],
          required: true,
          description: 'What type of research methodology will you use?'
        },
        {
          id: 'target_population',
          label: 'Target Population',
          type: 'text',
          placeholder: 'e.g., remote workers, college students, small business owners',
          required: true,
          description: 'Who is your target population for this research?'
        },
        {
          id: 'data_collection',
          label: 'Data Collection Methods',
          type: 'multiselect',
          options: ['Surveys', 'Interviews', 'Focus Groups', 'Observations', 'Document Analysis', 'Experiments'],
          required: true,
          description: 'How will you collect data for your research?'
        },
        {
          id: 'timeline',
          label: 'Research Timeline',
          type: 'select',
          options: ['1 month', '3 months', '6 months', '1 year'],
          required: true,
          description: 'How long do you have to complete this research?'
        }
      ],
      promptTemplate: 'Design a comprehensive research project investigating {{research_topic}}. Research question: {{research_question}}. Use {{research_type}} methodology with {{data_collection}} for data collection. Target population: {{target_population}}. Timeline: {{timeline}}'
    }
  },
  {
    id: 'seo-article',
    title: 'SEO Article',
    icon: '🔍',
    description: 'SEO-optimized article with keyword research, content structure, and optimization strategies.',
    prompt: 'Write an SEO-optimized article about sustainable fashion trends targeting the keyword "eco-friendly clothing brands"',
    category: 'content',
    color: {
      bg: 'bg-orange-100',
      border: 'hover:border-orange-300',
      icon: 'text-orange-600'
    },
    template: {
      title: 'SEO Article Configuration',
      description: 'Create an SEO-optimized article with targeted keywords, proper structure, and content strategy.',
      fields: [
        {
          id: 'topic',
          label: 'Article Topic',
          type: 'text',
          placeholder: 'e.g., sustainable fashion trends, digital marketing tips, healthy recipes',
          required: true,
          description: 'What is the main topic of your article?'
        },
        {
          id: 'primary_keyword',
          label: 'Primary Keyword',
          type: 'text',
          placeholder: 'e.g., eco-friendly clothing brands, SEO best practices, healthy meal prep',
          required: true,
          description: 'What is your main target keyword?'
        },
        {
          id: 'secondary_keywords',
          label: 'Secondary Keywords',
          type: 'text',
          placeholder: 'e.g., sustainable fashion, organic clothing, ethical brands',
          required: false,
          description: 'Additional keywords to target (comma-separated)'
        },
        {
          id: 'target_audience',
          label: 'Target Audience',
          type: 'text',
          placeholder: 'e.g., eco-conscious consumers, small business owners, fitness enthusiasts',
          required: true,
          description: 'Who is your target audience?'
        },
        {
          id: 'content_angle',
          label: 'Content Angle',
          type: 'select',
          options: ['How-to Guide', 'Listicle', 'Comparison', 'Review', 'News/Trends', 'Educational', 'Case Study'],
          required: true,
          description: 'What type of article structure do you want?'
        },
        {
          id: 'search_intent',
          label: 'Search Intent',
          type: 'select',
          options: ['Informational', 'Commercial', 'Transactional', 'Navigational'],
          required: true,
          description: 'What is the primary search intent for your keyword?'
        },
        {
          id: 'word_count',
          label: 'Target Word Count',
          type: 'select',
          options: ['500-800 words', '800-1200 words', '1200-1800 words', '1800-2500 words', '2500+ words'],
          required: true,
          description: 'How long should the article be?'
        },
        {
          id: 'tone',
          label: 'Writing Tone',
          type: 'select',
          options: ['Professional', 'Conversational', 'Educational', 'Friendly', 'Authoritative', 'Casual'],
          required: true,
          description: 'What tone should the article have?'
        }
      ],
      promptTemplate: 'Write an SEO-optimized {{content_angle}} about {{topic}} targeting the primary keyword "{{primary_keyword}}" and secondary keywords: {{secondary_keywords}}. Target audience: {{target_audience}}. Search intent: {{search_intent}}. Word count: {{word_count}}. Tone: {{tone}}'
    }
  }
];

export const getAutoFlowsByCategory = (category: AutoFlowExample['category']) => {
  return AUTO_FLOW_EXAMPLES.filter(flow => flow.category === category);
};

export const getAutoFlowById = (id: string) => {
  return AUTO_FLOW_EXAMPLES.find(flow => flow.id === id);
};

export const getAllCategories = () => {
  return Array.from(new Set(AUTO_FLOW_EXAMPLES.map(flow => flow.category)));
}; 
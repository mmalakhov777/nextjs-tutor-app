// Import all agent configurations
import { GENERAL_ASSISTANT_CONFIG } from './general-assistant';
import { SEO_AGENT_CONFIG } from './seo-agent';
import { CLAUDE_CREATIVE_CONFIG } from './claude-creative';
// import { PERPLEXITY_CONFIG } from './perplexity';
import { DEEP_SEEK_CONFIG } from './deep-seek';
import { MISTRAL_EUROPE_CONFIG } from './mistral-europe';
import { DEEP_THINKER_CONFIG } from './deep-thinker';
import { GROK_X_CONFIG } from './grok-x';
import { TRIAGE_AGENT_CONFIG } from './triage-agent';
import { CONTENT_WRITER_CONFIG } from './content-writer';
import { FLASH_CARD_MAKER_CONFIG } from './flash-card-maker';
import { DEEP_WEB_RESEARCHER_CONFIG } from './deep-web-researcher';
import { YOUTUBE_AGENT_CONFIG } from './youtube-agent';
import { CV_WRITER_CONFIG } from './cv-writer';
import { PRESENTATION_CREATOR_CONFIG } from './presentation-creator';

// Import UI components for icons
import { TriageAgentLogo } from '@/components/icons/TriageAgentLogo';
import { GrokXLogo } from '@/components/icons/GrokXLogo';
import { MistralLogo } from '@/components/icons/MistralLogo';
import { ClaudeCreativeLogo } from '@/components/icons/ClaudeCreativeLogo';
import { DeepSeekLogo } from '@/components/icons/DeepSeekLogo';

import { Search, UserCircle, FileText, Brain, Globe, Video, User, Presentation, Bot, Sparkles, Zap } from 'lucide-react';

// UI Configuration for agents
export interface AgentUIConfig {
  icon: React.ComponentType<{ className?: string }>;
  circleColor: string;
  textColor: string;
  shortDescription: string;
  aliases?: string[];
  type: 'agent' | 'model'; // Distinguish between agents and models
  handoffCriteria: {
    keywords: string[];
    contexts: string[];
    taskTypes: string[];
    shouldHandoffWhen: string[];
    shouldNotHandoffWhen: string[];
  };
}

const AGENT_UI_CONFIG: Record<string, AgentUIConfig> = {
  'General Assistant': {
    icon: Bot,
    circleColor: 'bg-emerald-500',
    textColor: 'text-white',
    shortDescription: 'Handles general tasks',
    aliases: ['Triage Agent'],
    type: 'agent',
    handoffCriteria: {
      keywords: [], // No specific keywords - only used as fallback
      contexts: ['fallback', 'no other agent matches', 'completely unclear request', 'absolutely general'],
      taskTypes: ['fallback assistance', 'unmatched requests', 'when no other agent applies'],
      shouldHandoffWhen: ['NO other agent can handle the request', 'Request does not match ANY specialized agent', 'Absolutely no domain-specific keywords found', 'Complete fallback needed'],
      shouldNotHandoffWhen: ['ANY specialized agent keywords detected', 'Request matches another agent even partially', 'Domain-specific task identified', 'Any tool or specialized capability needed']
    }
  },
  'SEO Agent': {
    icon: Search,
    circleColor: 'rounded-[1000px] border border-[#E8E8E5] bg-[#FF6B35]',
    textColor: 'text-white',
    shortDescription: 'SEO & keyword analysis',
    type: 'agent',
    handoffCriteria: {
      keywords: ['seo', 'keywords', 'search engine', 'ranking', 'google', 'optimization', 'meta', 'backlinks', 'serp'],
      contexts: ['website optimization', 'search rankings', 'keyword research', 'content optimization'],
      taskTypes: ['SEO analysis', 'keyword research', 'content optimization', 'search ranking improvement'],
      shouldHandoffWhen: ['SEO-related questions', 'Keyword research needed', 'Search engine optimization', 'Website ranking analysis'],
      shouldNotHandoffWhen: ['General content writing', 'Non-SEO marketing', 'Technical development']
    }
  },
  'Claude Creative': {
    icon: ClaudeCreativeLogo,
    circleColor: 'rounded-[1000px] border border-[#E8E8E5] bg-[#D77655]',
    textColor: 'text-white',
    shortDescription: 'Creative writing & ideas',
    type: 'model',
    handoffCriteria: {
      keywords: ['creative', 'story', 'poem', 'artistic', 'brainstorm', 'idea', 'imagination', 'fiction', 'narrative'],
      contexts: ['creative writing', 'artistic projects', 'storytelling', 'brainstorming sessions'],
      taskTypes: ['creative writing', 'story creation', 'artistic ideas', 'brainstorming', 'fiction writing'],
      shouldHandoffWhen: ['Creative writing needed', 'Artistic projects', 'Storytelling', 'Brainstorming creative ideas'],
      shouldNotHandoffWhen: ['Technical writing', 'Business documents', 'Factual research', 'Data analysis']
    }
  },

  'Deep Seek': {
    icon: DeepSeekLogo,
    circleColor: 'rounded-[1000px] border border-[#E8E8E5] bg-[#4D6BFE]',
    textColor: 'text-white',
    shortDescription: 'Chinese culture & business',
    type: 'model',
    handoffCriteria: {
      keywords: ['china', 'chinese', 'mandarin', 'beijing', 'shanghai', 'asian', 'confucius', 'taoism'],
      contexts: ['Chinese culture', 'Asian business', 'Chinese language', 'Eastern philosophy'],
      taskTypes: ['Chinese cultural analysis', 'Asian business advice', 'Chinese language help', 'Eastern philosophy'],
      shouldHandoffWhen: ['Chinese culture questions', 'Asian business context', 'Chinese language needs', 'Eastern philosophy'],
      shouldNotHandoffWhen: ['Western culture focus', 'Non-Asian contexts', 'General business advice']
    }
  },
  'Mistral Europe': {
    icon: MistralLogo,
    circleColor: 'rounded-[1000px] border border-[#E8E8E5] bg-[#FA5310]',
    textColor: 'text-white',
    shortDescription: 'European culture & languages',
    type: 'model',
    handoffCriteria: {
      keywords: ['europe', 'european', 'france', 'germany', 'italy', 'spain', 'eu', 'gdpr', 'brexit'],
      contexts: ['European culture', 'EU regulations', 'European languages', 'European business'],
      taskTypes: ['European cultural analysis', 'EU compliance', 'European language help', 'European business'],
      shouldHandoffWhen: ['European context needed', 'EU regulations', 'European languages', 'European business'],
      shouldNotHandoffWhen: ['Non-European contexts', 'Global business', 'Asian or American focus']
    }
  },
  'Deep Thinker': {
    icon: TriageAgentLogo,
    circleColor: 'rounded-[1000px] border border-[#E8E8E5] bg-[#232323]',
    textColor: 'text-white',
    shortDescription: 'Complex analysis',
    type: 'model',
    handoffCriteria: {
      keywords: ['analyze', 'complex', 'philosophy', 'ethics', 'reasoning', 'logic', 'deep', 'critical thinking'],
      contexts: ['complex analysis', 'philosophical discussions', 'ethical dilemmas', 'critical thinking'],
      taskTypes: ['complex analysis', 'philosophical reasoning', 'ethical analysis', 'critical thinking', 'deep reasoning'],
      shouldHandoffWhen: ['Complex analysis needed', 'Philosophical questions', 'Ethical dilemmas', 'Deep reasoning required'],
      shouldNotHandoffWhen: ['Simple questions', 'Basic tasks', 'Creative writing', 'Technical implementation']
    }
  },
  'Grok X': {
    icon: GrokXLogo,
    circleColor: 'bg-[#232323]',
    textColor: 'text-white',
    shortDescription: 'Social media & trends',
    type: 'model',
    handoffCriteria: {
      keywords: ['social media', 'twitter', 'instagram', 'tiktok', 'viral', 'trending', 'meme', 'influencer'],
      contexts: ['social media strategy', 'viral content', 'social trends', 'online culture'],
      taskTypes: ['social media analysis', 'trend analysis', 'viral content creation', 'social media strategy'],
      shouldHandoffWhen: ['Social media questions', 'Trend analysis', 'Viral content creation', 'Social media strategy'],
      shouldNotHandoffWhen: ['Traditional marketing', 'Offline business', 'Technical development', 'Academic research']
    }
  },
  'Content Writer Agent': {
    icon: FileText,
    circleColor: 'rounded-[1000px] border border-[#E8E8E5] bg-[#8B5CF6]',
    textColor: 'text-white',
    shortDescription: 'Professional content creation',
    type: 'agent',
    handoffCriteria: {
      keywords: ['write', 'writing', 'content', 'article', 'blog', 'copy', 'draft', 'compose', 'create text', 'document', 'paragraph', 'essay', 'report', 'letter', 'email', 'post', 'caption', 'description', 'text', 'written', 'author', 'copywriting', 'editorial', 'publication'],
      contexts: ['any writing task', 'content creation', 'document writing', 'text generation', 'written communication'],
      taskTypes: ['all writing tasks', 'content creation', 'document writing', 'email writing', 'blog posts', 'articles', 'reports', 'letters', 'any text creation'],
      shouldHandoffWhen: ['ANY writing task requested', 'User asks to write anything', 'Text creation needed', 'Document creation', 'Content generation', 'Email or letter writing', 'Blog or article creation'],
      shouldNotHandoffWhen: ['CV/Resume writing (use CV Writer)', 'Presentation slides (use Presentation Creator)', 'Creative fiction/poetry (consider Claude Creative)', 'SEO-specific content (consider SEO Agent)']
    }
  },
  'Flash Card Maker': {
    icon: Brain,
    circleColor: 'rounded-[1000px] border border-[#E8E8E5] bg-[#10B981]',
    textColor: 'text-white',
    shortDescription: 'Study flashcards creation',
    type: 'agent',
    handoffCriteria: {
      keywords: ['flashcard', 'study', 'learn', 'memorize', 'quiz', 'test', 'exam', 'education', 'cards'],
      contexts: ['studying', 'education', 'learning', 'test preparation', 'memorization'],
      taskTypes: ['flashcard creation', 'study materials', 'quiz generation', 'learning aids', 'test prep'],
      shouldHandoffWhen: ['Flashcard creation needed', 'Study materials', 'Learning aids', 'Test preparation'],
      shouldNotHandoffWhen: ['Professional content', 'Business documents', 'Creative writing', 'Research tasks']
    }
  },
  'Web Researcher': {
    icon: Globe,
    circleColor: 'rounded-[1000px] border border-[#E8E8E5] bg-[#0EA5E9]',
    textColor: 'text-white',
    shortDescription: 'Deep web research',
    type: 'agent',
    handoffCriteria: {
      keywords: ['research', 'investigate', 'web search', 'find information', 'deep dive', 'analysis', 'sources'],
      contexts: ['web research', 'information gathering', 'deep investigation', 'source finding'],
      taskTypes: ['web research', 'information gathering', 'source analysis', 'deep investigation', 'data collection'],
      shouldHandoffWhen: ['Deep web research needed', 'Information gathering', 'Source analysis', 'Investigation required'],
      shouldNotHandoffWhen: ['Simple questions', 'Creative tasks', 'Personal advice', 'Quick facts']
    }
  },
  'YouTube Agent': {
    icon: Video,
    circleColor: 'rounded-[1000px] border border-[#E8E8E5] bg-[#FF0000]',
    textColor: 'text-white',
    shortDescription: 'Video analysis & transcripts',
    type: 'agent',
    handoffCriteria: {
      keywords: ['youtube', 'video', 'transcript', 'analyze video', 'video content', 'video analysis'],
      contexts: ['video analysis', 'YouTube content', 'video transcripts', 'video research'],
      taskTypes: ['video analysis', 'transcript generation', 'YouTube research', 'video content analysis'],
      shouldHandoffWhen: ['Video analysis needed', 'YouTube content questions', 'Video transcripts', 'Video research'],
      shouldNotHandoffWhen: ['Text content', 'Audio analysis', 'Image analysis', 'Non-video tasks']
    }
  },
  'CV Writer Agent': {
    icon: User,
    circleColor: 'rounded-[1000px] border border-[#E8E8E5] bg-[#059669]',
    textColor: 'text-white',
    shortDescription: 'Professional CV & resume writing',
    type: 'agent',
    handoffCriteria: {
      keywords: ['cv', 'resume', 'curriculum vitae', 'job application', 'career', 'professional profile'],
      contexts: ['job applications', 'career development', 'professional profiles', 'resume writing'],
      taskTypes: ['CV writing', 'resume creation', 'professional profiles', 'job application materials'],
      shouldHandoffWhen: ['CV/resume writing needed', 'Job application materials', 'Professional profiles', 'Career documents'],
      shouldNotHandoffWhen: ['General content writing', 'Creative writing', 'Academic papers', 'Business documents']
    }
  },
  'Presentation Creator Agent': {
    icon: Presentation,
    circleColor: 'rounded-[1000px] border border-[#E8E8E5] bg-[#9333EA]',
    textColor: 'text-white',
    shortDescription: 'Create and edit slide presentations',
    type: 'agent',
    handoffCriteria: {
      keywords: ['presentation', 'slides', 'powerpoint', 'slide deck', 'present', 'slideshow'],
      contexts: ['presentation creation', 'slide design', 'business presentations', 'educational slides'],
      taskTypes: ['presentation creation', 'slide design', 'slide content', 'presentation planning'],
      shouldHandoffWhen: ['Presentation creation needed', 'Slide design', 'Presentation content', 'Slide deck creation'],
      shouldNotHandoffWhen: ['Document writing', 'Web content', 'Social media content', 'Email content']
    }
  }
};

// Export individual configurations
export {
  GENERAL_ASSISTANT_CONFIG,
  SEO_AGENT_CONFIG,
  CLAUDE_CREATIVE_CONFIG,
  // PERPLEXITY_CONFIG,
  DEEP_SEEK_CONFIG,
  MISTRAL_EUROPE_CONFIG,
  DEEP_THINKER_CONFIG,
  GROK_X_CONFIG,
  TRIAGE_AGENT_CONFIG,
  CONTENT_WRITER_CONFIG,
  FLASH_CARD_MAKER_CONFIG,
  DEEP_WEB_RESEARCHER_CONFIG,
  YOUTUBE_AGENT_CONFIG,
  CV_WRITER_CONFIG,
  PRESENTATION_CREATOR_CONFIG,
};

// Create a unified agent registry
export const AGENT_REGISTRY = {
  'General Assistant': GENERAL_ASSISTANT_CONFIG,
  'SEO Agent': SEO_AGENT_CONFIG,
  'Claude Creative': CLAUDE_CREATIVE_CONFIG,
  // 'Perplexity': PERPLEXITY_CONFIG,
  'Deep Seek': DEEP_SEEK_CONFIG,
  'Mistral Europe': MISTRAL_EUROPE_CONFIG,
  'Deep Thinker': DEEP_THINKER_CONFIG,
  'Grok X': GROK_X_CONFIG,
  'Content Writer Agent': CONTENT_WRITER_CONFIG,
  'Flash Card Maker': FLASH_CARD_MAKER_CONFIG,
  'Web Researcher': DEEP_WEB_RESEARCHER_CONFIG,
  'YouTube Agent': YOUTUBE_AGENT_CONFIG,
  'CV Writer Agent': CV_WRITER_CONFIG,
  'Presentation Creator Agent': PRESENTATION_CREATOR_CONFIG,
};

// Type for agent names
export type AgentName = keyof typeof AGENT_REGISTRY;

// Helper function to get agent configuration
export function getAgentConfig(agentName: string) {
  return AGENT_REGISTRY[agentName as AgentName] || AGENT_REGISTRY['General Assistant'];
}

// Helper functions for UI
export function getAgentIcon(agentName: string) {
  // Handle aliases
  const normalizedName = agentName === 'Triage Agent' ? 'General Assistant' : agentName;
  const config = AGENT_UI_CONFIG[normalizedName];
  return config?.icon || UserCircle;
}

export function getAgentCircleColor(agentName: string) {
  // Handle aliases
  const normalizedName = agentName === 'Triage Agent' ? 'General Assistant' : agentName;
  const config = AGENT_UI_CONFIG[normalizedName];
  return config?.circleColor || 'bg-white border border-slate-200';
}

export function getAgentTextColor(agentName: string) {
  // Handle aliases
  const normalizedName = agentName === 'Triage Agent' ? 'General Assistant' : agentName;
  const config = AGENT_UI_CONFIG[normalizedName];
  return config?.textColor || 'text-slate-800';
}

export function getDisplayAgentName(agentName: string) {
  // Always display "General Assistant" instead of "Triage Agent"
  return agentName === 'Triage Agent' ? 'General Assistant' : agentName;
}

export function getAgentShortDescription(agentName: string) {
  // Handle aliases
  const normalizedName = agentName === 'Triage Agent' ? 'General Assistant' : agentName;
  const config = AGENT_UI_CONFIG[normalizedName];
  return config?.shortDescription || 'AI assistant';
}

export function getAgentHandoffCriteria(agentName: string) {
  // Handle aliases
  const normalizedName = agentName === 'Triage Agent' ? 'General Assistant' : agentName;
  const config = AGENT_UI_CONFIG[normalizedName];
  return config?.handoffCriteria || {
    keywords: [],
    contexts: [],
    taskTypes: [],
    shouldHandoffWhen: [],
    shouldNotHandoffWhen: []
  };
}

export function getAgentType(agentName: string): 'agent' | 'model' {
  // Handle aliases
  const normalizedName = agentName === 'Triage Agent' ? 'General Assistant' : agentName;
  const config = AGENT_UI_CONFIG[normalizedName];
  return config?.type || 'agent';
}

export function isAgent(agentName: string): boolean {
  return getAgentType(agentName) === 'agent';
}

export function isModel(agentName: string): boolean {
  return getAgentType(agentName) === 'model';
}

// Export UI config for direct access if needed
export { AGENT_UI_CONFIG }; 
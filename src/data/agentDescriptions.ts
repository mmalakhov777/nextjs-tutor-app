// Agent descriptions that can be reused across the application
// These descriptions are dynamically generated from the agent configurations

import { AGENT_REGISTRY, type AgentName } from '@/lib/agents';

export interface AgentDescription {
  name: string;
  description: string;
  aliases?: string[]; // For agents that may have multiple names (e.g., "Triage Agent" and "General Assistant")
}

// Dynamically generate agent descriptions from the agent registry
export const agentDescriptions: AgentDescription[] = Object.entries(AGENT_REGISTRY).map(([name, config]) => ({
  name,
  description: config.description,
  // Handle special aliases
  aliases: name === 'General Assistant' ? ['Triage Agent'] : undefined
}));

// Helper function to get description by agent name
export const getAgentDescription = (agentName: string): string => {
  // First check exact name match
  const exactMatch = agentDescriptions.find(agent => agent.name === agentName);
  if (exactMatch) {
    return exactMatch.description;
  }
  
  // Then check aliases
  const aliasMatch = agentDescriptions.find(agent => 
    agent.aliases?.includes(agentName)
  );
  if (aliasMatch) {
    return aliasMatch.description;
  }
  
  // Return empty string if no match found
  return "";
};

// Export individual descriptions for direct access (dynamically generated)
export const generalAssistantDescription = getAgentDescription("General Assistant");
export const seoAgentDescription = getAgentDescription("SEO Agent");
export const grokXDescription = getAgentDescription("Grok X");
export const mistralEuropeDescription = getAgentDescription("Mistral Europe");
export const claudeCreativeDescription = getAgentDescription("Claude Creative");
export const deepSeekDescription = getAgentDescription("Deep Seek");
export const perplexityDescription = getAgentDescription("Perplexity");
export const deepThinkerDescription = getAgentDescription("Deep Thinker");
export const triageAgentDescription = getAgentDescription("Triage Agent");
export const contentWriterDescription = getAgentDescription("Content Writer Agent"); 
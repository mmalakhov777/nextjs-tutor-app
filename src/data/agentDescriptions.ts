// Agent descriptions that can be reused across the application
// These descriptions are aligned with the backend agent configurations

export interface AgentDescription {
  name: string;
  description: string;
  aliases?: string[]; // For agents that may have multiple names (e.g., "Triage Agent" and "General Assistant")
}

export const agentDescriptions: AgentDescription[] = [
  {
    name: "General Assistant",
    description: "A versatile assistant for general questions that don't require specialized knowledge. Provides comprehensive and accurate responses across a wide range of topics.",
    aliases: ["Triage Agent"] // Handle the alias case
  },
  {
    name: "Grok X",
    description: "Specialized in social media trends, viral content, and the latest news. Provides context and analysis for current events and trending topics."
  },
  {
    name: "Mistral Europe",
    description: "Focuses on European languages, writing, culture, and history. Particularly useful for discussing European literature, art, languages, and cultural traditions."
  },
  {
    name: "Claude Creative",
    description: "Specializes in creative writing and coding tasks. Assists with stories, poetry, scripts, and programming challenges with clear explanations and examples."
  },
  {
    name: "Deep Seek",
    description: "Expert in Chinese culture, language, history, and current affairs. Provides insights on Chinese business practices, traditions, and societal developments."
  },
  {
    name: "Perplexity",
    description: "Provides up-to-date information through internet search. Synthesizes current information from multiple sources and includes citations in responses."
  },
  {
    name: "Deep Thinker",
    description: "Handles complex topics like medicine, philosophy, ethics, and advanced scientific concepts. Breaks down intricate ideas with thorough analysis and explanations."
  }
];

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

// Export individual descriptions for direct access
export const generalAssistantDescription = getAgentDescription("General Assistant");
export const grokXDescription = getAgentDescription("Grok X");
export const mistralEuropeDescription = getAgentDescription("Mistral Europe");
export const claudeCreativeDescription = getAgentDescription("Claude Creative");
export const deepSeekDescription = getAgentDescription("Deep Seek");
export const perplexityDescription = getAgentDescription("Perplexity");
export const deepThinkerDescription = getAgentDescription("Deep Thinker"); 
import { useState, useEffect, useCallback } from 'react';
import type { AgentOrTool } from '@/types/chat';
import { AGENT_REGISTRY } from '@/lib/agents';

const getBackendUrl = () => {
  return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5002';
};

// Generate default agents dynamically from the agent registry
const DEFAULT_AGENTS: AgentOrTool[] = Object.entries(AGENT_REGISTRY).map(([name, config], index) => ({
  id: name.toLowerCase().replace(/\s+/g, '-'),
  name,
  enabled: true,
  can_disable: false,
  type: 'agent' as const,
  instructions: config.systemPrompt,
  model: config.model?.modelId || 'gpt-4.1' // Extract model ID from the model object
}));

export function useAgents(userId: string | null) {
  const [agents, setAgents] = useState<AgentOrTool[]>(DEFAULT_AGENTS);
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);

  const fetchAgents = useCallback(async (userId: string | null) => {
    if (!userId) {
      setAgents(DEFAULT_AGENTS);
      return DEFAULT_AGENTS;
    }
    
    setIsLoadingAgents(true);
    
    try {
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/agents?user_id=${encodeURIComponent(userId)}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch agents');
      }
      
      const data = await response.json();
      
      let fetchedAgents: AgentOrTool[] = [];
      
      if (data && data.agents && Array.isArray(data.agents)) {
        fetchedAgents = data.agents;
      } else if (Array.isArray(data)) {
        fetchedAgents = data;
      }
      
      // If no agents from API, use default agents
      // If agents from API, merge with defaults (API agents take precedence)
      let finalAgents: AgentOrTool[];
      
      if (fetchedAgents.length === 0) {
        finalAgents = DEFAULT_AGENTS;
      } else {
        // Merge API agents with defaults, giving priority to API agents
        const apiAgentNames = new Set(fetchedAgents.map(agent => agent.name));
        const defaultsNotInApi = DEFAULT_AGENTS.filter(defaultAgent => 
          !apiAgentNames.has(defaultAgent.name)
        );
        finalAgents = [...fetchedAgents, ...defaultsNotInApi];
      }
      
      setAgents(finalAgents);
      return finalAgents;
    } catch (error) {
      console.error('Error fetching agents:', error);
      // On error, fall back to default agents
      setAgents(DEFAULT_AGENTS);
      return DEFAULT_AGENTS;
    } finally {
      setIsLoadingAgents(false);
    }
  }, []);

  useEffect(() => {
    if (userId) {
      fetchAgents(userId);
    } else {
      setAgents(DEFAULT_AGENTS);
    }
  }, [userId, fetchAgents]);

  const handleToggleAgentOrTool = async (agent: any) => {
    try {
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/agents/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agent_id: agent.id,
          enabled: !agent.enabled,
          user_id: userId
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to toggle agent');
      }
      
      setAgents(prevAgents => 
        prevAgents.map(a => 
          a.id === agent.id ? { ...a, enabled: !a.enabled } : a
        )
      );
      
      return { 
        success: true, 
        message: `${agent.name} ${!agent.enabled ? 'enabled' : 'disabled'} successfully` 
      };
    } catch (error) {
      console.error('Error toggling agent:', error);
      return { 
        success: false, 
        message: `Error: ${error instanceof Error ? error.message : 'Failed to toggle agent'}` 
      };
    }
  };

  return {
    agents,
    isLoadingAgents,
    fetchAgents,
    handleToggleAgentOrTool,
    setAgents
  };
} 
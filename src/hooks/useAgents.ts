import { useState, useEffect, useCallback } from 'react';
import type { AgentOrTool } from '@/types/chat';

const getBackendUrl = () => {
  return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5002';
};

export function useAgents(userId: string | null) {
  const [agents, setAgents] = useState<AgentOrTool[]>([]);
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);

  const fetchAgents = useCallback(async (userId: string | null) => {
    if (!userId) return [];
    
    setIsLoadingAgents(true);
    
    try {
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/agents?user_id=${encodeURIComponent(userId)}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch agents');
      }
      
      const data = await response.json();
      
      if (data && data.agents && Array.isArray(data.agents)) {
        setAgents(data.agents);
        return data.agents;
      } else if (Array.isArray(data)) {
        setAgents(data);
        return data;
      } else {
        setAgents([]);
        return [];
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
      setAgents([]);
      return [];
    } finally {
      setIsLoadingAgents(false);
    }
  }, []);

  useEffect(() => {
    if (userId) {
      fetchAgents(userId);
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
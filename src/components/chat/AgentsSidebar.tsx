import { Users, X, Info, Plus, Settings, Wrench, Shield, UserCircle, Brain, Globe, Sparkles, Search, BookOpen, Code, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { AgentsSidebarProps } from '@/types/chat';
import Link from 'next/link';
import { useEffect, useState, memo } from 'react';
import { GrokXLogo } from '@/components/icons/GrokXLogo';
import { TriageAgentLogo } from '@/components/icons/TriageAgentLogo';
import { ClaudeCreativeLogo } from '@/components/icons/ClaudeCreativeLogo';
import { DeepSeekLogo } from '@/components/icons/DeepSeekLogo';
import { MistralLogo } from '@/components/icons/MistralLogo';
import { PerplexityLogo } from '@/components/icons/PerplexityLogo';
import React from 'react';

// Update the AgentsSidebarProps interface
interface ExtendedAgentsSidebarProps extends AgentsSidebarProps {
  onAgentsUpdate?: (updatedAgents: any[]) => void;
}

// Use React.memo to prevent unnecessary re-renders
const AgentsSidebar = memo(function AgentsSidebar({
  agents,
  isLoadingAgents,
  showAgentsSidebar,
  onToggleAgentsSidebar,
  onToggleAgentOrTool,
  vectorStoreInfo = null,
  userId,
  onAgentsUpdate
}: ExtendedAgentsSidebarProps) {
  const [searchParams, setSearchParams] = useState('');
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showAllAgents, setShowAllAgents] = useState(false);
  const [editingAgent, setEditingAgent] = useState<any | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [agentInstructions, setAgentInstructions] = useState('');
  const [agentName, setAgentName] = useState('');
  
  // Memoize agent lists to prevent unnecessary recalculations
  const defaultAgents = React.useMemo(() => 
    agents.filter(agent => 
      agent.name === "Triage Agent" || 
      agent.name === "Grok X" || 
      agent.name === "Mistral Europe" ||
      agent.name === "Claude Creative" ||
      agent.name === "Deep Seek" ||
      agent.name === "Perplexity" ||
      agent.name === "Deep Thinker" ||
      agent.name === "General Assistant"
    ), [agents]
  );
  
  const customAgents = React.useMemo(() => 
    agents.filter(agent => 
      agent.name !== "Triage Agent" && 
      agent.name !== "Grok X" && 
      agent.name !== "Mistral Europe" &&
      agent.name !== "Claude Creative" &&
      agent.name !== "Deep Seek" &&
      agent.name !== "Perplexity" &&
      agent.name !== "Deep Thinker" &&
      agent.name !== "General Assistant"
    ), [agents]
  );

  // Check if there's an active custom agent - memoize this calculation
  const hasActiveCustomAgent = React.useMemo(() => 
    customAgents.some(agent => agent.enabled), 
    [customAgents]
  );
  
  // Effect to set agent instructions and name when editing an agent
  useEffect(() => {
    if (editingAgent) {
      setAgentInstructions(editingAgent.instructions || '');
      setAgentName(editingAgent.name || '');
    } else {
      setAgentInstructions('');
      setAgentName('');
    }
  }, [editingAgent]);
  
  // Detect mobile screen size
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Initial check
    checkIfMobile();
    
    // Add resize listener
    window.addEventListener('resize', checkIfMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);
  
  // Get URL query parameters when the component mounts
  useEffect(() => {
    const params = window.location.search;
    setSearchParams(params);
  }, []);

  // Add a helper function to get the backend URL at the top of the file
  const getBackendUrl = () => {
    return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5002';
  };

  // Replace fetch calls in the component
  // For handleAgentUpdate function
  const handleAgentUpdate = React.useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingAgent) return;
    
    setIsUpdating(true);
    
    try {
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/agents/${editingAgent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instructions: agentInstructions,
          name: agentName
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update agent: ${response.status}`);
      }
      
      setNotification('Agent updated successfully');
      setTimeout(() => setNotification(null), 2000);
      setEditingAgent(null);
      
      // Notify parent component if callback is provided
      if (onAgentsUpdate) {
        // Fetch updated agents
        const updatedResponse = await fetch(`${backendUrl}/api/agents?user_id=${userId}`);
        if (updatedResponse.ok) {
          const updatedAgents = await updatedResponse.json();
          onAgentsUpdate(updatedAgents);
        }
      }
    } catch (error) {
      console.error('Error updating agent:', error);
      setNotification('Error updating agent');
      setTimeout(() => setNotification(null), 2000);
    } finally {
      setIsUpdating(false);
    }
  }, [editingAgent, agentInstructions, agentName, userId, onAgentsUpdate]);

  // Helper function to get agent icon - memoize to prevent recreation
  const getAgentIcon = React.useCallback((agentName: string) => {
    switch(agentName) {
      case "Triage Agent":
      case "General Assistant":
      case "Deep Thinker":
        return <TriageAgentLogo className="h-4 w-4" />;
      case "Grok X":
        return <GrokXLogo className="h-4 w-4" />;
      case "Mistral Europe":
        return <MistralLogo className="h-4 w-4" />;
      case "Claude Creative":
        return <ClaudeCreativeLogo className="h-4 w-4" />;
      case "Deep Seek":
        return <DeepSeekLogo className="h-4 w-4" />;
      case "Perplexity":
        return <PerplexityLogo className="h-4 w-4" />;
      default:
        return <UserCircle className="h-4 w-4" />;
    }
  }, []);

  // Helper function to get agent description - memoize
  const getAgentDescription = React.useCallback((agentName: string) => {
    switch(agentName) {
      case "Triage Agent":
        return "Routes and coordinates between specialized agents for optimal responses";
      case "Grok X":
        return "Great for questions about social media trends, viral content, and the latest news";
      case "Mistral Europe":
        return "Specializes in European languages, culture, and regional topics";
      case "Claude Creative":
        return "Great for questions about social media trends, viral content, and the latest news";
      case "Deep Seek":
        return "Expert in Chinese culture, language, and current affairs";
      case "Perplexity":
        return "Provides up-to-date information and internet search results";
      case "Deep Thinker":
        return "Great for questions about social media trends, viral content, and the latest news";
      case "General Assistant":
        return "Great for questions about social media trends, viral content, and the latest news";
      default:
        return "";
    }
  }, []);

  // Helper function to get agent color based on name - memoize
  const getAgentCircleColor = React.useCallback((agentName: string) => {
    switch(agentName) {
      case "Triage Agent":
      case "General Assistant":
        return "bg-emerald-500"; // Green color for both Triage and General Assistant
      case "Claude Creative":
        return "rounded-[1000px] border border-[#E8E8E5] bg-[#D77655]"; // Specific Claude Creative styling
      case "Deep Seek":
        return "rounded-[1000px] border border-[#E8E8E5] bg-[#4D6BFE]"; // Specific Deep Seek styling
      case "Mistral Europe":
        return "rounded-[1000px] border border-[#E8E8E5] bg-[#FA5310]"; // Specific Mistral Europe styling
      case "Perplexity":
        return "rounded-[1000px] border border-[#E8E8E5] bg-[#1F1F1F]"; // Specific Perplexity styling
      case "Deep Thinker":
        return "rounded-[1000px] border border-[#E8E8E5] bg-black"; // Deep Thinker styling with pure black
      case "Grok X":
        return "bg-black"; // Black color for the third icon
      default:
        return "bg-white border border-slate-200";
    }
  }, []);
  
  // Get icon color based on agent background color - memoize
  const getIconTextColor = React.useCallback((agentName: string) => {
    switch(agentName) {
      case "Triage Agent":
      case "General Assistant":
      case "Claude Creative":
      case "Grok X":
      case "Deep Seek":
      case "Mistral Europe":
      case "Perplexity":
      case "Deep Thinker":
        return "text-white"; // White text for dark backgrounds
      default:
        return "text-slate-800"; // Dark text for light backgrounds
    }
  }, []);

  // Helper function to render agent card - memoize
  const renderAgentCard = React.useCallback((agent: any, index: number) => {
    const agentKey = agent.id ? agent.id : `${agent.name}-${index}`;
    const agentUrl = `/agents?user_id=${userId}&agent_id=${agent.id}${searchParams}`;
    
    return (
      <Link href={agentUrl} key={agentKey}>
        <div 
          className="flex p-4 items-start gap-3 relative group cursor-pointer hover:bg-slate-50 transition-colors"
          style={{
            borderRadius: '16px',
            border: '1px solid var(--Monochrome-Light, #E8E8E5)',
            background: 'var(--ultralight)',
            width: '100%'
          }}
        >
          <div 
            className={`flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0 ${getAgentCircleColor(agent.name)} ${getIconTextColor(agent.name)}`}
          >
            {getAgentIcon(agent.name)}
          </div>
          <div className="flex flex-col flex-grow min-w-0 overflow-hidden">
            <div className="flex items-center justify-between w-full">
              <span className="text-sm font-medium text-foreground">
                {agent.name}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.preventDefault(); // Prevent navigation when clicking settings
                  window.location.href = agentUrl;
                }}
              >
                <Settings className="h-4 w-4 text-slate-600" />
              </Button>
            </div>
            
            <div className="flex flex-wrap gap-2 mt-2">
              {agent.handoff_description && (
                <span className="text-xs text-slate-600">
                  {agent.handoff_description}
                </span>
              )}
              {!agent.can_disable && (
                <span className="text-xs text-slate-500 italic">
                  Required agent
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
    );
  }, [userId, searchParams, getAgentCircleColor, getIconTextColor, getAgentIcon]);

  return (
    <div className={`${isMobile ? 'w-full' : 'w-64 border-r'} bg-white h-full overflow-y-auto`}>
      <div 
        className={`flex justify-between items-center h-[60px] px-4 ${isMobile ? 'hidden' : ''}`}
        style={{ 
          borderBottom: '1px solid var(--light)',
          alignSelf: 'stretch'
        }}
      >
        <h2 className="text-lg font-bold text-foreground">Agents</h2>
      </div>
      
      <div className={`${isMobile ? 'p-2' : 'p-3 sm:p-4'} pt-4 sm:pt-6`}>
        {isLoadingAgents ? (
          <div className="flex justify-center items-center h-20">
            <div className="animate-spin h-5 w-5 sm:h-6 sm:w-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-3">
            {/* AI Agents Card */}
            <div>
              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                {/* Main Card Header */}
                <div 
                  className="p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => setShowAllAgents(!showAllAgents)}
                >
                  <div className="flex flex-col">
                    {/* Agent Circles */}
                    <div className="flex items-center -space-x-3 mb-4">
                      {defaultAgents.slice(0, 3).map((agent, index) => (
                        <div 
                          key={agent.id || index}
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${getAgentCircleColor(agent.name)} ${getIconTextColor(agent.name)}`}
                          onClick={(e) => e.stopPropagation()}
                          style={{ width: '32px', height: '32px' }}
                        >
                          {getAgentIcon(agent.name)}
                        </div>
                      ))}
                      <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white border border-slate-200 text-slate-800"
                        style={{ width: '32px', height: '32px' }}
                      >
                        <span className="text-sm font-medium">+4</span>
                      </div>
                    </div>
                    
                    <h3 className="font-bold text-slate-900 mb-2" style={{ fontSize: '16px' }}>How it works</h3>
                    <p className="text-sm text-slate-600">We automatically select the most suitable AI Agent for your question</p>
                  </div>
                </div>
                
                {/* Expanded Agent List */}
                {showAllAgents && (
                  <div>
                    {defaultAgents.map((agent, index) => (
                      <div 
                        key={agent.id || `agent-${index}`}
                        className="p-4 border-t border-slate-100"
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getAgentCircleColor(agent.name)} ${getIconTextColor(agent.name)}`}
                            style={{ width: '32px', height: '32px' }}
                          >
                            {getAgentIcon(agent.name)}
                          </div>
                          <div className="text-base font-semibold">{agent.name}</div>
                        </div>
                        <p className="text-sm text-slate-600">{getAgentDescription(agent.name)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Custom Agents Section - Only show if there's an active custom agent */}
            {hasActiveCustomAgent && customAgents.length > 0 && (
              <div>
                <div className="space-y-2">
                  {customAgents.map((agent, index) => renderAgentCard(agent, index))}
                </div>
              </div>
            )}
            
            {/* Add New Button - Only show if there's no active custom agent */}
            {!hasActiveCustomAgent && (
              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden p-4">
                <div className="flex flex-col">
                  <h3 className="font-bold text-slate-900 mb-2" style={{ fontSize: '16px' }}>Create your own agent</h3>
                  <p className="text-sm text-slate-600 mb-4">Tailor a smart agent to solve your tasks and work the way you do</p>
                  
                  <Link href={`/agents?user_id=${userId}${searchParams}`}>
                    <Button
                      variant="outline"
                      className="w-full text-sm hover:text-foreground"
                      style={{
                        display: 'flex',
                        padding: '12px',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '4px',
                        alignSelf: 'stretch',
                        borderRadius: '8px',
                        border: '1px solid var(--Monochrome-Light, #E8E8E5)',
                        background: 'var(--Monochrome-Superlight, #F2F2ED)'
                      }}
                    >
                      <Plus className="h-4 w-4" />
                      Create agent
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Notification display */}
      {notification && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg">
          {notification}
        </div>
      )}
    </div>
  );
});

export { AgentsSidebar }; 
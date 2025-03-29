'use client';

import { useState, useEffect, Suspense } from 'react';
import AgentList from '@/components/agents/AgentList';
import { AgentForm } from '@/components/agents/AgentForm';
import { Button } from '@/components/ui/button';
import { FiPlus } from 'react-icons/fi';
import { MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertTriangle } from 'lucide-react';
import { Settings, Brain } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

// Add a helper function to get the backend URL at the top of the file
const getBackendUrl = () => {
  return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5002';
};

export interface Agent {
  id: string;
  name: string;
  instructions: string;
  model: string;
  output_type?: string;
  can_disable: boolean;
  enabled: boolean;
  handoff_description?: string;
  is_triage_agent: boolean;
  type: string;  // 'agent' or 'triage'
  created_at?: string;
  updated_at?: string;
  tools?: string[];
  tool_type?: string;
  hosted_type?: string;
  agent_name?: string;
  tool_types?: string[];
  hosted_types?: string[];
  is_custom_template?: boolean;
}

export default function AgentsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <AgentsPageContent />
    </Suspense>
  );
}

function AgentsPageContent() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [isDeletingAgent, setIsDeletingAgent] = useState<string | null>(null);
  const [showUserIdErrorModal, setShowUserIdErrorModal] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const searchParams = useSearchParams();
  const userId = searchParams.get('user_id');

  useEffect(() => {
    if (!userId) {
      setShowUserIdErrorModal(true);
      return;
    }
    fetchAgents();
  }, [userId]);

  useEffect(() => {
    const initializeCustomAgent = () => {
      if (!isLoading && agents.length > 0 && !isDialogOpen) {
        const customAgent = agents.find(agent => agent.is_custom_template);
        if (customAgent) {
          handleEdit(customAgent);
        }
      }
    };

    initializeCustomAgent();
  }, [agents, isLoading]);

  const fetchAgents = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (!userId) {
        setAgents([]);
        setIsLoading(false);
        return;
      }
      
      const backendUrl = getBackendUrl();
      const url = `${backendUrl}/api/agents?user_id=${encodeURIComponent(userId)}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch agents: ${response.status}`);
      }
      
      const data = await response.json();
      
      let agentsArray: Agent[];
      if (Array.isArray(data)) {
        agentsArray = data;
      } else if (data.agents && Array.isArray(data.agents)) {
        agentsArray = data.agents;
      } else {
        throw new Error('Invalid response format');
      }

      const validatedAgents = agentsArray.map(agent => {
        if (!agent.id) {
          throw new Error(`Agent ${agent.name} is missing ID`);
        }
        
        return {
          ...agent,
          id: agent.id,
          name: agent.name || '',
          instructions: agent.instructions || '',
          model: agent.model || 'gpt-4',
          can_disable: agent.can_disable ?? true,
          enabled: agent.enabled ?? true,
          type: agent.is_triage_agent ? 'triage' : 'agent',
          tools: agent.tools || [],
          tool_type: agent.tool_type || 'function',
          tool_types: agent.tool_types || [],
          hosted_types: agent.hosted_types || [],
          is_custom_template: agent.is_custom_template ?? false
        };
      });

      setAgents(validatedAgents);
    } catch (error) {
      setError('Failed to load agents');
      setAgents([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = async (agent: Agent) => {
    try {
      setError(null);
      if (!agent.is_custom_template) {
        return;
      }
      setSelectedAgent(agent);
      setIsDialogOpen(true);
    } catch (error) {
      setError('Failed to edit agent');
    }
  };

  const handleFormClose = () => {
    setIsDialogOpen(false);
    setSelectedAgent(null);
    window.location.href = `/chat${window.location.search}`;
  };

  const handleDelete = async (agent: Agent) => {
    try {
      setError(null);
      setIsDeletingAgent(agent.id);
      
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/agents/${agent.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete agent');
      }

      setAgents(prev => prev.filter(a => a.id !== agent.id));
    } catch (error) {
      setError('Failed to delete agent');
    } finally {
      setIsDeletingAgent(null);
    }
  };

  const handleFormSubmit = async (data: Partial<Agent>) => {
    try {
      setError(null);
      
      if (!userId) {
        setError('User ID is required to create or update agents');
        setIsFormOpen(false);
        return;
      }
      
      const backendUrl = getBackendUrl();
      const endpoint = selectedAgent 
        ? `${backendUrl}/api/agents/${selectedAgent.id}`
        : `${backendUrl}/api/agents/enable-custom`;
      
      if (selectedAgent && !selectedAgent.id) {
        throw new Error('Missing agent ID for update operation');
      }
      
      const requestBody = selectedAgent ? {
        ...data,
        id: selectedAgent.id,
        user_id: userId,
        enabled: data.enabled ?? selectedAgent.enabled,
        handoff_description: data.handoff_description
      } : {
        ...data,
        user_id: userId,
        enabled: true
      };

      const response = await fetch(endpoint, {
        method: selectedAgent ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to save agent');
      }

      if (!responseData.success || !responseData.agent) {
        throw new Error('Invalid response format from server');
      }

      setIsDialogOpen(false);
      setSelectedAgent(null);
      
      window.location.href = `/chat${window.location.search}`;
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to save agent');
      throw error;
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50/30 pt-6">
        <div className="container mx-auto px-4">
          <div className="text-red-500 text-center flex items-center justify-center bg-red-50 rounded-lg p-4">
            <div className="flex flex-col items-center gap-2">
              <span>{error}</span>
              <Button 
                onClick={fetchAgents}
                variant="outline" 
                size="sm"
                className="mt-2"
              >
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/30 pt-6">
      <div className="container mx-auto px-4">
        <div className="flex justify-end mb-6 gap-2">
          <Link href={`/chat${window.location.search}`}>
            <Button 
              className="h-8 px-3 text-sm flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700"
            >
              <MessageSquare size={14} />
              Chat
            </Button>
          </Link>
        </div>

        {!window.location.search.includes('user_id') && (
          <div className="text-center p-8 bg-white rounded-lg shadow-sm mb-6">
            <div className="text-gray-700 mb-4 font-medium">
              Please provide a user ID to view agents
            </div>
            <div className="text-gray-500 mb-4">
              Add <code className="bg-gray-100 px-1.5 py-0.5 rounded">?user_id=YOUR_USER_ID</code> to the URL to view agents for a specific user.
            </div>
            <div className="text-sm text-gray-500 mt-2">
              Example: <code className="bg-gray-100 px-1.5 py-0.5 rounded">?user_id=11111111-1111-1111-1111-111111111111</code>
            </div>
          </div>
        )}

        {agents.length === 0 && window.location.search.includes('user_id') && (
          <div className="text-center p-8 bg-white rounded-lg shadow-sm mb-6">
            <div className="text-gray-500 mb-4">
              No agents found for this user ID.
            </div>
          </div>
        )}

        <AgentList 
          agents={agents} 
          onEdit={handleEdit} 
          onDelete={handleDelete}
          isDeleting={isDeletingAgent || undefined}
          editableAgentType="custom"
        />

      </div>

      {isDialogOpen && selectedAgent && (
        <Dialog open={isDialogOpen} onOpenChange={handleFormClose}>
          <DialogContent fullPage hideCloseButton>
            <div className="flex flex-col h-full">
              <DialogHeader className="border-b py-3 px-4">
                <div className="flex items-center">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleFormClose}
                    style={{
                      display: 'flex',
                      height: '44px',
                      padding: '12px',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: '4px',
                      borderRadius: '8px',
                      border: '1px solid var(--Monochrome-Light, #E8E8E5)',
                      background: 'var(--Monochrome-White, #FFF)'
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-left">
                      <path d="m12 19-7-7 7-7"/>
                      <path d="M19 12H5"/>
                    </svg>
                    Back
                  </Button>
                </div>
              </DialogHeader>
              <div className="flex-1 px-4 py-6 overflow-hidden">
                <AgentForm 
                  key={selectedAgent.id}
                  initialValues={selectedAgent}
                  onSubmit={handleFormSubmit}
                  onCancel={handleFormClose}
                  isEditMode={true}
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={showUserIdErrorModal} onOpenChange={setShowUserIdErrorModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Error: Missing User ID
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="mb-2">A User ID is required to manage agents.</p>
            <p className="text-sm text-gray-600">Please add <code className="bg-gray-100 px-1.5 py-0.5 rounded">?user_id=YOUR_USER_ID</code> to the URL to continue.</p>
          </div>
          <DialogFooter>
            <Button 
              onClick={() => window.location.href = '/'}
              variant="outline"
            >
              Go to Home
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 
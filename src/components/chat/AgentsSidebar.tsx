import { Users, X, Info, Plus, Settings, Wrench, Shield, UserCircle, Brain, Globe, Sparkles, Search, BookOpen, Code, Lightbulb, ChevronDown, ChevronUp, MessageSquare, FileText, Bold, Italic, List, Heading, Underline, ListOrdered } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { AgentsSidebarProps } from '@/types/chat';
import Link from 'next/link';
import { useEffect, useState, memo, useImperativeHandle, forwardRef, useCallback } from 'react';
import { GrokXLogo } from '@/components/icons/GrokXLogo';
import { TriageAgentLogo } from '@/components/icons/TriageAgentLogo';
import { ClaudeCreativeLogo } from '@/components/icons/ClaudeCreativeLogo';
import { DeepSeekLogo } from '@/components/icons/DeepSeekLogo';
import { MistralLogo } from '@/components/icons/MistralLogo';
import { PerplexityLogo } from '@/components/icons/PerplexityLogo';
import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import BoldExtension from '@tiptap/extension-bold';
import ItalicExtension from '@tiptap/extension-italic';
import UnderlineExtension from '@tiptap/extension-underline';
import HeadingExtension from '@tiptap/extension-heading';
import BulletListExtension from '@tiptap/extension-bullet-list';
import OrderedListExtension from '@tiptap/extension-ordered-list';
import LinkExtension from '@tiptap/extension-link';
import { Link as LucideLink } from 'lucide-react';

// Define MSD global interface type
declare global {
  interface Window {
    MSD?: {
      getUser: () => Promise<{ 
        user?: { 
          subscription?: boolean | string;
          subscription_type?: string;
          is_subscription_cancelled?: boolean;
          subscription_valid_until?: string;
          has_paid?: boolean;
          [key: string]: any;  // Allow for any other properties
        } 
      }>;
      openSubscriptionDialog: (options: {
        isClosable: boolean;
        shouldVerifySubscriptionRetrieval: boolean;
        type: string;
      }) => Promise<void>;
      sendAmpEvent?: (eventName: string, eventProperties?: Record<string, any>) => void;
    };
    // Add debug utilities
    show_limits_as_for_unsubscribed?: () => void;
    restore_subscription_state?: () => void;
  }
}

// Update the AgentsSidebarProps interface
interface ExtendedAgentsSidebarProps extends AgentsSidebarProps {
  onAgentsUpdate?: (updatedAgents: any[]) => void;
  onTabChange?: (tab: 'agents' | 'notes') => void;
  currentConversationId?: string; // Add the current conversation ID
}

// Define a ref type for the component
export interface AgentsSidebarRef {
  refreshMessageCount: () => Promise<void>;
}

// Create a minimalist Tiptap editor component
const TiptapEditor = ({ content, onUpdate }: { content: string, onUpdate: (html: string) => void }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      BoldExtension,
      ItalicExtension,
      UnderlineExtension,
      HeadingExtension.configure({
        levels: [1, 2, 3],
      }),
      BulletListExtension,
      OrderedListExtension,
      LinkExtension.configure({
        openOnClick: false,
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onUpdate(editor.getHTML());
    },
  });

  // Toggle link dialog - define this hook before any conditional returns
  const setLink = useCallback(() => {
    if (!editor) return;
    
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    // cancelled
    if (url === null) {
      return;
    }

    // empty
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    // update link
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-gray-200 flex items-center gap-1 px-2 py-1">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1 rounded ${editor.isActive('bold') ? 'bg-gray-100' : ''} hover:bg-gray-50`}
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1 rounded ${editor.isActive('italic') ? 'bg-gray-100' : ''} hover:bg-gray-50`}
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`p-1 rounded ${editor.isActive('underline') ? 'bg-gray-100' : ''} hover:bg-gray-50`}
          title="Underline"
        >
          <Underline className="h-4 w-4" />
        </button>
        <div className="w-px h-4 bg-gray-300 mx-1" />
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`p-1 rounded ${editor.isActive('heading', { level: 1 }) ? 'bg-gray-100' : ''} hover:bg-gray-50`}
          title="Heading 1"
        >
          <Heading className="h-4 w-4" />
        </button>
        <div className="w-px h-4 bg-gray-300 mx-1" />
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-1 rounded ${editor.isActive('bulletList') ? 'bg-gray-100' : ''} hover:bg-gray-50`}
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-1 rounded ${editor.isActive('orderedList') ? 'bg-gray-100' : ''} hover:bg-gray-50`}
          title="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </button>
        <div className="w-px h-4 bg-gray-300 mx-1" />
        <button
          onClick={setLink}
          className={`p-1 rounded ${editor.isActive('link') ? 'bg-gray-100' : ''} hover:bg-gray-50`}
          title="Link"
        >
          <LucideLink className="h-4 w-4" />
        </button>
      </div>
      <div 
        className="flex-grow w-full h-full cursor-text"
        onClick={() => editor.chain().focus().run()}
      >
        <EditorContent 
          editor={editor} 
          className="w-full h-full overflow-y-auto"
          style={{
            height: 'calc(100vh - 100px)',
            padding: '16px',
            outline: 'none',
          }}
        />
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        .ProseMirror {
          min-height: calc(100vh - 100px);
          height: 100%;
          outline: none !important;
          box-shadow: none !important;
          border: none !important;
        }
        .ProseMirror:focus {
          outline: none !important;
          box-shadow: none !important;
          border: none !important;
        }
      `}} />
    </div>
  );
};

// Use React.memo to prevent unnecessary re-renders
const AgentsSidebar = memo(forwardRef<AgentsSidebarRef, ExtendedAgentsSidebarProps>(function AgentsSidebar({
  agents,
  isLoadingAgents,
  showAgentsSidebar,
  onToggleAgentsSidebar,
  onToggleAgentOrTool,
  vectorStoreInfo = null,
  userId,
  onAgentsUpdate,
  onTabChange,
  currentConversationId
}, ref) {
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
  const [todayMessageCount, setTodayMessageCount] = useState<number>(0);
  const [isLoadingMessageCount, setIsLoadingMessageCount] = useState<boolean>(false);
  const [hasSubscription, setHasSubscription] = useState<boolean>(false);
  const [isCheckingSubscription, setIsCheckingSubscription] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'agents' | 'notes'>('agents');
  const [noteContent, setNoteContent] = useState<string>('');
  const [isSavingNotes, setIsSavingNotes] = useState<boolean>(false);
  const [isLoadingNotes, setIsLoadingNotes] = useState<boolean>(false);
  const [lastSavedNoteContent, setLastSavedNoteContent] = useState<string>('');
  
  // Debug state to override subscription status
  const [debugOverrideSubscription, setDebugOverrideSubscription] = useState<boolean | null>(null);
  const [originalSubscriptionState, setOriginalSubscriptionState] = useState<boolean | null>(null);
  
  // Constants
  const MESSAGE_LIMIT = 10;
  const NOTES_AUTOSAVE_DELAY = 2000; // Autosave delay in milliseconds
  
  // Set up debug commands in window object for testing
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Command to simulate unsubscribed user
      window.show_limits_as_for_unsubscribed = () => {
        console.log('[DEBUG] Simulating unsubscribed user experience');
        if (originalSubscriptionState === null) {
          setOriginalSubscriptionState(hasSubscription);
        }
        setDebugOverrideSubscription(false);
        setNotification('Debug mode: Showing UI for unsubscribed user');
        setTimeout(() => setNotification(null), 3000);
      };
      
      // Command to restore actual subscription state
      window.restore_subscription_state = () => {
        console.log('[DEBUG] Restoring actual subscription state');
        if (originalSubscriptionState !== null) {
          setDebugOverrideSubscription(null);
          setNotification('Debug mode off: Showing actual subscription state');
          setTimeout(() => setNotification(null), 3000);
        } else {
          console.log('[DEBUG] No original subscription state saved yet');
        }
      };
      
      // Cleanup
      return () => {
        window.show_limits_as_for_unsubscribed = undefined;
        window.restore_subscription_state = undefined;
      };
    }
  }, [hasSubscription, originalSubscriptionState]);
  
  // Check subscription status
  useEffect(() => {
    const checkSubscription = async () => {
      try {
        setIsCheckingSubscription(true);
        console.log('[MSD] Starting subscription check');
        
        // Use the MSD global object to check subscription status
        if (typeof window !== 'undefined' && window.MSD) {
          console.log('[MSD] MSD global object found');
          
          try {
            const user = await window.MSD.getUser();
            
            // Extract subscription details for logging
            const subscriptionInfo = {
              hasSubscription: !!user?.user?.subscription,
              subscriptionType: user?.user?.subscription_type || 'none',
              subscriptionName: user?.user?.subscription || 'none',
              isSubscriptionCancelled: user?.user?.is_subscription_cancelled || false,
              subscriptionValidUntil: user?.user?.subscription_valid_until || 'N/A',
              hasPaid: user?.user?.has_paid || false
            };
            
            console.log('[MSD] User subscription details:', JSON.stringify(subscriptionInfo, null, 2));
            
            const userHasSubscription = !!user?.user?.subscription;
            console.log('[MSD] User has active subscription:', userHasSubscription);
            
            setHasSubscription(userHasSubscription);
          } catch (subscriptionError) {
            console.error('[MSD] Error getting user data:', subscriptionError);
            setHasSubscription(false);
          }
        } else {
          console.log('[MSD] MSD global object not available');
          setHasSubscription(false);
        }
      } catch (error) {
        console.error('[MSD] Error in subscription check flow:', error);
        setHasSubscription(false);
      } finally {
        console.log('[MSD] Subscription check completed');
        setIsCheckingSubscription(false);
      }
    };
    
    checkSubscription();
  }, []);
  
  // Effect to check message count and trigger subscription dialog when limit is reached
  useEffect(() => {
    // If the user has reached their message limit and doesn't have a subscription,
    // automatically trigger the subscription dialog
    const shouldTriggerSubscriptionDialog = 
      !isCheckingSubscription && 
      !hasSubscription && 
      todayMessageCount >= MESSAGE_LIMIT && 
      debugOverrideSubscription !== true;
      
    if (shouldTriggerSubscriptionDialog && window.MSD) {
      console.log('[MSD] Auto-triggering subscription dialog for limit reached');
      
      // Send amplitude event for limit reached
      if (window.MSD?.sendAmpEvent) {
        console.log('[MSD] Sending limit_reached amplitude event');
        window.MSD.sendAmpEvent("limit_reached");
      }
      
      // Use setTimeout to avoid potential state update during render
      setTimeout(() => {
        window.MSD?.openSubscriptionDialog({
          isClosable: false, // Force the user to make a decision
          shouldVerifySubscriptionRetrieval: true,
          type: "alt2"
        }).then(() => {
          // After dialog closes, check subscription status again
          if (window.MSD) {
            window.MSD.getUser().then(user => {
              const userHasSubscription = !!user?.user?.subscription;
              console.log('[MSD] Auto-triggered dialog closed, subscription status:', userHasSubscription);
              setHasSubscription(userHasSubscription);
              
              // If subscription was successful, clear debug override
              if (userHasSubscription) {
                setDebugOverrideSubscription(null);
                setOriginalSubscriptionState(null);
              }
            }).catch(error => {
              console.error('[MSD] Error checking updated subscription after auto-trigger:', error);
            });
          }
        }).catch(error => {
          console.error('[MSD] Error in auto-triggered subscription dialog flow:', error);
        });
      }, 500);
    }
  }, [todayMessageCount, hasSubscription, isCheckingSubscription, MESSAGE_LIMIT, debugOverrideSubscription]);
  
  // Handler to open subscription dialog
  const handleGetUnlimited = async () => {
    try {
      console.log('[MSD] Opening subscription dialog');
      
      if (typeof window !== 'undefined' && window.MSD) {
        console.log('[MSD] Calling MSD.openSubscriptionDialog');
        
        await window.MSD.openSubscriptionDialog({
          isClosable: true, // User initiated, so allow closing
          shouldVerifySubscriptionRetrieval: true,
          type: "alt2"
        });
        
        console.log('[MSD] Subscription dialog closed, checking updated status');
        
        // Check subscription status again after dialog closes
        try {
          const user = await window.MSD.getUser();
          
          // Extract subscription details for logging
          const subscriptionInfo = {
            hasSubscription: !!user?.user?.subscription,
            subscriptionType: user?.user?.subscription_type || 'none',
            subscriptionName: user?.user?.subscription || 'none',
            isSubscriptionCancelled: user?.user?.is_subscription_cancelled || false,
            subscriptionValidUntil: user?.user?.subscription_valid_until || 'N/A',
            hasPaid: user?.user?.has_paid || false
          };
          
          console.log('[MSD] Updated subscription details:', JSON.stringify(subscriptionInfo, null, 2));
          
          const userHasSubscription = !!user?.user?.subscription;
          console.log('[MSD] User has active subscription:', userHasSubscription);
          
          setHasSubscription(userHasSubscription);
          
          // If subscription was successful, clear debug override
          if (userHasSubscription) {
            setDebugOverrideSubscription(null);
            setOriginalSubscriptionState(null);
          }
        } catch (updateError) {
          console.error('[MSD] Error checking updated subscription:', updateError);
        }
      } else {
        console.error('[MSD] MSD not available for subscription dialog');
      }
    } catch (error) {
      console.error('[MSD] Error in subscription dialog flow:', error);
    }
  };
  
  // Add logging for MSD object on mount
  useEffect(() => {
    console.log('[MSD] Component mounted, checking MSD availability');
    if (typeof window !== 'undefined') {
      console.log('[MSD] Window object available');
      console.log('[MSD] MSD object exists:', !!window.MSD);
      if (window.MSD) {
        console.log('[MSD] MSD methods available:', {
          getUser: typeof window.MSD.getUser === 'function',
          openSubscriptionDialog: typeof window.MSD.openSubscriptionDialog === 'function'
        });
      }
    } else {
      console.log('[MSD] Window object not available (server-side rendering)');
    }
  }, []);
  
  // Memoize agent lists to prevent unnecessary recalculations
  const defaultAgents = React.useMemo(() => {
    // First, get all default agents
    const allDefaultAgents = agents.filter(agent => 
      agent.name === "Triage Agent" || 
      agent.name === "Grok X" || 
      agent.name === "Mistral Europe" ||
      agent.name === "Claude Creative" ||
      agent.name === "Deep Seek" ||
      agent.name === "Perplexity" ||
      agent.name === "Deep Thinker" ||
      agent.name === "General Assistant"
    );
    
    // Deduplicate Triage Agent and General Assistant
    // If we have a Triage Agent, replace it with General Assistant for display purposes
    const hasTriageAgent = allDefaultAgents.some(agent => agent.name === "Triage Agent");
    const hasGeneralAssistant = allDefaultAgents.some(agent => agent.name === "General Assistant");
    
    let processedAgents;
    
    if (hasTriageAgent && !hasGeneralAssistant) {
      // Replace Triage Agent with General Assistant
      processedAgents = allDefaultAgents.map(agent => {
        if (agent.name === "Triage Agent") {
          return { ...agent, name: "General Assistant" };
        }
        return agent;
      });
    } else if (hasTriageAgent && hasGeneralAssistant) {
      // Filter out Triage Agent to avoid duplication
      processedAgents = allDefaultAgents.filter(agent => agent.name !== "Triage Agent");
    } else {
      processedAgents = allDefaultAgents;
    }
    
    // Sort to ensure General Assistant comes first, then maintain the order of others
    return processedAgents.sort((a, b) => {
      if (a.name === "General Assistant" || a.name === "Triage Agent") return -1;
      if (b.name === "General Assistant" || b.name === "Triage Agent") return 1;
      return 0;
    });
  }, [agents]);
  
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

  // New function to fetch today's message count
  const fetchTodayMessageCount = React.useCallback(async () => {
    if (!userId) return;
    
    console.log('[MSD] fetchTodayMessageCount called');
    setIsLoadingMessageCount(true);
    
    try {
      // Get today's date (start of day)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const backendUrl = getBackendUrl();
      
      // First, get all chat sessions for this user
      const sessionsResponse = await fetch(`${backendUrl}/api/chat-sessions?user_id=${encodeURIComponent(userId)}`);
      
      if (!sessionsResponse.ok) {
        throw new Error(`Failed to fetch chat sessions: ${sessionsResponse.status}`);
      }
      
      const sessionsData = await sessionsResponse.json();
      let todayCount = 0;
      
      if (sessionsData && sessionsData.chat_sessions && Array.isArray(sessionsData.chat_sessions)) {
        // For each session, fetch messages
        const sessionPromises = sessionsData.chat_sessions.map(async (session: any) => {
          const messagesResponse = await fetch(`${backendUrl}/api/chat-sessions/${session.id}/messages`);
          
          if (messagesResponse.ok) {
            const messagesData = await messagesResponse.json();
            
            if (messagesData && messagesData.messages && Array.isArray(messagesData.messages)) {
              // Count user messages from today
              const userMessagesToday = messagesData.messages.filter((message: any) => {
                // Check if message is from today and is from the user
                const messageDate = new Date(message.created_at);
                return message.role === 'user' && messageDate >= today;
              });
              
              return userMessagesToday.length;
            }
          }
          
          return 0;
        });
        
        // Wait for all promises to resolve and sum up the counts
        const sessionCounts = await Promise.all(sessionPromises);
        todayCount = sessionCounts.reduce((sum, count) => sum + count, 0);
      }
      
      console.log(`[MSD] Today's message count: ${todayCount}, Limit: ${MESSAGE_LIMIT}, Has subscription: ${hasSubscription}`);
      setTodayMessageCount(todayCount);
    } catch (error) {
      console.error('[MSD] Error fetching today\'s message count:', error);
      setTodayMessageCount(0);
    } finally {
      setIsLoadingMessageCount(false);
    }
  }, [userId, hasSubscription]);

  // Expose the fetchTodayMessageCount function through the ref
  useImperativeHandle(ref, () => ({
    refreshMessageCount: fetchTodayMessageCount
  }), [fetchTodayMessageCount]);
  
  // Fetch the message count when the component mounts and when userId changes
  useEffect(() => {
    if (userId) {
      fetchTodayMessageCount();
      
      // Set up an interval to refresh the message count every 2 minutes
      const intervalId = setInterval(fetchTodayMessageCount, 120000);
      
      // Clean up the interval when the component unmounts
      return () => clearInterval(intervalId);
    }
  }, [userId, fetchTodayMessageCount]);
  
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

  // Helper function to get display name for agents
  const getDisplayAgentName = React.useCallback((agentName: string) => {
    // Always display "General Assistant" instead of "Triage Agent"
    if (agentName === "Triage Agent") {
      return "General Assistant";
    }
    return agentName;
  }, []);

  // Helper function to get agent description - memoize
  const getAgentDescription = React.useCallback((agentName: string) => {
    switch(agentName) {
      case "Triage Agent":
      case "General Assistant":
        return "The most suitable and effective model for general questions and answers based on uploaded files";
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
    const displayName = getDisplayAgentName(agent.name);
    
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
            className={`flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0 ${getAgentCircleColor(displayName)} ${getIconTextColor(displayName)}`}
          >
            {getAgentIcon(displayName)}
          </div>
          <div className="flex flex-col flex-grow min-w-0 overflow-hidden">
            <div className="flex items-center justify-between w-full">
              <span className="text-sm font-medium text-foreground">
                {displayName}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-transparent"
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
  }, [userId, searchParams, getAgentCircleColor, getIconTextColor, getAgentIcon, getDisplayAgentName]);

  // New function to fetch notes for the current session
  const fetchNotes = useCallback(async () => {
    if (!userId || !currentConversationId) return;
    
    setIsLoadingNotes(true);
    
    try {
      console.log(`[Notes] Fetching notes for session ${currentConversationId}`);
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/notes?session_id=${encodeURIComponent(currentConversationId)}&user_id=${encodeURIComponent(userId)}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch notes: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('[Notes Debug] Response:', data);
      
      if (data && data.notes && data.notes.length > 0 && data.notes[0].content) {
        console.log(`[Notes] Successfully loaded notes for session ${currentConversationId}`);
        setNoteContent(data.notes[0].content);
        setLastSavedNoteContent(data.notes[0].content);
      } else if (data && data.content) {
        // Handle the original expected format as a fallback
        console.log(`[Notes] Successfully loaded notes for session ${currentConversationId} (legacy format)`);
        setNoteContent(data.content);
        setLastSavedNoteContent(data.content);
      } else {
        // If no notes exist for this session, set empty content
        setNoteContent('');
        setLastSavedNoteContent('');
      }
    } catch (error) {
      console.error('[Notes] Error fetching notes:', error);
      
      // Load from localStorage as fallback
      if (typeof window !== 'undefined') {
        const savedNotes = localStorage.getItem(`notes_${currentConversationId}`);
        if (savedNotes) {
          console.log(`[Notes] Loaded notes from localStorage for session ${currentConversationId}`);
          setNoteContent(savedNotes);
          setLastSavedNoteContent(savedNotes);
        } else {
          setNoteContent('');
          setLastSavedNoteContent('');
        }
      }
    } finally {
      setIsLoadingNotes(false);
    }
  }, [userId, currentConversationId]);

  // New function to save notes to backend
  const saveNotes = useCallback(async (content: string) => {
    if (!userId || !currentConversationId) return;
    
    // Don't save if content hasn't changed
    if (content === lastSavedNoteContent) {
      return;
    }
    
    setIsSavingNotes(true);
    
    try {
      console.log(`[Notes] Saving notes for session ${currentConversationId}`);
      const backendUrl = getBackendUrl();
      
      const response = await fetch(`${backendUrl}/api/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          session_id: currentConversationId,
          content: content
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to save notes: ${response.status}`);
      }
      
      const data = await response.json();
      
      console.log(`[Notes] Successfully saved notes for session ${currentConversationId}`);
      setLastSavedNoteContent(content);
      
      // Log the response for debugging
      console.log('[Notes Debug] Save response:', data);
      
      // Also save to localStorage as backup
      if (typeof window !== 'undefined') {
        localStorage.setItem(`notes_${currentConversationId}`, content);
      }
    } catch (error) {
      console.error('[Notes] Error saving notes:', error);
      
      // Save to localStorage as fallback
      if (typeof window !== 'undefined') {
        localStorage.setItem(`notes_${currentConversationId}`, content);
      }
    } finally {
      setIsSavingNotes(false);
    }
  }, [userId, currentConversationId, lastSavedNoteContent]);

  // Effect to handle autosaving notes with debounce
  useEffect(() => {
    if (!noteContent || !currentConversationId) return;
    
    const timer = setTimeout(() => {
      saveNotes(noteContent);
    }, NOTES_AUTOSAVE_DELAY);
    
    return () => clearTimeout(timer);
  }, [noteContent, currentConversationId, saveNotes]);
  
  // Effect to fetch notes when conversation ID changes
  useEffect(() => {
    if (currentConversationId) {
      fetchNotes();
    }
  }, [currentConversationId, fetchNotes]);
  
  // Effect to fetch notes on component initialization
  useEffect(() => {
    if (userId && currentConversationId) {
      fetchNotes();
    }
  }, [userId, fetchNotes]);
  
  // Check if notes have changed before unloading
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (noteContent !== lastSavedNoteContent) {
        // Save notes synchronously before unload
        if (typeof window !== 'undefined') {
          localStorage.setItem(`notes_${currentConversationId}`, noteContent);
        }
        
        // Show confirmation dialog
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [noteContent, lastSavedNoteContent, currentConversationId]);

  // Handle note content updates
  const handleNoteUpdate = useCallback((html: string) => {
    setNoteContent(html);
  }, []);

  // Update the activeTab setter to also call the onTabChange prop
  const handleTabChange = (tab: 'agents' | 'notes') => {
    setActiveTab(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  return (
    <div className={`${isMobile ? 'w-full' : activeTab === 'notes' ? 'w-96 border-r' : 'w-64 border-r'} bg-white h-full flex flex-col transition-all duration-300 ease-in-out`}>
      <div 
        className={`sticky top-0 z-10 flex justify-between items-center h-[60px] px-4 ${isMobile ? 'hidden' : ''} bg-white`}
        style={{ 
          borderBottom: '1px solid var(--light)',
          alignSelf: 'stretch',
          minHeight: '60px'
        }}
      >
        <div className="flex w-full gap-4">
          <button 
            onClick={() => handleTabChange('agents')} 
            style={{
              color: activeTab === 'agents' ? 'var(--Monochrome-Black, #232323)' : 'var(--Monochrome-Deep, #6C6C6C)',
              textAlign: 'center',
              fontSize: '20px',
              fontStyle: 'normal',
              fontWeight: 500,
              lineHeight: '28px'
            }}
          >
            Agents
          </button>
          <button 
            onClick={() => handleTabChange('notes')} 
            style={{
              color: activeTab === 'notes' ? 'var(--Monochrome-Black, #232323)' : 'var(--Monochrome-Deep, #6C6C6C)',
              textAlign: 'center',
              fontSize: '20px',
              fontStyle: 'normal',
              fontWeight: 500,
              lineHeight: '28px'
            }}
          >
            Notes
          </button>
        </div>
        
        {/* Add save indicator for notes */}
        {activeTab === 'notes' && (
          <div className="flex items-center">
            {isLoadingNotes && (
              <span className="text-xs text-gray-500 mr-2">Loading...</span>
            )}
            {isSavingNotes && (
              <span className="text-xs text-gray-500 mr-2">Saving...</span>
            )}
            {!isLoadingNotes && !isSavingNotes && noteContent !== lastSavedNoteContent && (
              <span className="text-xs text-amber-500 mr-2">Unsaved</span>
            )}
          </div>
        )}
      </div>
      
      {activeTab === 'agents' ? (
        <div className={`${isMobile ? 'p-2' : 'p-3 sm:p-4'} pt-4 sm:pt-6 overflow-y-auto`}>
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
                        {defaultAgents.slice(0, 3).map((agent, index) => {
                          const displayName = getDisplayAgentName(agent.name);
                          return (
                            <div 
                              key={agent.id || index}
                              className={`w-8 h-8 rounded-full flex items-center justify-center ${getAgentCircleColor(displayName)} ${getIconTextColor(displayName)}`}
                              onClick={(e) => e.stopPropagation()}
                              style={{ width: '32px', height: '32px' }}
                            >
                              {getAgentIcon(displayName)}
                            </div>
                          );
                        })}
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
                      {defaultAgents.map((agent, index) => {
                        const displayName = getDisplayAgentName(agent.name);
                        return (
                          <div 
                            key={agent.id || `agent-${index}`}
                            className="p-4 border-t border-slate-100"
                          >
                            <div className="flex items-center gap-3 mb-2">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getAgentCircleColor(displayName)} ${getIconTextColor(displayName)}`}
                                style={{ width: '32px', height: '32px' }}
                              >
                                {getAgentIcon(displayName)}
                              </div>
                              <div className="text-base font-semibold">{displayName}</div>
                            </div>
                            <p className="text-sm text-slate-600">{getAgentDescription(displayName)}</p>
                          </div>
                        );
                      })}
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
              
              {/* Message Statistics Card - only show for non-subscribers or when debug mode is active */}
              {(debugOverrideSubscription === false || (!hasSubscription && !isCheckingSubscription)) && (
                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden p-4">
                  <div className="flex flex-col">
                    {debugOverrideSubscription === false && (
                      <div className="px-2 py-1 mb-2 bg-yellow-100 text-yellow-800 text-xs rounded-md">
                        Debug mode: Simulating unsubscribed user
                      </div>
                    )}
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-slate-900" style={{ fontSize: '15px' }}>Today limit</h3>
                      <span className="text-sm text-slate-600">
                        {isLoadingMessageCount ? 
                          <span className="inline-block w-6 h-4 bg-slate-200 animate-pulse rounded"></span> 
                          : 
                          `${todayMessageCount}/${MESSAGE_LIMIT}`
                        }
                      </span>
                    </div>
                    
                    {/* Progress bar */}
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-3">
                      {isLoadingMessageCount ? (
                        <div className="h-full w-full bg-slate-200 animate-pulse rounded-full"></div>
                      ) : (
                        <div 
                          className={`h-full rounded-full ${todayMessageCount >= MESSAGE_LIMIT ? 'bg-red-500' : 'bg-slate-700'}`}
                          style={{ 
                            width: `${Math.min(100, (todayMessageCount / MESSAGE_LIMIT) * 100)}%`, 
                            transition: 'width 0.5s ease-in-out'
                          }}
                        ></div>
                      )}
                    </div>
                    
                    {/* Get unlimited button - only show for non-subscribers */}
                    <button
                      onClick={handleGetUnlimited}
                      className="w-full py-3 text-center text-sm font-semibold rounded-md transition-colors"
                      style={{
                        backgroundColor: "#FED770"
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = "#FEE093";
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = "#FED770";
                      }}
                    >
                      Get unlimited
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="overflow-y-auto h-full flex flex-col">
          {isLoadingNotes ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin h-5 w-5 sm:h-6 sm:w-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
          ) : (
            <TiptapEditor 
              content={noteContent} 
              onUpdate={handleNoteUpdate} 
            />
          )}
        </div>
      )}
      
      {/* Notification display */}
      {notification && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg">
          {notification}
        </div>
      )}
    </div>
  );
}));

export { AgentsSidebar }; 
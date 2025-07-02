'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  FiSend, FiRefreshCw, FiCopy, FiInfo, FiX, FiArrowRight, 
  FiPaperclip, FiFile, FiUpload, FiToggleLeft, FiToggleRight, FiUsers, FiTool,
  FiSearch, FiMaximize2, FiExternalLink, FiClock, FiEdit2, FiTrash2, FiMoreVertical,
  FiMessageSquare, FiFolder, FiUser
} from 'react-icons/fi';
import { RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { experimental_useObject as useObject } from '@ai-sdk/react';
import { ResponseSchema } from '@/app/api/scenarios/generate/schema';

// Import our components
import { Message } from '@/components/chat/Message';
import { ChatInput } from '@/components/chat/ChatInput';
import { ChatMessages } from '@/components/chat/ChatMessages';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { ChatContent } from '@/components/chat/ChatContent';
import { FileSidebar } from '@/components/chat/FileSidebar';
import { AgentsSidebar, AgentsSidebarRef } from '@/components/chat/AgentsSidebar';
import { AnalysisModal } from '@/components/chat/AnalysisModal';
import { ChatHistoryDropdown } from '@/components/chat/ChatHistoryDropdown';
import { MobileTabBar } from '@/components/chat/MobileTabBar';
import { ChatLayout } from '@/components/chat/ChatLayout';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { FileDetailModal } from '@/components/chat/FileDetailModal';
import ResearchLoadingIndicator from '@/components/chat/ResearchLoadingIndicator';
import { ScenarioCommandsInput } from '@/components/chat/ScenarioCommandsInput';
import { FlashCard } from '@/components/chat/FlashCards';
import { WebResearchItem } from '@/components/chat/WebResearch';
import { ScenarioDisplay } from '@/components/chat/ScenarioDisplay';
import { CVContent } from '@/components/chat/CVViewer';
import { RevealSlide } from '@/components/chat/ImpressPresentation';
import { NoteParagraph } from '@/components/editors/ParagraphEditor';

// Import our hooks
import { useChatStream } from '@/hooks/useChatStream';
import { useFiles } from '@/hooks/useFiles';
import { useHistory } from '@/hooks/useHistory';
import { useAnalysis } from '@/hooks/useAnalysis';
import { useAgents } from '@/hooks/useAgents';
import { useScenarioContext } from '@/contexts/ScenarioContext';
import { useFileContext } from '@/contexts/FileContext';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { useAutoAddLinks } from '@/hooks/useAutoAddLinks';

// Import our types
import type { 
  Message as BaseMessage,
  MessageRole,
  UploadedFile,
  AgentOrTool,
  AnalysisModalState,
  ChatSession,
  DatabaseMessage as DBMessage,
  HandleHistorySelectFn
} from '@/types/chat';
import type { ScenarioData, ScenarioStep } from '@/types/scenarios';

// Import our services
import { ScenarioProgressService } from '@/services/scenarioProgressService';
import { getFileMetadataFromLocalStorage, saveFileMetadataToLocalStorage, clearAllFileMetadataFromStorage } from '@/utils/fileStorage';
import { handleChatAccess } from '@/utils/chatAccess';

// Add new type for file citations
type FileCitation = {
  file_id: string;
  index: number;
  type: 'file_citation';
  filename: string;
  raw_content: string;
};

// Update Message type to include citations and annotations
type Message = BaseMessage & {
  id?: string;
  agentName?: string;
  hasFile?: boolean;
  fileId?: string;
  fileName?: string;
  toolAction?: 'call' | 'output' | 'annotations';
  toolName?: string;
  citations?: FileCitation[];
  sessionId?: string;
  annotations?: {
    content: string;
    toolName?: string;
    toolAction?: string;
  };
  metadata?: any;
  toolCall?: any; // Add toolCall field
  toolInvocations?: any[]; // Add toolInvocations field for AI SDK
  parts?: any[]; // Add parts field for sources
  reasoning?: string; // Add reasoning field
};

// Updating or adding the DatabaseMessage type
interface ExtendedDBMessage {
  role: string;
  content: string;
  created_at: string;
  timestamp?: string;
  id: string;
  session_id: string;
  chat_session_id?: string;
  agent_name?: string;
  metadata?: string | Record<string, any>;
  tool_action?: string;
}

// Update the ChatSession type to include message count
type ExtendedChatSession = ChatSession & {
  message_count?: number;
};

export default function Home({ 
  vectorStoreInfoFromUrl = null,
  onInitializationComplete
}: {
  vectorStoreInfoFromUrl?: {
    id: string;
    fileCount?: number;
    type?: string;
  } | null;
  onInitializationComplete?: () => void;
}) {
  // console.log('[Home] Component mounted/re-rendered'); // Commented out to reduce log spam
  // Get user_id from URL
  const [userId, setUserId] = useState<string | null>(null);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);

  // Add state to store agent and message from URL
  const [agentFromUrl, setAgentFromUrl] = useState<string | null>(null);
  const [messageFromUrl, setMessageFromUrl] = useState<string | null>(null);

  // Add chat/research mode state - moved before chat hook
  const [mode, setMode] = useState<'chat' | 'research'>('chat');

  // Initialize scenario progress service
  const scenarioProgressService = new ScenarioProgressService();
  
  // Scenario state management
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [triggeredActions, setTriggeredActions] = useState<Record<string, boolean>>({});
  const [isNextStepLoading, setIsNextStepLoading] = useState(false);
  const [isTypeYourOwnLoading, setIsTypeYourOwnLoading] = useState(false);
  const [isClosingScenario, setIsClosingScenario] = useState(false);
  const [isLoadingProgress, setIsLoadingProgress] = useState(false);
  const isLoadingProgressRef = useRef(false); // Add ref for immediate loading state tracking
  const hasLoadedProgressRef = useRef<string | null>(null); // Track which conversation we've loaded progress for

  // Add state to track loaded scenario progress for the dropdown
  const [loadedScenarioProgress, setLoadedScenarioProgress] = useState<{
    scenario: ScenarioData;
    currentStep: number;
    completedSteps: number[];
    triggeredActions: Record<string, boolean>;
  } | null>(null);

  // Use our new chat streaming hook
  const chat = useChatStream({
    userId,
    conversationId: currentConversationId,
    initialMessages: [],
    mode,
    onError: (error) => {
      console.error('Chat error:', error);
      console.error('Chat error details:', {
        errorMessage: error.message,
        errorStack: error.stack,
        errorName: error.name,
        userId,
        conversationId: currentConversationId,
        mode,
        timestamp: new Date().toISOString()
      });
    },
    onFinish: (message) => {
      // Message completed - this is where we can add any post-completion logic
      // console.log('Message streaming completed:', message.id);
    },
    onConversationIdChange: (newConversationId) => {
      // Update the parent component's conversation ID when a new session is created
      console.log('🆕 Session created, updating conversation ID:', newConversationId);
      console.log('🔄 Previous conversation ID:', currentConversationId);
      setCurrentConversationId(newConversationId);
      console.log('✅ Conversation ID updated to:', newConversationId);
    },
  });

  // Convert AI SDK messages to our Message type
  const chatMessages: Message[] = useMemo(() => {
    return chat.messages.map((msg: any) => ({
      id: msg.id,
      role: msg.role as MessageRole,
      content: msg.content,
      timestamp: msg.createdAt || new Date(),
      // Use the agent from the map if available, otherwise check message metadata
      agentName: chat.messageAgentMap?.[msg.id] || msg.agentName || msg.metadata?.agentName || msg.metadata?.agent_name,
      // Include tool invocations if present
      toolInvocations: msg.toolInvocations,
      // Include any tool call data that was loaded from the database
      toolCall: msg.toolCall,
      toolAction: msg.toolAction,
      // Include other metadata
      metadata: msg.metadata,
      // Include parts for sources
      parts: msg.parts,
      // Include reasoning if present
      reasoning: msg.reasoning
    }));
  }, [chat.messages, chat.messageAgentMap]); // Add messageAgentMap to dependencies

  // Add toast hook
  const { addToast } = useToast();
  
  // Create toast function for useFiles
  const showToast = useCallback((type: 'success' | 'error' | 'warning' | 'info', message: string, title?: string) => {
    addToast({ type, message, title });
  }, [addToast]);

  const files = useFiles(userId, currentConversationId, showToast);
  const history = useHistory(userId);
  const analysis = useAnalysis();
  const agents = useAgents(userId);
  
  // Get the FileContext for file selection
  const { selectedFile: contextSelectedFile, setSelectedFile: setContextSelectedFile } = useFileContext();
  
  // Get scenario data from context - ensure we get the scenarioIdFromUrl too
  const { selectedScenario, scenarioIdFromUrl, scenarios, isLoading: isLoadingScenarios, setSelectedScenario } = useScenarioContext();
  
  // Add a metadata cache to avoid refetching the same metadata
  const [fileMetadataCache, setFileMetadataCache] = useState<Record<string, any>>({});
  
  // Create a ref for the AgentsSidebar component
  const agentsSidebarRef = useRef<AgentsSidebarRef>(null);
  
  // State for showing file info
  const [showFileInfo, setShowFileInfo] = useState(false);
  
  // State for showing agents sidebar
  const [showAgentsSidebar, setShowAgentsSidebar] = useState(false);
  
  // State for showing left sidebar (FileSidebar)
  const [showLeftSidebar, setShowLeftSidebar] = useState(false);
  
  // State for expanded sidebars (full-width mode)
  const [isLeftSidebarExpanded, setIsLeftSidebarExpanded] = useState(false);
  const [isRightSidebarExpanded, setIsRightSidebarExpanded] = useState(false);
  
  // Vector store info combining from URL and from fetched data
  const [vectorStoreInfo, setVectorStoreInfo] = useState<{ id: string; fileCount?: number; type?: string; } | null>(vectorStoreInfoFromUrl);

  // New loading states for different operations
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(false);

  // Add seenAgents state
  const [seenAgents, setSeenAgents] = useState<Set<string>>(new Set(['Triage Agent']));
  
  // Mobile responsiveness
  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'files' | 'assets'>('chat');
  
  // Add state to track active sidebar tab
  const [agentsSidebarTab, setAgentsSidebarTab] = useState<'agents' | 'notes' | 'scenarios' | 'flashcards' | 'webresearch' | 'presentations' | 'cv' | null>(null);

  // Add a state to track if a scenario is expanded in the sidebar
  const [expandedScenario, setExpandedScenario] = useState<string | null>(null);

  // Add a state to track if the user has manually switched the sidebar tab
  const [hasUserSwitchedSidebarTab, setHasUserSwitchedSidebarTab] = useState(false);

  // Add initializationDone state
  const [initializationDone, setInitializationDone] = useState(false);

  // Add autoTriggeredScenarioAction state
  const [autoTriggeredScenarioAction, setAutoTriggeredScenarioAction] = useState<string | null>(null);

  // Add state to track if we've triggered agent/message from URL
  const [autoTriggeredAgentMessage, setAutoTriggeredAgentMessage] = useState<string | null>(null);

  // Add isMobile state
  const [isMobileView, setIsMobileView] = useState(false);

  // Add flashcards state
  const [flashCards, setFlashCards] = useState<FlashCard[]>([]);
  
  // Add agent presentation slides state
  const [agentSlides, setAgentSlides] = useState<RevealSlide[]>([]);

  // Add web research state
  const [webResearchItems, setWebResearchItems] = useState<WebResearchItem[]>([]);

  // Legacy presentations state removed (now using agentSlides only)

  // Add CV state
  const [cvContent, setCvContent] = useState<CVContent | null>(null);

  // Track processed tool invocations to prevent duplicates
  const [processedToolInvocations, setProcessedToolInvocations] = useState<Set<string>>(new Set());
  
  // Track processed writeText invocations specifically to prevent duplicate paragraphs
  const [processedWriteTextIds, setProcessedWriteTextIds] = useState<Set<string>>(new Set());
  
  // Add state for tracking today's message count  
  const [todayMessageCount, setTodayMessageCount] = useState<number>(0);

  // Auto add sources toggle state - moved from FileSidebar to Home so it works regardless of sidebar visibility
  const [autoAddSources, setAutoAddSources] = useState(() => {
    // Load from localStorage on initialization
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('autoAddSources');
      return saved ? JSON.parse(saved) : true;
    }
    return true;
  });

  // Save auto add sources preference to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('autoAddSources', JSON.stringify(autoAddSources));
    }
  }, [autoAddSources]);

  // Use the auto-add links hook - moved from FileSidebar to Home so it works regardless of sidebar visibility
  useAutoAddLinks({
    autoAddSources,
    defaultVectorStoreId: files.defaultVectorStoreId,
    onLinkSubmit: async (url: string) => {
      await files.handleLinkSubmit(url);
    },
    uploadedFiles: files.uploadedFiles,
    fileUploads: [], // FileSidebar manages its own fileUploads state, but we pass empty array here since we just need the core functionality
    setFileUploads: () => {}, // No-op since we don't manage fileUploads at this level
    onRefreshFiles: files.handleRefreshFiles
  });

  // Function to refresh today's message count
  const refreshTodayMessageCount = useCallback(async () => {
    if (!userId) return;
    
    try {
      const response = await fetch(`/api/chat-sessions/today-message-count?user_id=${encodeURIComponent(userId)}`);
      
      if (response.ok) {
        const data = await response.json();
        setTodayMessageCount(data.count);
      }
    } catch (error) {
      console.error('[Home] Error fetching today\'s message count:', error);
    }
  }, [userId]);

  // Fetch message count when userId changes
  useEffect(() => {
    if (userId) {
      refreshTodayMessageCount();
    }
  }, [userId, refreshTodayMessageCount]);

  // Clear CV content and other tool-generated content on page refresh/component mount
  useEffect(() => {
    // Clear all tool-generated content when the component mounts (page refresh)
    setCvContent(null);
    setFlashCards([]);
    setWebResearchItems([]);
    setAgentSlides([]);
    setProcessedToolInvocations(new Set());
    setProcessedWriteTextIds(new Set());
    
    // Cleanup function to clear file metadata when component unmounts
    return () => {
      // Clear file metadata from localStorage on unmount (browser tab close, navigation, etc)
      clearAllFileMetadataFromStorage();
      console.log('[Component Unmount] Cleared all file metadata from localStorage');
    };
  }, []); // Empty dependency array means this runs once on mount

  // Add state for saving scenario
  const [isSavingScenario, setIsSavingScenario] = useState(false);

  // Add state for CreateScenarioModal
  const [showCreateScenarioModal, setShowCreateScenarioModal] = useState(false);
  
  // Add state for scenario generation mode
  const [isInScenarioGenerationMode, setIsInScenarioGenerationMode] = useState(false);

  // Add notes state and functions (moved from AgentsSidebar) - now paragraph-based
  const [noteParagraphs, setNoteParagraphs] = useState<NoteParagraph[]>([]);
  const [isSavingNotes, setIsSavingNotes] = useState<boolean>(false);
  const [isLoadingNotes, setIsLoadingNotes] = useState<boolean>(false);
  const [lastSavedNoteParagraphs, setLastSavedNoteParagraphs] = useState<NoteParagraph[]>([]);
  
  // Constants for notes
  const NOTES_AUTOSAVE_DELAY = 2000; // Autosave delay in milliseconds

  // Helper function to convert content to paragraphs
  const convertContentToParagraphs = useCallback((content: string): NoteParagraph[] => {
    if (!content || content.trim() === '') {
      return [];
    }

    // Check if content is already in paragraph format (from writeText tool)
    // If it contains our specific separator, it means it's already been saved as paragraphs
    if (content.includes('<!-- PARAGRAPH_SEPARATOR -->')) {
      const paragraphTexts = content
        .split('<!-- PARAGRAPH_SEPARATOR -->')
        .map(text => text.trim())
        .filter(text => text.length > 0);
      
      return paragraphTexts.map((text, index) => ({
        id: (index + 1).toString(),
        content: text,
        createdAt: new Date(),
        updatedAt: new Date()
      }));
    }

    // For new content from writeText tool, treat it as a single paragraph
    // This preserves the full HTML structure including any file references
    return [{
      id: '1',
      content: content,
      createdAt: new Date(),
      updatedAt: new Date()
    }];
  }, []);

  // Helper function to convert paragraphs to content string
  const convertParagraphsToContent = useCallback((paragraphs: NoteParagraph[]): string => {
    return paragraphs
      .filter(p => p.content && p.content.trim() !== '' && p.content !== '<p></p>')
      .map(p => p.content)
      .join('<!-- PARAGRAPH_SEPARATOR -->');
  }, []);

  // Notes functions (moved from AgentsSidebar) - now paragraph-based
  const fetchNotes = useCallback(async () => {
    if (!userId || !currentConversationId) return;
    
    setIsLoadingNotes(true);
    
    try {
      console.log(`[Notes] Fetching notes for session ${currentConversationId}`);
      // Try to fetch from API first
      const response = await fetch(`/api/notes?user_id=${userId}&session_id=${currentConversationId}`, {
        method: 'GET',
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('[Notes] API response:', data);
        
        // Handle different response formats from the API
        let content = '';
        if (data.notes && data.notes.length > 0 && data.notes[0].content) {
          content = data.notes[0].content;
        } else if (data.content) {
          content = data.content;
        }
        
        if (content) {
          const paragraphs = convertContentToParagraphs(content);
          setNoteParagraphs(paragraphs);
          setLastSavedNoteParagraphs(paragraphs);
          console.log(`[Notes] Successfully loaded ${paragraphs.length} paragraphs for session ${currentConversationId}`);
        } else {
          // No content found, set empty state
          setNoteParagraphs([]);
          setLastSavedNoteParagraphs([]);
          console.log(`[Notes] No content found for session ${currentConversationId}`);
        }
      } else {
        console.log(`[Notes] API failed with status ${response.status}, trying localStorage`);
        // If API fails, try localStorage
        if (typeof window !== 'undefined') {
          const savedContent = localStorage.getItem(`notes_${currentConversationId}`);
          if (savedContent) {
            const paragraphs = convertContentToParagraphs(savedContent);
            setNoteParagraphs(paragraphs);
            setLastSavedNoteParagraphs(paragraphs);
            console.log(`[Notes] Loaded from localStorage for session ${currentConversationId}`);
          } else {
            setNoteParagraphs([]);
            setLastSavedNoteParagraphs([]);
          }
        }
      }
    } catch (error) {
      console.error('[Notes] Error fetching notes:', error);
      
      // Fallback to localStorage
      if (typeof window !== 'undefined') {
        const savedContent = localStorage.getItem(`notes_${currentConversationId}`);
        if (savedContent) {
          const paragraphs = convertContentToParagraphs(savedContent);
          setNoteParagraphs(paragraphs);
          setLastSavedNoteParagraphs(paragraphs);
          console.log(`[Notes] Loaded from localStorage fallback for session ${currentConversationId}`);
        } else {
          setNoteParagraphs([]);
          setLastSavedNoteParagraphs([]);
        }
      }
    } finally {
      setIsLoadingNotes(false);
    }
  }, [userId, currentConversationId, convertContentToParagraphs]);

  // Save notes to backend (now paragraph-based)
  const saveNotes = useCallback(async (paragraphs: NoteParagraph[]) => {
    if (!userId || !currentConversationId) return;
    
    // Don't save if paragraphs haven't changed
    if (JSON.stringify(paragraphs) === JSON.stringify(lastSavedNoteParagraphs)) {
      return;
    }
    
    setIsSavingNotes(true);
    
    try {
      console.log(`[Notes] Saving ${paragraphs.length} paragraphs for session ${currentConversationId}`);
      // Convert paragraphs to content string for API compatibility
      const content = convertParagraphsToContent(paragraphs);
      
      // Use relative API route
      const response = await fetch(`/api/notes`, {
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
      setLastSavedNoteParagraphs(paragraphs);
      console.log(`[Notes] Successfully saved notes for session ${currentConversationId}`);
      
      // Also save to localStorage as backup
      if (typeof window !== 'undefined') {
        localStorage.setItem(`notes_${currentConversationId}`, content);
      }
    } catch (error) {
      console.error('[Notes] Error saving notes:', error);
      
      // Save to localStorage as fallback
      if (typeof window !== 'undefined') {
        const content = convertParagraphsToContent(paragraphs);
        localStorage.setItem(`notes_${currentConversationId}`, content);
      }
    } finally {
      setIsSavingNotes(false);
    }
  }, [userId, currentConversationId, lastSavedNoteParagraphs, convertParagraphsToContent]);

  // Handle paragraph updates
  const handleParagraphUpdate = useCallback((paragraphNumber: number, paragraph: NoteParagraph) => {
    setNoteParagraphs(prev => {
      const newParagraphs = [...prev];
      newParagraphs[paragraphNumber - 1] = paragraph;
      return newParagraphs;
    });
  }, []);

  // Handle paragraph deletion
  const handleParagraphDelete = useCallback((paragraphNumber: number) => {
    setNoteParagraphs(prev => {
      return prev.filter((_, index) => index !== paragraphNumber - 1);
    });
  }, []);

  // Handle adding new paragraph
  const handleParagraphAdd = useCallback(() => {
    setNoteParagraphs(prev => [
      ...prev,
      {
        id: (prev.length + 1).toString(),
        content: '',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  }, []);

  // Scenario generation state and hook
  const { 
    object: scenarioObject,
    submit: submitScenario,
    isLoading: isGeneratingScenario,
    error: scenarioError,
    stop: stopScenarioGeneration,
  } = useObject({
    api: '/api/scenarios/generate',
    schema: ResponseSchema, 
    onFinish: ({ object, error }) => {
      if (error) {
        addToast({
          type: 'error',
          title: 'Scenario Generation Failed',
          message: error.message
        });
      }
      // Don't automatically select the scenario - let user click "Run Scenario"
      // The scenario will stay in generation mode showing the generated content
    },
    onError: (err) => {
      addToast({
        type: 'error',
        title: 'API Error',
        message: err.message
      });
    }
  });

  // Update width logic - remove scenario selection impact on sidebar width
  const rightSidebarWide = useMemo(() => {
    if (hasUserSwitchedSidebarTab) {
      // User explicitly switched tabs
      return (agentsSidebarTab === 'notes' || agentsSidebarTab === 'scenarios' || agentsSidebarTab === 'flashcards' || agentsSidebarTab === 'webresearch' || agentsSidebarTab === 'presentations' || agentsSidebarTab === 'cv' || agentsSidebarTab === null);
    }
    
    // Default case - only based on tab, not scenario selection
    return (agentsSidebarTab === 'notes' || agentsSidebarTab === 'scenarios' || agentsSidebarTab === 'flashcards' || agentsSidebarTab === 'webresearch' || agentsSidebarTab === 'presentations' || agentsSidebarTab === 'cv' || agentsSidebarTab === null);
  }, [hasUserSwitchedSidebarTab, agentsSidebarTab]);

  // Add extra wide sidebar for notes and flashcards
  const rightSidebarExtraWide = useMemo(() => {
    return agentsSidebarTab === 'notes' || agentsSidebarTab === 'flashcards' || agentsSidebarTab === 'webresearch' || agentsSidebarTab === 'presentations' || agentsSidebarTab === 'cv';
  }, [agentsSidebarTab]);

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

  // Get user_id and conversation_id from URL when component mounts
  useEffect(() => {
    console.log('[URL Debug] Full URL:', window.location.href);
    console.log('[URL Debug] Search string:', window.location.search);
    
    // First try standard URL parsing
    const searchParams = new URLSearchParams(window.location.search);
    console.log('[URL Debug] Standard params:', Array.from(searchParams.entries()));
    
    let userIdParam = searchParams.get('user_id');
    let conversationIdParam = searchParams.get('conversation_id');
    let agentParam = searchParams.get('agent');
    let messageParam = searchParams.get('message');
    
    // If agent or message not found, try to extract from malformed URL
    if (!agentParam || !messageParam) {
      const urlString = window.location.href;
      
      // Look for agent parameter in various formats
      const agentMatch = urlString.match(/[&?](?:%2F%3F)?agent=([^&]+)/i);
      if (agentMatch && !agentParam) {
        agentParam = decodeURIComponent(agentMatch[1].replace(/\+/g, ' '));
        console.log('[URL Debug] Found agent in malformed URL:', agentParam);
      }
      
      // Look for message parameter in various formats
      const messageMatch = urlString.match(/[&?](?:%2F%3F)?message=([^&]+)/i);
      if (messageMatch && !messageParam) {
        messageParam = decodeURIComponent(messageMatch[1].replace(/\+/g, ' '));
        console.log('[URL Debug] Found message in malformed URL:', messageParam);
      }
    }
    
    console.log('[URL Debug] Final parsed params:', {
      user_id: userIdParam,
      conversation_id: conversationIdParam,
      agent: agentParam,
      message: messageParam
    });
    
    if (userIdParam) {
      console.log(`[Home] Setting userId from URL: ${userIdParam}`);
      setUserId(userIdParam);
    } else {
      console.error('Error: User ID is required. Please add ?user_id=YOUR_USER_ID to the URL.');
    }
    
    if (conversationIdParam) {
      setCurrentConversationId(conversationIdParam);
      // Don't load conversation here - wait for userId to be set
    }
    
    // Store agent and message from URL
    if (agentParam) {
      console.log('[URL Debug] Setting agent from URL:', agentParam);
      setAgentFromUrl(agentParam); // Already decoded
      
      // If we have an agent but no message, create a default message
      if (!messageParam) {
        const defaultMessage = `I'd like to work with the ${agentParam}`;
        console.log('[URL Debug] No message provided, using default:', defaultMessage);
        setMessageFromUrl(defaultMessage);
      }
    }
    
    if (messageParam) {
      console.log('[URL Debug] Setting message from URL:', messageParam);
      setMessageFromUrl(messageParam); // Already decoded
    }
  }, []);

  // Debug effect to track component lifecycle
  useEffect(() => {
    console.log('[Home] Component mounted');
    return () => {
      console.log('[Home] Component unmounted');
    };
  }, []);

  // Fix the vectorStoreInfo effect that's causing circular updates
  useEffect(() => {
    const storeId = files.defaultVectorStoreId;
    if (storeId && typeof storeId === 'string') {
      // Only update if the ID has changed
      setVectorStoreInfo(prevInfo => {
        if (prevInfo?.id !== storeId) {
          return {
            id: storeId,
            fileCount: prevInfo?.fileCount,
            type: prevInfo?.type || 'Vector Store'
          };
        }
        return prevInfo;
      });
    } else {
      // Only clear if there's something to clear
      setVectorStoreInfo(prevInfo => prevInfo !== null ? null : prevInfo);
    }
  }, [files.defaultVectorStoreId]); // Only depend on the ID, not the entire vectorStoreInfo

  // Add effect to fetch files when vector store ID changes
  useEffect(() => {
    if (files.defaultVectorStoreId) {
      fetchFilesByVectorStoreId(files.defaultVectorStoreId);
    } else {
      // Clear files if no vector store ID
      files.setUploadedFiles([]);
    }
  }, [files.defaultVectorStoreId]);
  
  // Load conversation when both userId and conversationId are available
  useEffect(() => {
    if (userId && currentConversationId) {
      loadConversationById(currentConversationId);
    }
  }, [userId, currentConversationId]);

  // Fetch chat history when userId changes
  useEffect(() => {
    if (userId) {
      history.fetchChatHistory().then(sessions => {
        // If no conversation is currently loaded and we have sessions available, load the most recent one
        const urlParams = new URLSearchParams(window.location.search);
        const conversationIdParam = urlParams.get('conversation_id');
        const hasAgentOrMessage = urlParams.get('agent') || urlParams.get('message');
        
        if (!conversationIdParam && !currentConversationId && sessions.length > 0 && !hasAgentOrMessage) {
          // Only auto-load the most recent session if there are no agent/message parameters
          setCurrentConversationId(sessions[0].id);
          
          // Update URL with the conversation_id without refreshing the page
          const url = new URL(window.location.href);
          url.searchParams.set('conversation_id', sessions[0].id);
          // Preserve agent and message parameters if they exist
          const currentParams = new URLSearchParams(window.location.search);
          const agentParam = currentParams.get('agent');
          const messageParam = currentParams.get('message');
          if (agentParam) url.searchParams.set('agent', agentParam);
          if (messageParam) url.searchParams.set('message', messageParam);
          window.history.pushState({}, '', url.toString());
          
          // Call initialization complete callback
          if (onInitializationComplete) {
            onInitializationComplete();
          }
        } else if (!conversationIdParam && !currentConversationId) {
          // If there are no existing conversations OR we have agent/message params
          // Just mark as initialized to show the no-message state or trigger the message
          setInitializationDone(true);
          if (onInitializationComplete) {
            onInitializationComplete();
          }
        } else if (conversationIdParam) {
          // If URL already has conversation_id, we're already initialized
          if (onInitializationComplete) {
            onInitializationComplete();
          }
        }
      });
    }
  }, [userId]);

  // Notes effects (moved from AgentsSidebar) - now paragraph-based
  // Effect to handle autosaving notes with debounce
  useEffect(() => {
    if (!noteParagraphs.length || !currentConversationId) return;
    
    const timer = setTimeout(() => {
      saveNotes(noteParagraphs);
    }, NOTES_AUTOSAVE_DELAY);
    
    return () => clearTimeout(timer);
  }, [noteParagraphs, currentConversationId, saveNotes]);
  
  // Effect to fetch notes when conversation ID changes
  useEffect(() => {
    if (currentConversationId) {
      console.log(`[Notes] Conversation ID changed to: ${currentConversationId}`);
      // Clear existing paragraphs immediately when switching conversations
      setNoteParagraphs([]);
      setLastSavedNoteParagraphs([]);
      console.log(`[Notes] Cleared paragraphs for new conversation: ${currentConversationId}`);
      // Then fetch notes for the new conversation
      fetchNotes();
    } else {
      console.log('[Notes] No conversation ID, clearing paragraphs');
      setNoteParagraphs([]);
      setLastSavedNoteParagraphs([]);
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
      if (JSON.stringify(noteParagraphs) !== JSON.stringify(lastSavedNoteParagraphs)) {
        // Save notes synchronously before unload
        if (typeof window !== 'undefined') {
          const content = convertParagraphsToContent(noteParagraphs);
          localStorage.setItem(`notes_${currentConversationId}`, content);
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
  }, [noteParagraphs, lastSavedNoteParagraphs, currentConversationId, convertParagraphsToContent]);

  // Callback for when chat initialization is complete
  const handleInitializationComplete = useCallback(() => {
    setInitializationDone(true);
    if (onInitializationComplete) {
      onInitializationComplete();
    }
  }, [onInitializationComplete]);

  // Function to initialize a new conversation (calls API route)
  const initializeConversation = async (userId: string) => {
    setIsCreatingSession(true);

    try {
      // Clear file metadata from localStorage when creating a new conversation
      clearAllFileMetadataFromStorage();
      console.log('[Initialize Conversation] Cleared all file metadata from localStorage');
      
      const res = await fetch('/api/create-chat-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create session');

      const newSession = data.session;
      const vectorStore = data.vectorStore;
      setCurrentConversationId(newSession.id);
      files.setDefaultVectorStoreId(vectorStore.id);

      // Update the URL
      const urlObj = new URL(window.location.href);
      urlObj.searchParams.set('conversation_id', newSession.id);
      // Preserve agent and message parameters if they exist
      const currentParams = new URLSearchParams(window.location.search);
      const agentParam = currentParams.get('agent');
      const messageParam = currentParams.get('message');
      if (agentParam) urlObj.searchParams.set('agent', agentParam);
      if (messageParam) urlObj.searchParams.set('message', messageParam);
      window.history.pushState({}, '', urlObj.toString());

      // Reset messages
      chat.setMessages([]);
      chat.setShowWelcome(true);

      return newSession.id;
    } catch (error) {
      console.error('Error creating new session (API route):', error);
      return null;
    } finally {
      setIsCreatingSession(false);
      handleInitializationComplete();
    }
  };

  // Function to load a conversation by ID with access control - defined later after dependencies

  // Separate function to actually load the chat data (extracted from the original function)
  const loadChatSessionData = async (conversationId: string) => {
    try {
      // Call the Next.js API route directly (not through backend)
      const sessionResponse = await fetch(`/api/chat-sessions/${conversationId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (!sessionResponse.ok) {
        throw new Error(`Failed to fetch session: ${sessionResponse.status} ${sessionResponse.statusText}`);
      }
      
      // Get response as text first to debug any issues
      const responseText = await sessionResponse.text();
      
      // Try to parse as JSON
      let sessionData;
      try {
        sessionData = JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}...`);
      }
      
      if (!sessionData) {
        throw new Error('No session data received');
      }
      
      // Extract the chat session object - handle both formats (wrapped in chat_session or direct)
      const chatSession = sessionData.chat_session || sessionData;
      
      if (!chatSession) {
        throw new Error('No chat session found in response');
      }
      
      // Get vector store info if available
      const vectorStoreId = chatSession.vector_store_id;
      
      // First, get stored file info if available
      const storedFileMap = (() => {
        try {
          if (vectorStoreId) {
            const stored = localStorage.getItem(`fileMap_${vectorStoreId}`);
            if (stored) {
              return JSON.parse(stored);
            }
          }
          return {};
        } catch (e) {
          console.error("Error reading stored file map:", e);
          return {};
        }
      })();
      
      // Setup messages
      let messagesArray = chatSession.messages || [];
      if (!Array.isArray(messagesArray)) {
        console.error('Messages is not an array:', messagesArray);
        messagesArray = [];
      }
      
      // First, separate annotations from regular messages and build a map
      const annotationsMap = new Map();
      const toolMessages: { time: number; invocation: any }[] = []; // Collect all tool messages (calls & results)
      const regularMessages: ExtendedDBMessage[] = [];
      
      messagesArray.forEach((msg: ExtendedDBMessage) => {
        // Store annotation messages separately
        if (msg.role === 'tool' && msg.tool_action === 'annotations') {
          // If we find an annotations message, store it by its timestamp
          // We'll link it to the assistant message closest in time
          annotationsMap.set(new Date(msg.created_at).getTime(), {
            content: msg.content,
            toolName: typeof msg.metadata === 'object' && msg.metadata?.tool_name ? msg.metadata.tool_name : 'file_citations',
            toolAction: 'annotations'
          });
        } else if (msg.role === 'tool') {
          // Collect all non-annotation tool messages (both calls and results)
          try {
            const data = JSON.parse(msg.content);
            const invocation = {
              toolName: data.tool || data.name,
              args: data.args || {},
              result: data.result,
              state: data.result !== undefined ? 'result' : 'call'
            };
            toolMessages.push({ time: new Date(msg.created_at).getTime(), invocation });
          } catch (e) {
            console.error('Failed to parse tool message:', e);
          }
        } else {
          // Keep regular messages
          regularMessages.push(msg);
        }
      });
      
            
      
      // Map backend messages to frontend format and handle field name differences
      const convertedMessages = regularMessages
        .filter((msg: ExtendedDBMessage) => {
          // Filter out system messages that are just agent switches
          if (msg.role === 'system' && (
            msg.content.startsWith('Switching to') || 
            msg.content === 'Triage Agent' ||
            msg.content.includes('Deep Seek') ||
            (typeof msg.metadata === 'object' && msg.metadata?.event_type === 'agent_switch')
          )) {
            return false;
          }
          return true;
        })
        .map((msg: ExtendedDBMessage, index: number, array: ExtendedDBMessage[]) => {
          let displayContent = msg.content;
          // Hide metadata block for user messages
          if (msg.role === 'user' && typeof msg.content === 'string') {
            const metaStartIndex = msg.content.indexOf('__FILES_METADATA__');
            if (metaStartIndex !== -1) {
              displayContent = msg.content.substring(0, metaStartIndex).trim();
            }
          }

          const message: Message = {
            id: msg.id,
            role: msg.role as MessageRole,
            content: displayContent, // Use potentially modified content
            sessionId: msg.session_id || msg.chat_session_id, // Handle both formats
            timestamp: new Date(msg.created_at),
            agentName: msg.agent_name
          };
          
                      // Add metadata and enhance it for citations
            if (msg.metadata && typeof msg.metadata === 'object') {
              // Enhanced metadata with citation info if possible
              if (msg.metadata.has_citations && msg.metadata.citations) {
                // Make sure each citation has filename info for display
                if (Array.isArray(msg.metadata.citations)) {
                  msg.metadata.citations = msg.metadata.citations.map((citation: any) => {
                    // Try to add filename from our stored file map if missing
                    if (!citation.filename && citation.file_id && storedFileMap[citation.file_id]) {
                      return {
                        ...citation,
                        filename: storedFileMap[citation.file_id].name || 'document.pdf'
                      };
                    }
                    return citation;
                  });
                }
              }
              
              message.metadata = msg.metadata;
              
              // Add reasoning if present in metadata
              if (msg.metadata.has_reasoning && msg.metadata.reasoning_content) {
                message.reasoning = msg.metadata.reasoning_content;
              }
            }
          
                        // If this is an assistant message, find any annotations that happened right after it
              if (msg.role === 'assistant' && message.timestamp) {
                const msgTime = message.timestamp.getTime();
                
                // Find the annotation closest in time after this message
                // Typically within a few seconds
                let bestMatch: any = null;
                let smallestDiff = Infinity;
                
                annotationsMap.forEach((annotation, annotationTime) => {
                  const timeDiff = annotationTime - msgTime;
                  // Only consider annotations that came after the message, within 30 seconds
                  if (timeDiff > 0 && timeDiff < 30000 && timeDiff < smallestDiff) {
                    smallestDiff = timeDiff;
                    bestMatch = annotation;
                  }
                });
                
                if (bestMatch) {
                  message.annotations = bestMatch;
                }
                
                // Only try to match tool messages if we don't already have toolInvocations from metadata
                if (!message.toolInvocations || message.toolInvocations.length === 0) {
                  // Find tool messages related to this assistant message
                  // Tools can be executed either before (during processing) or after the assistant message
                  const toolInvocations: any[] = [];
                  
                  // Get the index of current message
                  const currentIndex = index;
                  
                  // Find previous assistant message (or use start of conversation)
                  const prevAssistantIndex = array.findIndex((m, i) => i < currentIndex && m.role === 'assistant');
                  const prevMessageTime = prevAssistantIndex > -1 ? new Date(array[prevAssistantIndex].created_at).getTime() : 0;
                  
                  // Find next assistant message (or use 10 minutes after current)
                  const nextAssistantIndex = array.findIndex((m, i) => i > currentIndex && m.role === 'assistant');
                  const nextMessageTime = nextAssistantIndex > -1 ? new Date(array[nextAssistantIndex].created_at).getTime() : msgTime + (10 * 60 * 1000);
                  
                  // Find the preceding user message if any
                  const precedingUserIndex = array.findIndex((m, i) => i < currentIndex && m.role === 'user');
                  const userMessageTime = precedingUserIndex > -1 ? new Date(array[precedingUserIndex].created_at).getTime() : prevMessageTime;
                  
                  toolMessages.forEach(({ time: toolTime, invocation }) => {
                    // Include tools that:
                    // 1. Happened between the user message and this assistant message (tools executed during processing)
                    // 2. Happened after this assistant message but before the next one
                    if ((toolTime > userMessageTime && toolTime < msgTime) || 
                        (toolTime > msgTime && toolTime < nextMessageTime)) {
                      toolInvocations.push(invocation);
                    }
                  });
                  
                  if (toolInvocations.length > 0) {
                    message.toolInvocations = toolInvocations;
                  }
                }
              }
          
          return message;
        });
      

      
      // Filter out any potential duplicate messages based on content and timestamp
      const uniqueMessages = convertedMessages.filter((message: Message, index: number, self: Message[]) =>
        index === self.findIndex((m: Message) => (
          m.content === message.content && 
          m.role === message.role && 
          m.timestamp?.getTime() === message.timestamp?.getTime()
        ))
      );
      
      // Convert to AI SDK format and build agent mapping
      const messageAgentMapping: Record<string, string> = {};
      const aiMessages = uniqueMessages.map(msg => {
        const messageId = msg.id || `msg-${Date.now()}-${Math.random()}`;
        
        // Store agent mapping for each message
        if (msg.agentName) {
          messageAgentMapping[messageId] = msg.agentName;
        }
        
        // Build the message object, including toolCall and toolInvocations when available
        const result: any = {
          id: messageId,
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content,
          createdAt: msg.timestamp,
          // Only use toolInvocations (newer format) to avoid duplication
          toolInvocations: msg.toolInvocations || undefined,
          // Don't set toolCall if we have toolInvocations to avoid duplication
          toolCall: (msg.toolInvocations && msg.toolInvocations.length > 0) ? undefined : (msg.toolCall || undefined),
          toolAction: msg.toolAction || undefined, // Keep toolAction if needed by other logic
        };
        
        return result;
      });

      // Use the helper function to complete the loading
      return completeChatSessionDataLoad(chatSession, vectorStoreId, aiMessages, messageAgentMapping);
      
    } catch (error) {
      console.error('Error loading chat session data:', error);
      setIsLoadingSession(false);
      handleInitializationComplete();
      return false;
    }
  };

  // Complete the loadChatSessionData function with the remaining logic
  const completeChatSessionDataLoad = (chatSession: any, vectorStoreId: string | null, aiMessages: any[], messageAgentMapping: Record<string, string>) => {
    chat.setMessages(aiMessages);
    
    // Set the agent mapping
    if (chat.setMessageAgentMapping) {
      chat.setMessageAgentMapping(messageAgentMapping);
    }
    
    if (vectorStoreId) {
      files.setDefaultVectorStoreId(vectorStoreId);
      setVectorStoreInfo({
        id: vectorStoreId,
        fileCount: vectorStoreInfo?.fileCount,
        type: vectorStoreInfo?.type || 'Vector Store'
      });
      
      // Ensure we have files data for the citations
      fetchFilesByVectorStoreId(vectorStoreId);
    } else {
      files.setDefaultVectorStoreId(null);
      files.setUploadedFiles([]);
    }
      
    // Update the URL
    const urlObj = new URL(window.location.href);
    urlObj.searchParams.set('conversation_id', chatSession.id);
    // Preserve agent and message parameters if they exist
    const currentParams = new URLSearchParams(window.location.search);
    const agentParam = currentParams.get('agent');
    const messageParam = currentParams.get('message');
    if (agentParam) urlObj.searchParams.set('agent', agentParam);
    if (messageParam) urlObj.searchParams.set('message', messageParam);
    window.history.pushState({}, '', urlObj.toString());
    
    // Set the conversation title
    if (chatSession.title) {
      document.title = `Chat: ${chatSession.title}`;
    }
    
    setIsLoadingSession(false);
    handleInitializationComplete();
    
    return true;
  };

  // Add a helper function to get the backend URL
  const getBackendUrl = () => {
    return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5002';
  };

  // Update fetchFilesByVectorStoreId to keep metadata about citations
  const fetchFilesByVectorStoreId = async (vectorStoreId: string) => {
    if (!vectorStoreId) {
      return;
    }
    
    files.setIsRefreshing(true);
    
    try {
      const backendUrl = getBackendUrl();
      const url = `${backendUrl}/api/files?vector_store_id=${encodeURIComponent(vectorStoreId)}`;
      
      const filesResponse = await fetch(url);
      
      if (!filesResponse.ok) {
        throw new Error(`Failed to fetch files: ${filesResponse.status}`);
      }
      
      const filesData = await filesResponse.json();
      const filesList = Array.isArray(filesData) ? filesData : (filesData.files || []);
      
      // Create a map of file IDs to file details for citation lookup
      const fileMap: Record<string, any> = {};
      
      if (filesList.length > 0) {
        const filesData = filesList.map((file: any) => {
          // Store file info in map for citation lookup
          fileMap[file.id] = {
            id: file.id,
            name: file.name,
            type: file.type
          };
          
          const uploadedFile = {
            id: file.id,
            name: file.name,
            size: parseInt(String(file.size), 10),
            type: file.type,
            uploadDate: new Date(file.created_at || file.upload_date || new Date()),
            format: file.type?.split('/')[1] || file.name?.split('.').pop() || 'unknown',
            vectorStoreId: file.vectorStoreId || vectorStoreId,
            status: file.metadata?.vector_store_file_status || 'completed',
            
            doc_title: file.document?.title || null,
            doc_authors: Array.isArray(file.document?.authors) ? file.document.authors : [],
            doc_publication_year: file.document?.publication_year || null,
            doc_type: file.document?.type || null,
            doc_summary: file.document?.summary || null,
            total_pages: file.document?.total_pages || 0,
            processed_at: file.processed_at || null,
            
            metadata: {
              ...file.metadata,
              doc_title: file.document?.title,
              doc_authors: file.document?.authors,
              doc_publication_year: file.document?.publication_year,
              doc_type: file.document?.type,
              doc_summary: file.document?.summary,
              total_pages: file.document?.total_pages,
              processed_at: file.processed_at,
              vector_store_file_status: file.metadata?.vector_store_file_status || 'completed'
            }
          };
          
          return uploadedFile;
        });
        
        files.setUploadedFiles(filesData);
        
        // Store file map in localStorage for citation lookups during page refresh
        if (Object.keys(fileMap).length > 0) {
          localStorage.setItem(`fileMap_${vectorStoreId}`, JSON.stringify(fileMap));
        }
      } else {
        files.setUploadedFiles([]);
      }
    } catch (e) {
      console.error('Failed to load files', e);
      files.setUploadedFiles([]);
    } finally {
      files.setIsRefreshing(false);
    }
  };

  // Add handleRefreshFiles function
  const handleRefreshFiles = () => {
    if (files.defaultVectorStoreId) {
      fetchFilesByVectorStoreId(files.defaultVectorStoreId);
    }
  };

  // Simple handleCopy function
  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content)
      .then(() => {
        // Copied successfully
      })
      .catch(() => {
        console.error('Failed to copy to clipboard');
      });
  };

  // Update handleHistorySelect to check files for vector store ID if not found in session
  const handleHistorySelect: HandleHistorySelectFn = async (session, skipSessionFetch = false) => {
    try {
      setCurrentConversationId(session.id);
      
      // Set loading state immediately
      setIsLoadingSession(true);
      
      // Close the dropdown immediately after selection
      history.setShowHistoryDropdown(false);

      // Clear all tool-generated content when switching sessions to prevent cross-contamination
      setFlashCards([]);
      setWebResearchItems([]);
      setAgentSlides([]); // Clear presentation slides when switching sessions
      setCvContent(null); // Clear CV content when switching sessions
      setProcessedToolInvocations(new Set());
      
      // Clear file metadata from localStorage when switching sessions
      clearAllFileMetadataFromStorage();
      console.log('[Session Switch] Cleared all file metadata from localStorage');
      
      // Clear paragraph content for new session
      setNoteParagraphs([]);
      setLastSavedNoteParagraphs([]);
      console.log('[Session Switch] Cleared all content for session switch');
      
      // Reset sidebar tab state to ensure clean state
      setAgentsSidebarTab(null);
      setHasUserSwitchedSidebarTab(false);

      // First try to get vector store ID from session
      let vectorStoreId = session.vector_store_id;

      // If no vector store ID in session, check files
      if (!vectorStoreId) {
        const backendUrl = getBackendUrl();
        const filesResponse = await fetch(`${backendUrl}/api/files?chat_session_id=${encodeURIComponent(session.id)}`);
        if (filesResponse.ok) {
          const filesData = await filesResponse.json();
          const files = Array.isArray(filesData) ? filesData : (filesData.files || []);
          
          // Get vector store ID from the first file that has one
          const fileWithVectorStore = files.find((f: { vectorStoreId?: string }) => f.vectorStoreId);
          if (fileWithVectorStore) {
            vectorStoreId = fileWithVectorStore.vectorStoreId;
            
            // Update the chat session with this vector store ID
            const updateResponse = await fetch(`${backendUrl}/api/chat-sessions/${session.id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              body: JSON.stringify({
                vector_store_id: vectorStoreId
              }),
            });
          }
        }
      }

      // Set the vector store ID if available and fetch files
      if (vectorStoreId) {
        files.setDefaultVectorStoreId(vectorStoreId);
        // Explicitly fetch files here
        await files.fetchFilesByVectorStoreId(vectorStoreId);
      } else {
        files.setDefaultVectorStoreId(null);
        files.setUploadedFiles([]);
      }

      // Update URL with conversation_id without refreshing the page
      const url = new URL(window.location.href);
      url.searchParams.set('conversation_id', session.id);
      // Preserve agent and message parameters if they exist
      const currentParams = new URLSearchParams(window.location.search);
      const agentParam = currentParams.get('agent');
      const messageParam = currentParams.get('message');
      if (agentParam) url.searchParams.set('agent', agentParam);
      if (messageParam) url.searchParams.set('message', messageParam);
      window.history.pushState({}, '', url.toString());
      
      // Fetch messages for this session
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/chat-sessions/${session.id}/messages`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch messages: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.messages && Array.isArray(data.messages)) {
        // Reset messages list
        chat.setMessages([]);
        chat.setShowWelcome(false);
        
        // First, separate annotations from regular messages and build a map
        const annotationsMap = new Map();
        const toolMessages: { time: number; invocation: any }[] = []; // Collect all tool messages (calls & results)
        const regularMessages: ExtendedDBMessage[] = [];
        
        data.messages.forEach((msg: ExtendedDBMessage) => {
          // Store annotation messages separately
          if (msg.role === 'tool' && msg.tool_action === 'annotations') {
            // If we find an annotations message, store it by its timestamp
            // We'll link it to the assistant message closest in time
            annotationsMap.set(new Date(msg.created_at).getTime(), {
              content: msg.content,
              toolName: typeof msg.metadata === 'object' && msg.metadata?.tool_name ? msg.metadata.tool_name : 'file_citations',
              toolAction: 'annotations'
            });
          } else if (msg.role === 'tool') {
            // Collect all non-annotation tool messages (both calls and results)
            try {
              const data = JSON.parse(msg.content);
              const invocation = {
                toolName: data.tool || data.name,
                args: data.args || {},
                result: data.result,
                state: data.result !== undefined ? 'result' : 'call'
              };
              toolMessages.push({ time: new Date(msg.created_at).getTime(), invocation });
            } catch (e) {
              console.error('Failed to parse tool message:', e);
            }
          } else {
            // Keep regular messages
            regularMessages.push(msg);
          }
        });
        

        
        // First, get stored file info if available
        const storedFileMap = (() => {
          try {
            if (vectorStoreId) {
              const stored = localStorage.getItem(`fileMap_${vectorStoreId}`);
              if (stored) {
                return JSON.parse(stored);
              }
            }
            return {};
          } catch (e) {
            console.error("Error reading stored file map:", e);
            return {};
          }
        })();
        
        // Convert database messages to our Message format
        const convertedMessages = regularMessages
          .filter((msg: ExtendedDBMessage) => {
            // Filter out system messages that are just agent switches
            if (msg.role === 'system' && (
              msg.content.startsWith('Switching to') || 
              msg.content === 'Triage Agent' ||
              msg.content.includes('Deep Seek') ||
              (typeof msg.metadata === 'object' && msg.metadata?.event_type === 'agent_switch')
            )) {
              return false;
            }
            return true;
          })
          .map((msg: ExtendedDBMessage, index: number, array: ExtendedDBMessage[]) => {
            let displayContent = msg.content;
            // Hide metadata block for user messages
            if (msg.role === 'user' && typeof msg.content === 'string') {
              const metaStartIndex = msg.content.indexOf('__FILES_METADATA__');
              if (metaStartIndex !== -1) {
                displayContent = msg.content.substring(0, metaStartIndex).trim();
              }
            }
            
            const message: Message = {
              id: msg.id,
              role: msg.role as MessageRole,
              content: displayContent, // Use potentially modified content
              sessionId: msg.session_id || msg.chat_session_id, // Handle both formats
              timestamp: new Date(msg.created_at),
              agentName: msg.agent_name
            };
            
                          // Add metadata
              if (msg.metadata && typeof msg.metadata === 'object') {
                // Enhanced metadata with citation info if possible
                if (msg.metadata.has_citations && msg.metadata.citations) {
                  // Make sure each citation has filename info for display
                  if (Array.isArray(msg.metadata.citations)) {
                    msg.metadata.citations = msg.metadata.citations.map((citation: any) => {
                      // Try to add filename from our stored file map if missing
                      if (!citation.filename && citation.file_id && storedFileMap[citation.file_id]) {
                        return {
                          ...citation,
                          filename: storedFileMap[citation.file_id].name || 'document.pdf'
                        };
                      }
                      return citation;
                    });
                  }
                }
                
                message.metadata = msg.metadata;
                
                // Add reasoning if present in metadata
                if (msg.metadata.has_reasoning && msg.metadata.reasoning_content) {
                  message.reasoning = msg.metadata.reasoning_content;
                }
              }
            
            // If this is an assistant message, find any annotations that happened right after it
            if (msg.role === 'assistant' && message.timestamp) {
              const msgTime = message.timestamp.getTime();
              
              // Find the annotation closest in time after this message
              // Typically within a few seconds
              let bestMatch: any = null;
              let smallestDiff = Infinity;
              
              annotationsMap.forEach((annotation, annotationTime) => {
                const timeDiff = annotationTime - msgTime;
                // Only consider annotations that came after the message, within 30 seconds
                if (timeDiff > 0 && timeDiff < 30000 && timeDiff < smallestDiff) {
                  smallestDiff = timeDiff;
                  bestMatch = annotation;
                }
              });
              
              if (bestMatch) {
                message.annotations = bestMatch;
              }
              
              // Only try to match tool messages if we don't already have toolInvocations from metadata
              if (!message.toolInvocations || message.toolInvocations.length === 0) {
                // Find tool messages related to this assistant message
                // Tools can be executed either before (during processing) or after the assistant message
                const toolInvocations: any[] = [];
                
                // Get the index of current message
                const currentIndex = index;
                
                // Find previous assistant message (or use start of conversation)
                const prevAssistantIndex = array.findIndex((m, i) => i < currentIndex && m.role === 'assistant');
                const prevMessageTime = prevAssistantIndex > -1 ? new Date(array[prevAssistantIndex].created_at).getTime() : 0;
                
                // Find next assistant message (or use 10 minutes after current)
                const nextAssistantIndex = array.findIndex((m, i) => i > currentIndex && m.role === 'assistant');
                const nextMessageTime = nextAssistantIndex > -1 ? new Date(array[nextAssistantIndex].created_at).getTime() : msgTime + (10 * 60 * 1000);
                
                // Find the preceding user message if any
                const precedingUserIndex = array.findIndex((m, i) => i < currentIndex && m.role === 'user');
                const userMessageTime = precedingUserIndex > -1 ? new Date(array[precedingUserIndex].created_at).getTime() : prevMessageTime;
                
                toolMessages.forEach(({ time: toolTime, invocation }) => {
                  // Include tools that:
                  // 1. Happened between the user message and this assistant message (tools executed during processing)
                  // 2. Happened after this assistant message but before the next one
                  if ((toolTime > userMessageTime && toolTime < msgTime) || 
                      (toolTime > msgTime && toolTime < nextMessageTime)) {
                    toolInvocations.push(invocation);
                  }
                });
                
                if (toolInvocations.length > 0) {
                  message.toolInvocations = toolInvocations;
                }
              }
            }
            
            return message;
          });
        
        // Filter out any potential duplicate messages based on content and timestamp
        const uniqueMessages = convertedMessages.filter((message: Message, index: number, self: Message[]) =>
          index === self.findIndex((m: Message) => (
            m.content === message.content && 
            m.role === message.role && 
            m.timestamp?.getTime() === message.timestamp?.getTime()
          ))
        );
        
        // Convert to AI SDK format and build agent mapping
        const messageAgentMapping: Record<string, string> = {};
        const aiMessages = uniqueMessages.map(msg => {
          const messageId = msg.id || `msg-${Date.now()}-${Math.random()}`;
          
          // Store agent mapping for each message
          if (msg.agentName) {
            messageAgentMapping[messageId] = msg.agentName;
          }
          
          // Build the message object, including toolCall and toolInvocations when available
          const result: any = {
            id: messageId,
            role: msg.role as 'user' | 'assistant' | 'system',
            content: msg.content,
            createdAt: msg.timestamp,
            // Only use toolInvocations (newer format) to avoid duplication
            toolInvocations: msg.toolInvocations || undefined,
            // Don't set toolCall if we have toolInvocations to avoid duplication
            toolCall: (msg.toolInvocations && msg.toolInvocations.length > 0) ? undefined : (msg.toolCall || undefined),
            toolAction: msg.toolAction || undefined, // Keep toolAction if needed by other logic
          };
          
          return result;
        });

        chat.setMessages(aiMessages);
        
        // Set the agent mapping
        if (chat.setMessageAgentMapping) {
          chat.setMessageAgentMapping(messageAgentMapping);
        }
        
        // Set the conversation title
        document.title = `Chat: ${session.title || 'Untitled'}`;
      } else {
        throw new Error('Invalid message data format');
      }
    } catch (error) {
      console.error('Failed to load chat history', error);
    } finally {
      setIsLoadingSession(false);
    }
  };

  // Define utility functions with useCallback to maintain stability
  const handleActionSuccess = useCallback((message: string) => {
    console.log(message);
  }, []);

  const handleActionError = useCallback((message: string) => {
    console.error(message);
  }, []);

  // Function to load a conversation by ID with access control
  const loadConversationById = useCallback(async (conversationId: string) => {
    setIsLoadingSession(true);
    
    try {
      // Use the new chat access handler
      await handleChatAccess(
        conversationId,
        userId,
        // onSuccess - user can access the chat directly
        async (sessionId: string) => {
          await loadChatSessionData(sessionId);
        },
        // onFork - chat was forked, redirect to new version
        async (newSessionId: string, originalTitle: string) => {
          handleActionSuccess(`Created your own copy of "${originalTitle}"`);
          // Update URL to the new session
          const urlObj = new URL(window.location.href);
          urlObj.searchParams.set('conversation_id', newSessionId);
          window.history.pushState({}, '', urlObj.toString());
          setCurrentConversationId(newSessionId);
          await loadChatSessionData(newSessionId);
        },
        // onError
        (message: string) => {
          handleActionError(message);
          setIsLoadingSession(false);
        }
      );
    } catch (error) {
      console.error('Error in loadConversationById:', error);
      handleActionError('Failed to load conversation');
      setIsLoadingSession(false);
    }
  }, [userId, handleActionSuccess, handleActionError]);

  // Optimize handler functions with useCallback to prevent excessive re-renders
  const handleToggleAgentOrTool = useCallback(async (agent: any) => {
    const result = await agents.handleToggleAgentOrTool(agent);
    if (result.success) {
      handleActionSuccess(result.message || `${agent.name} ${!agent.enabled ? 'enabled' : 'disabled'}`);
    } else {
      handleActionError(result.message || 'Failed to toggle agent');
    }
  }, [agents, handleActionSuccess, handleActionError]);

  // Internal function that returns the result for use in effects
  const updateSessionTitle = useCallback(async (sessionId: string, title: string) => {
    return await history.handleEditSessionTitle(sessionId, title);
  }, [history]);

  // Public function for ChatHeader that handles UI feedback
  const handleEditSessionTitle = useCallback(async (sessionId: string, title: string) => {
    const result = await updateSessionTitle(sessionId, title);
    if (result.success) {
      handleActionSuccess(result.message || 'Chat title updated successfully');
    } else if (result.message) {
      handleActionError(result.message || 'Failed to update chat title');
    }
  }, [updateSessionTitle, handleActionSuccess, handleActionError]);

  const handleDeleteSession = useCallback(async (sessionId: string) => {
    const result = await history.handleDeleteSession(sessionId);
    if (result.success) {
      handleActionSuccess(result.message || 'Chat deleted successfully');
      
      // If we just deleted the current conversation, create a new one
      if (currentConversationId === result.deletedSessionId) {
        chat.reset();
      }
    } else if (result.message) {
      handleActionError(result.message || 'Failed to delete chat');
    }
  }, [history, chat, currentConversationId, handleActionSuccess, handleActionError]);

  const handleToggleVisibility = useCallback(async (sessionId: string, visibility: 'public' | 'private') => {
    console.log('[Home] handleToggleVisibility called', { sessionId, visibility });
    
    try {
      // Generate public URL if making public
      let public_url = null;
      let tool_call_types = null;
      
      if (visibility === 'public') {
        public_url = `chat-${sessionId.substring(0, 8)}-${Date.now()}`;
        
        // Extract tool types from current chat messages
        const { extractToolTypes } = await import('@/utils/extractToolTypes');
        tool_call_types = extractToolTypes(chatMessages);
        console.log('[Home] Extracted tool types:', tool_call_types);
      }
      
      console.log('[Home] Making API call to update visibility', { visibility, public_url, tool_call_types });
      
      // Call the Next.js API route directly (not through backend)
      const response = await fetch(`/api/chat-sessions/${sessionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          visibility,
          public_url,
          tool_call_types
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error:', errorData);
        throw new Error(errorData.error || 'Failed to update chat visibility');
      }

      const result = await response.json();
      console.log('[Home] Visibility update result:', result);

      // Refresh chat history to update the UI
      console.log('[Home] Refreshing chat history after visibility update');
      await history.fetchChatHistory(true);
      
      handleActionSuccess(`Chat is now ${visibility}`);
      console.log('[Home] Visibility toggle completed successfully');
    } catch (error) {
      console.error('[Home] Error toggling visibility:', error);
      handleActionError('Failed to update chat visibility');
    }
  }, [history, handleActionSuccess, handleActionError, chatMessages]);

  const handleShowAnalysis = useCallback(async (file: any) => {
    const result = await analysis.handleShowAnalysis(file, chatMessages);
    if (!result.success && result.message) {
      handleActionError(result.message || 'Failed to analyze file');
    }
  }, [analysis, chatMessages, handleActionError]);

  // Add a memoized reset handler that also properly updates history
  const handleReset = useCallback(async () => {
    if (isCreatingSession) return;
    
    setIsCreatingSession(true);
    
    try {
      // Call the chat reset handler first
      chat.reset();
      
      // Clear file metadata cache in memory
      setFileMetadataCache({});
      
      // Clear uploaded files from the files hook
      files.setUploadedFiles([]);
      
      // Clear all file metadata from localStorage (but files remain in DB)
      clearAllFileMetadataFromStorage();
      console.log('[Reset] Cleared all file metadata from localStorage');
      
      // Reset all scenario-related state
      setSelectedScenario(null);
      setCurrentStep(0);
      setCompletedSteps([]);
      setTriggeredActions({});
      setLoadedScenarioProgress(null);
      
      // Clear all tool-generated content for fresh start
      setFlashCards([]);
      setWebResearchItems([]);
      setAgentSlides([]); // Clear presentation slides for new chat
      setCvContent(null); // Clear CV content when creating new chat
      setProcessedToolInvocations(new Set());
      
      // Clear paragraph content for new session
      setNoteParagraphs([]);
      setLastSavedNoteParagraphs([]);
      console.log('[Notes] Cleared paragraph content during reset');
      
      // Reset sidebar tab state to ensure presentations tab is closed
      setAgentsSidebarTab(null);
      setHasUserSwitchedSidebarTab(false);
      console.log('[Reset] Cleared sidebar tab state and presentation slides');
      
      // Clear scenario progress from database if there's a current conversation
      if (currentConversationId) {
        try {
          // Call the scenario progress service directly since clearScenarioProgress is defined later
          const result = await scenarioProgressService.clearScenarioProgress(currentConversationId);
          if (!result.success) {
            console.error('Failed to clear scenario progress during reset:', result.error);
          }
        } catch (error) {
          console.error('Error clearing scenario progress during reset:', error);
        }
      }
      
      // Reset the AgentsSidebar (scenarios, tab, etc)
      agentsSidebarRef.current?.resetSidebar && agentsSidebarRef.current.resetSidebar();
    
      // Clear URL-related state variables to prevent re-triggering
      setAgentFromUrl(null);
      setMessageFromUrl(null);
      setAutoTriggeredAgentMessage(null);
      hasAttemptedUrlTrigger.current = false; // Reset the trigger attempt flag
      console.log('[Reset] Cleared URL state variables and reset trigger flag');
    
      // Clear current conversation ID to show no-message state
      setCurrentConversationId(null);
      
      // Clear URL parameters
      const url = new URL(window.location.href);
      url.searchParams.delete('conversation_id');
      window.history.pushState({}, '', url.toString());
      
      // Force refresh chat history 
      await history.fetchChatHistory(true);
    } finally {
      setIsCreatingSession(false);
    }
  }, [chat, userId, history, isCreatingSession, currentConversationId, setSelectedScenario, scenarioProgressService, files]);

  // Add message edit and delete handlers
  const handleMessageEdit = useCallback(async (message: Message) => {
    try {
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/chat-sessions/${currentConversationId}/messages/${message.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          content: message.content,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to edit message');
      }

      // Update the message in the local state
      chat.setMessages(messages =>
        messages.map(m => (m.id === message.id ? { ...m, content: message.content } : m))
      );

      handleActionSuccess('Message edited successfully');
    } catch (error) {
      handleActionError('Failed to edit message');
    }
  }, [currentConversationId]);

  const handleMessageDelete = useCallback(async (message: Message) => {
    try {
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/chat-sessions/${currentConversationId}/messages/${message.id}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete message');
      }

      // Remove the message from the local state
      chat.setMessages(messages => messages.filter(m => m.id !== message.id));

      handleActionSuccess('Message deleted successfully');
    } catch (error) {
      handleActionError('Failed to delete message');
    }
  }, [currentConversationId]);

  // Custom handlers for the ChatHeader component
  const handleToggleHistoryDropdown = useCallback(() => {
    if (!history.showHistoryDropdown) {
      if (userId) history.fetchChatHistory();
    }
    history.setShowHistoryDropdown(!history.showHistoryDropdown);
  }, [history, userId]);

  // Handler to toggle left sidebar
  const handleToggleLeftSidebar = useCallback(async () => {
    // Ensure a chat session exists before showing the FileSidebar so it can operate normally.
    if (!currentConversationId && userId) {
      await initializeConversation(userId);
    }

    setShowLeftSidebar(prev => !prev);
  }, [currentConversationId, userId, initializeConversation]);

  // Handlers for sidebar expansion
  const handleExpandLeftSidebar = useCallback(() => {
    setIsLeftSidebarExpanded(prev => !prev);
  }, []);

  const handleExpandRightSidebar = useCallback(() => {
    setIsRightSidebarExpanded(prev => !prev);
  }, []);

  // Set initial vector store info
  useEffect(() => {
    if (vectorStoreInfoFromUrl) {
      setVectorStoreInfo(vectorStoreInfoFromUrl);
    }
  }, [vectorStoreInfoFromUrl]);

  // Update chat title with first user message
  useEffect(() => {
    // Only proceed if we have a valid conversation ID and user ID
    if (!currentConversationId || !userId) return;
    
    // Wait for chat history to be loaded
    if (history.isLoadingHistory) return;
    
    // Look for the first user message
    const firstUserMessage = chat.messages.find(msg => msg.role === 'user');
    
    // If we found a user message, check if we need to update the title
    if (firstUserMessage && typeof firstUserMessage.content === 'string' && firstUserMessage.content.trim() !== '') {
      // Skip if it's a FILE_QUICK_ACTION message
      if (firstUserMessage.content.includes('<FILE_QUICK_ACTION>')) return;
      
      // Find the current conversation in history
      const currentConversation = history.chatHistory.find(
        session => session.id === currentConversationId
      );
      
      // Only update if the current title is "New Chat"
      if (currentConversation && currentConversation.title === 'New Chat') {
        // Get the full message content as the title
        let newTitle = firstUserMessage.content.trim();
        
        // Update the title via API
        console.log(`[Title Update] Updating title for session ${currentConversationId} from "New Chat" to "${newTitle}"`);
        updateSessionTitle(currentConversationId, newTitle).then((result) => {
          if (result.success) {
            console.log(`[Title Update] Successfully updated title: ${result.message}`);
            // Refresh chat history to ensure the UI is updated
            history.fetchChatHistory(true);
          } else {
            console.error(`[Title Update] Failed to update title: ${result.message}`);
          }
        });
      }
    }
  }, [chat.messages, currentConversationId, userId, history.chatHistory, history.isLoadingHistory, updateSessionTitle, history]);

  // Quick actions should be sent directly from FileSidebar
  const handleFileQuickAction = useCallback((fileInfo: UploadedFile, action: string, content: string) => {
    // Create a special message for display in UI
    const displayMessage = `<FILE_QUICK_ACTION>
filename: ${fileInfo.name || "document"}
file_id: ${fileInfo.id}
action: ${action}
content: HIDDEN_CONTENT
</FILE_QUICK_ACTION>`;
    
    // Create the backend-friendly message format
    const backendMessage = `Text content: ${content}, user query: ${action}. (do not use file search tool while answering)`;
    
    // Send message via the chat stream (fixed to match the hook's signature)
    chat.sendMessage(backendMessage);
    
    // Increment local message count after sending
    if (agentsSidebarRef.current?.incrementMessageCount) {
      agentsSidebarRef.current.incrementMessageCount();
    }
    
    // Refresh the message count in ChatHeader after a short delay
    setTimeout(() => {
      refreshTodayMessageCount();
    }, 1000);
  }, [chat, refreshTodayMessageCount]);

  // Handler to track sidebar tab changes
  const handleAgentsSidebarTabChange = (tab: 'agents' | 'notes' | 'scenarios' | 'flashcards' | 'webresearch' | 'presentations' | 'cv') => {
    setAgentsSidebarTab(tab);
    setHasUserSwitchedSidebarTab(true);
  };

  // Handler to reset sidebar tab to show "Start Creating" state
  const handleResetSidebarTab = useCallback(() => {
    setAgentsSidebarTab(null);
    setHasUserSwitchedSidebarTab(false);
  }, []);

  // Custom send handler for ChatInput and AgentsSidebar
  const handleInputSend = useCallback(async (message: string, displayMessage?: string, agent?: string) => {
    console.log('🔍 handleInputSend called with agent:', agent);
    
    // If no conversation exists yet, create one first (this is the first message)
    if (!currentConversationId && userId) {
      console.log('🆕 No conversation exists, creating new conversation for first message');
      const newConversationId = await initializeConversation(userId);
      if (!newConversationId) {
        console.error('❌ Failed to create conversation, cannot send message');
        return;
      }
      // Wait a moment for the conversation to be fully initialized
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // If an agent is specified, update the current agent
    if (agent && agent !== chat.currentAgent) {
      chat.setCurrentAgent(agent);
    }
    
    // The 'message' parameter is the actual content to be sent to the backend/agent.
    // The 'displayMessage' parameter is a hint for UI rendering, which is handled
    // by the Message.tsx component when it renders user messages from chat history.
    
    // For research mode, we'll still use the research backend for now
    // but send through our streaming hook
    if (mode === 'research') {
      // Always send the original 'message' (which will be enhancedPrompt for scenario actions)
      chat.sendMessage(message);
    } else {
      // Normal chat mode - pass agent information if available
      if (agent) {
        // Always send the original 'message'
        console.log('🚀 Calling chat.sendMessage with agent:', agent);
        chat.sendMessage(message, { agentName: agent });
      } else {
        // Always send the original 'message'
        chat.sendMessage(message);
      }
    }
    
    // Increment local message count after sending
    if (agentsSidebarRef.current?.incrementMessageCount) {
      agentsSidebarRef.current.incrementMessageCount();
    }
    
    // Refresh the message count in ChatHeader after a short delay
    // to ensure the backend has processed the message
    setTimeout(() => {
      refreshTodayMessageCount();
    }, 1000);
  }, [mode, chat, refreshTodayMessageCount, currentConversationId, userId]);

  // Function to save scenario progress to database
  const saveScenarioProgressInternal = useCallback(async (
    scenario: ScenarioData,
    currentStepState: number,
    completedStepsState: number[],
    triggeredActionsState: Record<string, boolean>,
    completed: boolean = false
  ) => {
    if (!currentConversationId) {
      console.warn('Cannot save scenario progress: no current conversation ID');
      return;
    }
    
    try {
      const scenarioProgress = scenarioProgressService.createScenarioProgress(
        scenario,
        currentStepState,
        completedStepsState,
        triggeredActionsState
      );
      
      const result = await scenarioProgressService.saveScenarioProgress(
        currentConversationId,
        scenarioProgress,
        completed
      );
      
      if (!result.success) {
        console.error('Failed to save debounced scenario progress:', result.error);
      }
    } catch (error) {
      console.error('Error saving debounced scenario progress:', error);
    }
  }, [currentConversationId, scenarioProgressService]);

  // Function to load scenario progress from database
  const loadScenarioProgress = useCallback(async () => {
    if (!currentConversationId) {
      return;
    }
    
    // Prevent concurrent loads
    if (isLoadingProgressRef.current) {
      return;
    }
    
    // Set loading state immediately via ref and state
    isLoadingProgressRef.current = true;
    setIsLoadingProgress(true);
    
    try {
      const result = await scenarioProgressService.loadScenarioProgress(currentConversationId);
      
      if (result.success && result.data?.scenario_progress) {
        const progress = result.data.scenario_progress;
        
        // Set the loaded progress for the dropdown
        setLoadedScenarioProgress({
          scenario: progress.scenario as ScenarioData,
          currentStep: progress.currentStep,
          completedSteps: progress.completedSteps,
          triggeredActions: progress.triggeredActions
        });
        
        // Batch all state updates together
        // Using setTimeout to ensure all updates happen in the next tick
        setTimeout(() => {
          // Check if we're still loading (component might have unmounted)
          if (isLoadingProgressRef.current) {
            setCurrentStep(() => progress.currentStep);
            setCompletedSteps(() => progress.completedSteps);
            setTriggeredActions(() => progress.triggeredActions);
            
            // Set the scenario in context if it's not already set
            if (!selectedScenario && progress.scenario) {
              setSelectedScenario(progress.scenario as ScenarioData);
            }
          }
        }, 0);
      } else {
        // No progress found, clear the loaded progress
        setLoadedScenarioProgress(null);
      }
    } catch (error) {
      console.error('Error loading scenario progress:', error);
      setLoadedScenarioProgress(null);
    } finally {
      // Clear loading state after a small delay to ensure state updates have processed
      setTimeout(() => {
        isLoadingProgressRef.current = false;
        setIsLoadingProgress(false);
      }, 100);
    }
  }, [currentConversationId, scenarioProgressService, selectedScenario, setSelectedScenario]);
  
  // Function to clear scenario progress from database
  const clearScenarioProgress = useCallback(async () => {
    if (!currentConversationId) {
      return;
    }
    
    try {
      const result = await scenarioProgressService.clearScenarioProgress(currentConversationId);
      
      if (!result.success) {
        console.error('Failed to clear scenario progress:', result.error);
      }
    } catch (error) {
      console.error('Error clearing scenario progress:', error);
    }
  }, [currentConversationId, scenarioProgressService]);

  // Add onContinueScenario handler
  const onContinueScenario = useCallback(async () => {
    // Load scenario progress from database and continue
    if (currentConversationId) {
      await loadScenarioProgress();
    }
  }, [currentConversationId, loadScenarioProgress]);

  // Get current active scenario progress for the dropdown
  const activeScenarioProgress = useMemo(() => {
    // Only return progress if there's no currently selected scenario (i.e., we're in normal chat mode)
    // and there's saved progress that could be continued
    if (!selectedScenario && loadedScenarioProgress) {
      return loadedScenarioProgress;
    }
    return null;
  }, [selectedScenario, loadedScenarioProgress]);

  // Handle scenario selection from ChatInput
  const handleScenarioSelect = useCallback((scenario: ScenarioData) => {
    // Set the selected scenario in context
    setSelectedScenario(scenario);
    
    // Reset scenario state
    setCurrentStep(0);
    setCompletedSteps([]);
    setTriggeredActions({});
    
    // Clear any loaded progress since we're starting a new scenario
    setLoadedScenarioProgress(null);
    
    // Save initial progress to database (use internal, non-debounced version for immediate save)
    if (currentConversationId) {
      saveScenarioProgressInternal(scenario, 0, [], {});
    }
  }, [setSelectedScenario, currentConversationId, saveScenarioProgressInternal]);

  // Convert scenario data to be compatible with ScenarioCommandsInput
  const convertScenarioForCommands = useCallback((scenario: ScenarioData) => {
    return {
      ...scenario,
      steps: scenario.steps.map(step => ({
        ...step,
        actions: step.actions || [] // Ensure actions is always an array
      }))
    };
  }, []);

  // Handle scenario step actions
  const handleScenarioStepAction = useCallback((prompt: string, actionIndex: number, actionType?: 'research' | 'chat', agentName?: string) => {
    // Mark this action as triggered
    const actionId = `step_${currentStep}_action_${actionIndex}`;
    setTriggeredActions(prev => ({ ...prev, [actionId]: true }));
    
    // Enhance the prompt with scenario context
    let enhancedPrompt = prompt;
    if (selectedScenario) {
      const currentStepData = selectedScenario.steps[currentStep];
      const scenarioContext = `
**SCENARIO CONTEXT:**
- Scenario: ${selectedScenario.title}
- Description: ${selectedScenario.description}
- Current Step: ${currentStep + 1}/${selectedScenario.steps.length} - ${currentStepData?.title || 'Unknown Step'}
- Step Description: ${currentStepData?.description || 'No description available'}
- Completed Steps: ${completedSteps.length}/${selectedScenario.steps.length}

Please keep this scenario context in mind when responding to help maintain continuity and relevance to the current scenario objectives. Never end by question.`;

      enhancedPrompt = `Please do the following command: "${prompt}"

${scenarioContext}`;
    }
    
    // Send the message
    if (agentName) {
      handleInputSend(enhancedPrompt, prompt, agentName); // Use original prompt as display message
    } else if (actionType === 'research') {
      setMode('research');
      handleInputSend(enhancedPrompt, prompt); // Use original prompt as display message
    } else {
      handleInputSend(enhancedPrompt, prompt); // Use original prompt as display message
    }
    
    // Mark current step as completed if not already
    if (!completedSteps.includes(currentStep)) {
      setCompletedSteps(prev => [...prev, currentStep]);
    }
  }, [currentStep, completedSteps, handleInputSend, selectedScenario, setTriggeredActions, setMode]);

  // Handle next step
  const handleNextStep = useCallback(() => {
    setIsNextStepLoading(true);
    setTimeout(() => {
      setCurrentStep(prev => prev + 1);
      setIsNextStepLoading(false);
    }, 500);
  }, []);

  // Handle go to step
  const handleGoToStep = useCallback((stepIndex: number) => {
    setCurrentStep(stepIndex);
  }, []);

  // Handle back to scenarios
  const handleBackToScenarios = useCallback(() => {
    setIsClosingScenario(true);
    setTimeout(() => {
      // Save current progress before hiding scenario UI
      if (selectedScenario && currentConversationId) {
        saveScenarioProgressInternal(selectedScenario, currentStep, completedSteps, triggeredActions);
        
        // Update the loaded progress to reflect the current state
        setLoadedScenarioProgress({
          scenario: selectedScenario,
          currentStep,
          completedSteps,
          triggeredActions
        });
      }
      
      // Clear selected scenario from context (hide scenario UI)
      setSelectedScenario(null);
      setCurrentStep(0);
      setCompletedSteps([]);
      setTriggeredActions({});
      setIsClosingScenario(false);
      
      // Also exit generation mode if active
      setIsInScenarioGenerationMode(false);
      
      // DON'T clear scenario progress from database - keep it for later continuation
      // clearScenarioProgress(); // REMOVED - this was causing progress loss
    }, 500);
  }, [setSelectedScenario, selectedScenario, currentConversationId, currentStep, completedSteps, triggeredActions, saveScenarioProgressInternal]);

  // Handle type your own
  const handleTypeYourOwn = useCallback((prefillText?: string, agentName?: string) => {
    setIsTypeYourOwnLoading(true);
    setTimeout(() => {
      // Save current progress before hiding scenario UI
      if (selectedScenario && currentConversationId) {
        saveScenarioProgressInternal(selectedScenario, currentStep, completedSteps, triggeredActions);
        
        // Update the loaded progress to reflect the current state
        setLoadedScenarioProgress({
          scenario: selectedScenario,
          currentStep,
          completedSteps,
          triggeredActions
        });
      }
      
      // Clear selected scenario to show normal chat input
      setSelectedScenario(null);
      
      // Set prefill text if provided
      if (prefillText) {
        chat.handleInputChange(prefillText);
      }
      
      // Set agent if provided
      if (agentName) {
        chat.setCurrentAgent(agentName);
      }
      
      setIsTypeYourOwnLoading(false);
      
      // DON'T clear scenario progress from database - keep it for later continuation
      // clearScenarioProgress(); // REMOVED - this was causing progress loss
    }, 500);
  }, [setSelectedScenario, selectedScenario, currentConversationId, currentStep, completedSteps, triggeredActions, saveScenarioProgressInternal, chat]);

  // Handler to save scenario
  const handleSaveScenario = useCallback(async (scenario: ScenarioData) => {
    if (!scenario) return;
    
    setIsSavingScenario(true);
    try {
      // Transform steps to ensure agent names are properly mapped
      const transformedSteps = scenario.steps.map((step: any) => ({
        ...step,
        actions: step.actions?.map((action: any) => ({
          label: action.label,
          prompt: action.prompt,
          type: action.type,
          agent_name: action.agentName || action.agent_name
        })) || []
      }));

      const response = await fetch('/api/scenarios/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: scenario.title,
          description: scenario.description,
          goal: scenario.goal || 'Complete the scenario objectives',
          metricsOfSuccess: scenario.metricsOfSuccess || 'Successfully complete all steps',
          outcome: scenario.outcome || 'Achieve the desired result',
          category: scenario.category || 'General',
          steps: transformedSteps,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        
        // Update the scenario ID to the saved one
        const updatedScenario = { ...scenario, id: result.id };
        if (selectedScenario && selectedScenario.id === scenario.id) {
          setSelectedScenario(updatedScenario);
        }
        
        // After saving successfully, automatically share
        try {
          const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
          const baseUrl = isLocal ? `${window.location.protocol}//${window.location.host}` : 'https://mystylus.ai';
          const path = isLocal ? '' : '/chat-agents';
          const shareUrl = `${baseUrl}${path}/?scenario=${result.id}`;
          
          await navigator.clipboard.writeText(shareUrl);
          addToast({
            type: 'success',
            title: 'Success!',
            message: 'Scenario saved and link copied to clipboard!'
          });
        } catch (shareError) {
          // Fallback for browsers that don't support clipboard API
          const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
          const baseUrl = isLocal ? `${window.location.protocol}//${window.location.host}` : 'https://mystylus.ai';
          const path = isLocal ? '' : '/chat-agents';
          const shareUrl = `${baseUrl}${path}/?scenario=${result.id}`;
          
          const tempInput = document.createElement('input');
          tempInput.value = shareUrl;
          document.body.appendChild(tempInput);
          tempInput.select();
          document.execCommand('copy');
          document.body.removeChild(tempInput);
          
          addToast({
            type: 'success',
            title: 'Success!',
            message: 'Scenario saved and link copied to clipboard!'
          });
        }
      } else {
        const error = await response.json();
        addToast({
          type: 'error',
          title: 'Save Failed',
          message: `Failed to save scenario: ${error.error}`
        });
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Error',
        message: `Error saving scenario: ${error}`
      });
    } finally {
      setIsSavingScenario(false);
    }
  }, [selectedScenario, setSelectedScenario, addToast]);

  // Handler to share scenario
  const handleShareScenario = useCallback(async (scenario: ScenarioData) => {
    if (!scenario || !scenario.id) return;
    
    setIsSavingScenario(true); // Use the same loading state for consistency
    try {
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const baseUrl = isLocal ? `${window.location.protocol}//${window.location.host}` : 'https://mystylus.ai';
      const path = isLocal ? '' : '/chat-agents';
      const shareUrl = `${baseUrl}${path}/?scenario=${scenario.id}`;
      
      await navigator.clipboard.writeText(shareUrl);
      addToast({
        type: 'success',
        title: 'Shared!',
        message: 'Scenario link copied to clipboard!'
      });
    } catch (error) {
      // Fallback for browsers that don't support clipboard API
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const baseUrl = isLocal ? `${window.location.protocol}//${window.location.host}` : 'https://mystylus.ai';
      const path = isLocal ? '' : '/chat-agents';
      const shareUrl = `${baseUrl}${path}/?scenario=${scenario.id}`;
      
      const tempInput = document.createElement('input');
      tempInput.value = shareUrl;
      document.body.appendChild(tempInput);
      tempInput.select();
      document.execCommand('copy');
      document.body.removeChild(tempInput);
      
      addToast({
        type: 'success',
        title: 'Shared!',
        message: 'Scenario link copied to clipboard!'
      });
    } finally {
      setIsSavingScenario(false);
    }
  }, [addToast]);

  // Handler to create scenario from modal
  const handleCreateScenarioFromModal = useCallback((scenariosJson: string) => {
    try {
      const parsedScenarios = JSON.parse(scenariosJson);
      
      if (parsedScenarios && Array.isArray(parsedScenarios) && parsedScenarios.length > 0) {
        let processedScenario;
        
        if (parsedScenarios.length === 1) {
          const scenario = parsedScenarios[0];
          
          if (scenario.steps && Array.isArray(scenario.steps) && scenario.steps.length > 0) {
            processedScenario = {
              ...scenario,
              id: scenario.id || `temp-${Date.now()}`
            };
          } else if (scenario.actions && Array.isArray(scenario.actions) && scenario.actions.length > 0) {
            processedScenario = {
              ...scenario,
              id: scenario.id || `temp-${Date.now()}`,
              steps: [{
                title: scenario.title || "Step 1",
                description: scenario.description || "",
                actions: scenario.actions
              }]
            };
          } else {
            processedScenario = {
              ...scenario,
              id: scenario.id || `temp-${Date.now()}`,
              steps: []
            };
          }
        }
        
        if (processedScenario) {
          handleScenarioSelect(processedScenario);
          setShowCreateScenarioModal(false);
        }
      }
    } catch (error) {
      console.error('Error processing created scenario:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to process created scenario'
      });
    }
  }, [handleScenarioSelect, addToast]);

  // Handler for scenario generation from chat input
  const handleScenarioGenerate = useCallback((prompt: string) => {
    setIsInScenarioGenerationMode(true);
    submitScenario({ prompt });
  }, [submitScenario]);

  // Handler for running the generated scenario
  const handleRunGeneratedScenario = useCallback(() => {
    if (scenarioObject && scenarioObject.scenarios && scenarioObject.scenarios.length > 0) {
      const generatedScenario = scenarioObject.scenarios[0];
      if (generatedScenario) {
        const steps = (generatedScenario.steps || []).filter((step): step is ScenarioStep => 
          step !== undefined && 
          typeof step === 'object' && 
          'title' in step && 
          'description' in step
        ).map(step => ({
          title: step.title || '',
          description: step.description || '',
          actions: step.actions || []
        }));

        handleScenarioSelect({
          title: generatedScenario.title || 'Untitled Scenario',
          description: generatedScenario.description || '',
          goal: generatedScenario.goal,
          metricsOfSuccess: generatedScenario.metricsOfSuccess,
          outcome: generatedScenario.outcome,
          steps: steps,
          id: `temp-${Date.now()}`,
          color: 'purple'
        });
        
        // Exit generation mode
        setIsInScenarioGenerationMode(false);
        
        // Clear the scenario object after running
        stopScenarioGeneration();
      }
    }
  }, [scenarioObject, handleScenarioSelect, stopScenarioGeneration]);

  // Handler for starting scenario generation again
  const handleStartScenarioAgain = useCallback(() => {
    stopScenarioGeneration();
    setIsInScenarioGenerationMode(false);
  }, [stopScenarioGeneration]);

  // Effect to automatically trigger the first action of a scenario from URL
  useEffect(() => {
    if (
      initializationDone &&                   // Chat session is ready
      scenarioIdFromUrl &&                    // A scenario was specified in the URL
      selectedScenario &&                     // The scenario data has been loaded
      String(selectedScenario.id) === String(scenarioIdFromUrl) && // It's the correct scenario
      !isLoadingScenarios &&                  // Scenarios are not still loading from DB
      autoTriggeredScenarioAction !== `${selectedScenario.id}-${currentConversationId}` && // Not already triggered for this scenario & session
      selectedScenario.steps && selectedScenario.steps.length > 0 && // Scenario has steps
      selectedScenario.steps[0].actions && selectedScenario.steps[0].actions.length > 0 // First step has actions
    ) {
      const firstAction = selectedScenario.steps[0].actions[0];
      if (firstAction) {
        // Construct a user-friendly display message for the chat
        const displayMessage = `Let's start with the "${selectedScenario.title}" scenario. 
First step: "${selectedScenario.steps[0].title}". 
Action: "${firstAction.label}"`;

        // Send the message
        chat.sendMessage(displayMessage);
        
        // Increment local message count for the auto-triggered message
        if (agentsSidebarRef.current?.incrementMessageCount) {
          agentsSidebarRef.current.incrementMessageCount();
        }
        
        // Refresh the message count in ChatHeader after a short delay
        setTimeout(() => {
          refreshTodayMessageCount();
        }, 1000);
        
        // TODO: Implement auto-trigger functionality when AgentsSidebar supports it
        // agentsSidebarRef.current.triggerScenarioStepAction(String(selectedScenario.id), 0, 0);
        
        // Mark as triggered for this specific scenario and session ID combination
        setAutoTriggeredScenarioAction(`${selectedScenario.id}-${currentConversationId}`);
      }
    }
  }, [
    initializationDone,
    scenarioIdFromUrl,
    selectedScenario,
    isLoadingScenarios,
    autoTriggeredScenarioAction,
    currentConversationId, // Need this for the trigger tracking key
    agentsSidebarRef,
    chat, // For setMessages, setIsProcessing etc.
    refreshTodayMessageCount
  ]);

  // Use a ref to track if we've attempted to trigger from URL
  const hasAttemptedUrlTrigger = useRef(false);
  
  // Effect to automatically trigger agent/message from URL
  useEffect(() => {
    // Create a unique trigger key based on the actual message and agent
    const triggerKey = `${messageFromUrl}-${agentFromUrl}`;
    
    // Only log debug info if we have URL parameters to avoid spam
    if (messageFromUrl || agentFromUrl) {
      console.log('[Auto-trigger Debug]', {
        initializationDone,
        messageFromUrl,
        agentFromUrl,
        scenarioIdFromUrl,
        currentConversationId,
        autoTriggeredAgentMessage,
        triggerKey,
        hasAttemptedUrlTrigger: hasAttemptedUrlTrigger.current,
        userId
      });
    }
    
    if (
      messageFromUrl &&                       // A message was specified in the URL
      !scenarioIdFromUrl &&                   // No scenario is being triggered (scenarios take precedence)
      autoTriggeredAgentMessage !== triggerKey && // Not already triggered with this exact message/agent combo
      !hasAttemptedUrlTrigger.current &&      // Haven't attempted to trigger yet
      userId &&                               // User ID is available
      initializationDone                      // Wait for initialization to complete
    ) {
      console.log('[Auto-trigger] Conditions met for triggering');
      console.log('[Auto-trigger] Trigger key:', triggerKey);
      
      // Mark as attempted and triggered immediately to prevent double triggers
      hasAttemptedUrlTrigger.current = true;
      setAutoTriggeredAgentMessage(triggerKey);
      
      // Set the agent if specified
      if (agentFromUrl) {
        chat.setCurrentAgent(agentFromUrl);
      }
      
      // Send the message
      console.log('[Auto-trigger] Sending message once');
      handleInputSend(messageFromUrl, undefined, agentFromUrl || undefined);
      
      // Clear the URL parameters after triggering to avoid re-triggering on navigation
      // Add a delay to ensure the message is sent first
      setTimeout(() => {
        const url = new URL(window.location.href);
        url.searchParams.delete('agent');
        url.searchParams.delete('message');
        // Also remove any malformed parameters
        const cleanUrl = new URL(window.location.origin + window.location.pathname);
        cleanUrl.searchParams.set('user_id', userId);
        window.history.replaceState({}, '', cleanUrl.toString());
        console.log('[Auto-trigger] URL cleaned');
      }, 1000);
    }
  }, [
    initializationDone,
    messageFromUrl,
    agentFromUrl,
    scenarioIdFromUrl,
    autoTriggeredAgentMessage,
    userId
  ]);

  // Add isMobile view effect
  useEffect(() => {
    const checkIfMobile = () => setIsMobileView(typeof window !== 'undefined' && window.innerWidth < 768);
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  // Function to check for scenario progress without loading it into the UI
  const checkScenarioProgress = useCallback(async () => {
    if (!currentConversationId) {
      setLoadedScenarioProgress(null);
      return;
    }
    
    try {
      const result = await scenarioProgressService.loadScenarioProgress(currentConversationId);
      
      if (result.success && result.data?.scenario_progress) {
        const progress = result.data.scenario_progress;
        
        // Set the loaded progress for the dropdown (but don't load into UI)
        setLoadedScenarioProgress({
          scenario: progress.scenario as ScenarioData,
          currentStep: progress.currentStep,
          completedSteps: progress.completedSteps,
          triggeredActions: progress.triggeredActions
        });
      } else {
        // No progress found, clear the loaded progress
        setLoadedScenarioProgress(null);
      }
    } catch (error) {
      console.error('Error checking scenario progress:', error);
      setLoadedScenarioProgress(null);
    }
  }, [currentConversationId, scenarioProgressService]);

  // Load scenario progress when conversation changes
  useEffect(() => {
    if (currentConversationId && initializationDone && hasLoadedProgressRef.current !== currentConversationId) {
      hasLoadedProgressRef.current = currentConversationId;
      
      // Check for progress to show continue button
      checkScenarioProgress();
      
      // Only load progress into UI if there's no selected scenario
      if (!selectedScenario) {
        loadScenarioProgress();
      }
    }
  }, [currentConversationId, initializationDone, loadScenarioProgress, checkScenarioProgress, selectedScenario]);
  
  // Load presentation slides when conversation changes
  useEffect(() => {
    const loadPresentationSlides = async () => {
      if (!currentConversationId || !userId || !initializationDone) {
        return;
      }

      try {
        console.log('[Presentations] Loading slides for session:', currentConversationId);
        
        const backendUrl = getBackendUrl();
        const response = await fetch(`${backendUrl}/api/presentations/save-slide-image?sessionId=${encodeURIComponent(currentConversationId)}&userId=${encodeURIComponent(userId)}`);
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.slideImages && Array.isArray(data.slideImages)) {
            // Convert slide images to RevealSlide format
            const slides: RevealSlide[] = data.slideImages.map((slideImage: any, index: number) => ({
              id: slideImage.slide_id || `slide-${index}`,
              title: slideImage.title || `Slide ${index + 1}`,
              content: slideImage.image_data ? `<img src="data:${slideImage.image_mime_type || 'image/jpeg'};base64,${slideImage.image_data}" alt="${slideImage.title || `Slide ${index + 1}`}" style="max-width: 100%; height: auto;" />` : '<p>No content</p>',
              backgroundColor: slideImage.background_color || '#2c3e50',
              transition: slideImage.transition || 'slide',
              createdAt: new Date(slideImage.created_at),
              updatedAt: new Date(slideImage.updated_at)
            }));
            
            // Sort slides by slide number
            slides.sort((a, b) => {
              const aNum = parseInt(a.id.replace('slide-', '')) || 0;
              const bNum = parseInt(b.id.replace('slide-', '')) || 0;
              return aNum - bNum;
            });
            
            console.log('[Presentations] Loaded', slides.length, 'slides for session');
            setAgentSlides(slides);
          } else {
            console.log('[Presentations] No slides found for session');
            // agentSlides is already cleared in handleHistorySelect, so no need to clear again
          }
        } else {
          console.log('[Presentations] Failed to load slides:', response.status);
        }
      } catch (error) {
        console.error('[Presentations] Error loading slides:', error);
      }
    };

    loadPresentationSlides();
  }, [currentConversationId, userId, initializationDone]);
  
  // Create debounced save function at the top level
  const debouncedSaveScenarioProgress = useDebouncedCallback(
    saveScenarioProgressInternal,
    1000
  );

  // Save scenario progress whenever scenario state changes
  useEffect(() => {
    // Check both state and ref for loading status
    if (selectedScenario && currentConversationId && initializationDone && !isLoadingProgress && !isLoadingProgressRef.current) {
      debouncedSaveScenarioProgress(selectedScenario, currentStep, completedSteps, triggeredActions);
    }
  }, [selectedScenario, currentStep, completedSteps, triggeredActions, currentConversationId, initializationDone, isLoadingProgress]);

  // Add handler for when Write Text tool completes
  const handleWriteTextComplete = useCallback((content: string, invocationId?: string) => {
    // Don't process tool invocations while database data is still loading
    if (isLoadingNotes) {
      console.log('[handleWriteTextComplete] Skipping while database is loading');
      return;
    }
    
    // If we have an invocation ID, check if we've already processed it
    if (invocationId && processedWriteTextIds.has(invocationId)) {
      console.log('[handleWriteTextComplete] Already processed invocation:', invocationId);
      return;
    }
    
    // Check if this content already exists in paragraphs to avoid duplicates
    setNoteParagraphs(prev => {
      // Check if a paragraph with this exact content already exists
      const contentExists = prev.some(p => p.content === content);
      
      if (contentExists) {
        console.log('[handleWriteTextComplete] Content already exists, skipping duplicate');
        return prev; // Don't add duplicate
      }
      
      const newParagraph: NoteParagraph = {
        id: (prev.length + 1).toString(),
        content: content,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const newParagraphs = [...prev, newParagraph];
      
      // Mark this invocation as processed if we have an ID
      if (invocationId) {
        setProcessedWriteTextIds(prevIds => new Set([...prevIds, invocationId]));
      }
      
      return newParagraphs;
    });
    
    // Automatically open the sidebar and switch to notes tab if not already open
    if (!showAgentsSidebar) {
      setShowAgentsSidebar(true);
    }
    // Switch to notes tab
    handleAgentsSidebarTabChange('notes');
  }, [showAgentsSidebar, handleAgentsSidebarTabChange, processedWriteTextIds, isLoadingNotes]);

  // Flashcard handlers
  const handleCreateFlashCard = useCallback((card: Omit<FlashCard, 'id'>) => {
    // Don't process tool invocations while initialization is not complete
    if (!initializationDone) {
      console.log('[handleCreateFlashCard] Skipping while initialization is not complete');
      return;
    }
    
    const newCard: FlashCard = {
      ...card,
      id: Date.now().toString(),
      lastReviewed: undefined,
    };
    setFlashCards(prev => [...prev, newCard]);
    
    // Automatically open the sidebar if not already open
    if (!showAgentsSidebar) {
      setShowAgentsSidebar(true);
    }
    // Switch to flashcards tab to show the new card
    handleAgentsSidebarTabChange('flashcards');
  }, [handleAgentsSidebarTabChange, showAgentsSidebar, initializationDone]);

  const handleEditFlashCard = useCallback((cardId: string, updates: Partial<FlashCard>) => {
    // Don't process tool invocations while initialization is not complete
    if (!initializationDone) {
      console.log('[handleEditFlashCard] Skipping while initialization is not complete');
      return;
    }
    
    setFlashCards(prev => prev.map(card => 
      card.id === cardId ? { ...card, ...updates } : card
    ));
  }, [initializationDone]);

  const handleDeleteFlashCard = useCallback((cardId: string) => {
    // Don't process tool invocations while initialization is not complete
    if (!initializationDone) {
      console.log('[handleDeleteFlashCard] Skipping while initialization is not complete');
      return;
    }
    
    setFlashCards(prev => prev.filter(card => card.id !== cardId));
  }, [initializationDone]);

  const handleReviewFlashCard = useCallback((cardId: string, correct: boolean) => {
    setFlashCards(prev => prev.map(card => {
      if (card.id === cardId) {
        return {
          ...card,
          reviewCount: card.reviewCount + 1,
          correctCount: correct ? card.correctCount + 1 : card.correctCount,
          lastReviewed: new Date()
        };
      }
      return card;
    }));
  }, []);

  // Web Research handlers
  const handleAddWebResearchUrl = useCallback(async (url: string) => {
    try {
      // Create a basic web research item first
      const tempItem: WebResearchItem = {
        id: Date.now().toString(),
        url: url,
        title: 'Loading...',
        addedAt: new Date(),
        domain: new URL(url).hostname.replace('www.', '')
      };
      
      setWebResearchItems(prev => [...prev, tempItem]);
      
      // Fetch metadata and screenshot
      try {
        const response = await fetch('/api/proxy/serper-scrape', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url }),
        });
        
        if (response.ok) {
          const data = await response.json();
          
          // Update the item with fetched data
          setWebResearchItems(prev => prev.map(item => 
            item.id === tempItem.id ? {
              ...item,
              title: data.title || new URL(url).hostname.replace('www.', ''),
              description: data.description || data.snippet,
              screenshot: data.screenshot,
              favicon: data.favicon,
              metadata: {
                author: data.author,
                publishedDate: data.publishedDate,
                readTime: data.readTime
              }
            } : item
          ));
        } else {
          // If scraping fails, just update with basic info
          setWebResearchItems(prev => prev.map(item => 
            item.id === tempItem.id ? {
              ...item,
              title: new URL(url).hostname.replace('www.', '')
            } : item
          ));
        }
      } catch (scrapeError) {
        console.error('Error scraping URL:', scrapeError);
        // Update with basic info if scraping fails
        setWebResearchItems(prev => prev.map(item => 
          item.id === tempItem.id ? {
            ...item,
            title: new URL(url).hostname.replace('www.', '')
          } : item
        ));
      }
      
      addToast({
        type: 'success',
        title: 'URL Added',
        message: 'Web page has been added to your research collection'
      });
    } catch (error) {
      console.error('Error adding web research URL:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to add URL to research collection'
      });
    }
  }, [addToast]);

  const handleDeleteWebResearchItem = useCallback((itemId: string) => {
    setWebResearchItems(prev => prev.filter(item => item.id !== itemId));
  }, []);

  // Legacy presentations handlers removed (now using agent-based RevealPresentation only)

  // Handler for agent slide updates
  const handleAgentSlideUpdate = useCallback((slideNumber: number, slide: RevealSlide) => {
    // Don't process tool invocations while initialization is not complete
    if (!initializationDone) {
      console.log('[handleAgentSlideUpdate] Skipping while initialization is not complete');
      return;
    }
    
    setAgentSlides(prev => {
      // Check if slide with this ID already exists
      const existingIndex = prev.findIndex(s => s.id === slide.id);
      
      if (existingIndex >= 0) {
        // Update existing slide with new data from tool invocation
        console.log(`[handleAgentSlideUpdate] Updating existing slide with ID ${slide.id}`);
        const updatedSlides = [...prev];
        updatedSlides[existingIndex] = {
          ...updatedSlides[existingIndex],
          ...slide,
          updatedAt: new Date() // Mark as updated to trigger regeneration
        };
        return updatedSlides;
      } else {
        // Add new slide, maintaining order by slide number
        console.log(`[handleAgentSlideUpdate] Adding new slide with ID ${slide.id}`);
        const newSlides = [...prev, slide].sort((a, b) => parseInt(a.id) - parseInt(b.id));
        return newSlides;
      }
    });
    
    // Switch to presentations tab to show the update
    if (agentsSidebarTab !== 'presentations') {
      handleAgentsSidebarTabChange('presentations');
    }
  }, [agentsSidebarTab, handleAgentsSidebarTabChange, initializationDone]);

  // Handler for agent paragraph updates (similar to slides)
  const handleAgentParagraphUpdate = useCallback((paragraphNumber: number, paragraph: NoteParagraph) => {
    // Don't process tool invocations while initialization is not complete or database is loading
    if (!initializationDone || isLoadingNotes) {
      console.log('[handleAgentParagraphUpdate] Skipping while initialization is not complete or database is loading');
      return;
    }
    
    setNoteParagraphs(prev => {
      // Check if paragraph with this ID already exists from database
      const existingIndex = prev.findIndex(p => p.id === paragraph.id);
      
      if (existingIndex >= 0) {
        // Paragraph with this ID already exists from database - don't override
        console.log(`[handleAgentParagraphUpdate] Paragraph with ID ${paragraph.id} already exists from database, skipping update`);
        return prev; // Return unchanged array
      } else {
        // Add new paragraph, maintaining order by paragraph number
        const newParagraphs = [...prev, paragraph].sort((a, b) => parseInt(a.id) - parseInt(b.id));
        return newParagraphs;
      }
    });
    
    // Switch to notes tab to show the update
    if (agentsSidebarTab !== 'notes') {
      handleAgentsSidebarTabChange('notes');
    }
  }, [agentsSidebarTab, handleAgentsSidebarTabChange, initializationDone, isLoadingNotes]);

  // Handler for references updates
  const handleReferencesUpdate = useCallback((paragraphNumber: number, references: string[]) => {
    
    setNoteParagraphs(prev => {
      const existingIndex = prev.findIndex(p => p.id === paragraphNumber.toString());
      
      if (existingIndex >= 0) {
        // Update existing paragraph references
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          references,
          updatedAt: new Date()
        };
        return updated;
      }
      
      return prev; // No paragraph found, return unchanged
    });
  }, []);

  // Monitor for flashcard tool calls and process them
  useEffect(() => {
    // Only process tool invocations after initialization is complete and database data is loaded
    if (!initializationDone || isLoadingNotes) {
      return; // Wait for database data to load first
    }
    
    // Process ALL messages to check for tool invocations (not just the last one)
    chat.messages.forEach((message, messageIndex) => {
      if (message && message.toolInvocations) {
        message.toolInvocations.forEach((invocation: any) => {
        // Create a unique key for this invocation
        const invocationKey = `${invocation.toolName}-${invocation.toolCallId || ''}-${JSON.stringify(invocation.args)}-${invocation.state}`;
        
        // Check if we've already processed this invocation
        if (processedToolInvocations.has(invocationKey)) {
          return; // Skip if already processed
        }
        
        if (invocation.state === 'result' && invocation.toolName && invocation.result) {
          // Mark this invocation as processed
          setProcessedToolInvocations(prev => new Set([...prev, invocationKey]));
          
          // Handle flashcard creation
          if (invocation.toolName === 'createFlashCard' && invocation.result.success && invocation.result.card) {
            const card = invocation.result.card;
            
            // Check if this is a tool invocation for an existing flashcard ID from database
            const cardId = invocation.args?.cardId || card.id;
            if (cardId) {
              const existingCard = flashCards.find(fc => fc.id === cardId);
              if (existingCard) {
                console.log(`[Tool Processing] Flashcard with ID ${cardId} already exists from database, skipping tool invocation`);
                return; // Skip this tool invocation
              }
            }
            
            handleCreateFlashCard({
              front: card.front,
              back: card.back,
              category: card.category,
              difficulty: card.difficulty,
              reviewCount: card.reviewCount || 0,
              correctCount: card.correctCount || 0,
              created: new Date(card.created)
            });
          }
          // Handle flashcard editing
          else if (invocation.toolName === 'editFlashCard' && invocation.result.success && invocation.result.updates) {
            const cardId = invocation.args?.cardId;
            if (cardId) {
              // Check if flashcard exists from database - if so, this is legitimate editing
              const existingCard = flashCards.find(fc => fc.id === cardId);
              if (!existingCard) {
                console.log(`[Tool Processing] Flashcard ${cardId} not found in database, skipping tool invocation`);
                return; // Skip this tool invocation
              }
              
              handleEditFlashCard(cardId, invocation.result.updates);
            }
          }
          // Handle flashcard deletion
          else if (invocation.toolName === 'deleteFlashCard' && invocation.result.success && invocation.result.deletedId) {
            const cardId = invocation.result.deletedId;
            
            // Check if flashcard exists from database - if so, this is legitimate deletion
            const existingCard = flashCards.find(fc => fc.id === cardId);
            if (!existingCard) {
              console.log(`[Tool Processing] Flashcard ${cardId} not found in database, skipping tool invocation`);
              return; // Skip this tool invocation
            }
            
            handleDeleteFlashCard(invocation.result.deletedId);
          }
          // Handle slide editing
          else if (invocation.toolName === 'editSlide' && invocation.result.success && invocation.result.slide) {
            const slideNumber = invocation.result.slideNumber;
            const slideId = slideNumber.toString();
            
            // Always process slide updates from tool invocations (both new and existing slides)
            console.log(`[Tool Processing] Processing editSlide for slide ID ${slideId}`);
            handleAgentSlideUpdate(slideNumber, invocation.result.slide);
          }
          // Handle paragraph editing
          else if (invocation.toolName === 'editParagraph' && invocation.result.success && invocation.result.paragraph) {
            const paragraphNumber = invocation.result.paragraphNumber;
            const paragraphId = paragraphNumber.toString();
            
            console.log(`[Tool Processing] Processing editParagraph for ID: ${paragraphId}`);
            console.log(`[Tool Processing] Current paragraphs:`, noteParagraphs.map(p => ({ id: p.id, hasContent: !!p.content })));
            
            // Check if paragraph ID already exists from database - if so, don't override with tool invocation
            const existingParagraph = noteParagraphs.find(p => p.id === paragraphId);
            if (existingParagraph) {
              console.log(`[Tool Processing] Paragraph with ID ${paragraphId} already exists from database, skipping tool invocation`);
              console.log(`[Tool Processing] Existing paragraph:`, { id: existingParagraph.id, hasContent: !!existingParagraph.content });
              return; // Skip this tool invocation
            }
            
            console.log(`[Tool Processing] No existing paragraph found for ID ${paragraphId}, proceeding with tool invocation`);
            
            const toolResult = invocation.result.paragraph;
            
            // Extract content and references from tool result
            let content = '';
            let references: string[] = [];
            
            if (typeof toolResult === 'string') {
              // Simple string content
              content = toolResult;
            } else if (typeof toolResult === 'object' && toolResult !== null) {
              // Object with content and references
              content = toolResult.content || '';
              references = toolResult.references || [];
            }
            
            // Create proper NoteParagraph object
            const paragraph: NoteParagraph = {
              id: paragraphId,
              content: content,
              createdAt: new Date(),
              updatedAt: new Date(),
              references: references
            };
            
            console.log(`[Tool Processing] Creating new paragraph:`, { id: paragraph.id, hasContent: !!paragraph.content });
            handleAgentParagraphUpdate(paragraphNumber, paragraph);
          }
        }
        });
      }
    });
  }, [chat.messages, handleCreateFlashCard, handleEditFlashCard, handleDeleteFlashCard, handleAgentSlideUpdate, handleAgentParagraphUpdate, processedToolInvocations, initializationDone, isLoadingNotes, flashCards, agentSlides, noteParagraphs]);

  // Handler to open notes tab in sidebar
  const handleOpenNotes = useCallback(() => {
    if (!showAgentsSidebar) {
      setShowAgentsSidebar(true);
    }
    handleAgentsSidebarTabChange('notes');
  }, [showAgentsSidebar, handleAgentsSidebarTabChange]);

  // Handler to open flashcards tab in sidebar
  const handleOpenFlashcards = useCallback(() => {
    if (!showAgentsSidebar) {
      setShowAgentsSidebar(true);
    }
    handleAgentsSidebarTabChange('flashcards');
  }, [showAgentsSidebar, handleAgentsSidebarTabChange]);

  // Handler to open presentations tab in sidebar
  const handleOpenPresentations = useCallback(() => {
    if (!showAgentsSidebar) {
      setShowAgentsSidebar(true);
    }
    handleAgentsSidebarTabChange('presentations');
  }, [showAgentsSidebar, handleAgentsSidebarTabChange]);

  // CV handlers
  const handleCVComplete = useCallback((cvData: CVContent) => {
    // Don't process tool invocations while initialization is not complete
    if (!initializationDone) {
      console.log('[handleCVComplete] Skipping while initialization is not complete');
      return;
    }
    
    setCvContent(cvData);
    
    // Automatically open the sidebar if not already open
    if (!showAgentsSidebar) {
      setShowAgentsSidebar(true);
    }
    // Switch to CV tab to show the new CV
    handleAgentsSidebarTabChange('cv');
  }, [handleAgentsSidebarTabChange, showAgentsSidebar, initializationDone]);

  const handleOpenCV = useCallback(() => {
    if (!showAgentsSidebar) {
      setShowAgentsSidebar(true);
    }
    handleAgentsSidebarTabChange('cv');
  }, [showAgentsSidebar, handleAgentsSidebarTabChange]);

  // Handler for public session clicks from showcase
  const handlePublicSessionClick = useCallback(async (sessionId: string) => {
    console.log('[Home] Public session clicked:', sessionId);
    
    // Don't override the user ID if the user is already logged in
    // Only set to 'shared' if there's no current user ID
    const currentUserId = userId || 'shared';
    
    // Update the URL to show the session
    const url = new URL(window.location.href);
    url.searchParams.set('conversation_id', sessionId);
    
    // Only set user_id param if we're using 'shared' (anonymous access)
    if (!userId) {
      url.searchParams.set('user_id', currentUserId);
    }
    
    window.history.pushState({}, '', url.toString());
    
    // Only update the userId state if there wasn't one already
    if (!userId) {
      setUserId(currentUserId);
    }
    
    // Load the conversation
    setCurrentConversationId(sessionId);
    
    // The loadConversationById will handle access control appropriately
    await loadConversationById(sessionId);
  }, [loadConversationById, userId]);

  // Handler for file reference clicks from ParagraphEditor
  const handleFileReferenceClick = useCallback((fileId: string) => {
    console.log('🔗 File reference clicked:', fileId);
    console.log('📁 Available files:', files.uploadedFiles.map(f => ({ id: f.id, name: f.name })));
    
    // Find the file in uploadedFiles
    const file = files.uploadedFiles.find(f => f.id === fileId);
    console.log('📄 Found file:', file ? { id: file.id, name: file.name } : 'NOT FOUND');
    
    if (file) {
      // If right sidebar is expanded, collapse it first to make room for left sidebar
      if (isRightSidebarExpanded) {
        console.log('📱 Collapsing expanded right sidebar to show file');
        setIsRightSidebarExpanded(false);
      }
      
      // Open the left sidebar if not already open
      if (!showLeftSidebar) {
        console.log('🔓 Opening left sidebar');
        setShowLeftSidebar(true);
      }
      
      // Select the file to open the detail modal
      console.log('✅ Selecting file for detail modal');
      setContextSelectedFile(file);
    } else {
      console.warn('❌ File not found with ID:', fileId);
      
      // Try to find file by alternative methods or check localStorage
      const fileMetadata = getFileMetadataFromLocalStorage(fileId);
      if (fileMetadata && fileMetadata.id) {
        console.log('💾 Found file in localStorage, using that:', fileMetadata);
        
        // If right sidebar is expanded, collapse it first to make room for left sidebar
        if (isRightSidebarExpanded) {
          console.log('📱 Collapsing expanded right sidebar to show file');
          setIsRightSidebarExpanded(false);
        }
        
        // Open the left sidebar if not already open
        if (!showLeftSidebar) {
          setShowLeftSidebar(true);
        }
        // Use the localStorage metadata as a fallback, ensuring it has required properties
        setContextSelectedFile(fileMetadata as UploadedFile);
      } else {
        // If file not found anywhere, still open the sidebar to show available files
        console.log('📂 File not found, opening sidebar to show available files');
        
        // If right sidebar is expanded, collapse it first to make room for left sidebar
        if (isRightSidebarExpanded) {
          console.log('📱 Collapsing expanded right sidebar to show available files');
          setIsRightSidebarExpanded(false);
        }
        
        if (!showLeftSidebar) {
          setShowLeftSidebar(true);
        }
        // Show a toast notification
        addToast({
          type: 'warning',
          title: 'File Not Found',
          message: `File with ID ${fileId} could not be found. It may have been deleted or moved.`
        });
      }
    }
  }, [files.uploadedFiles, setContextSelectedFile, showLeftSidebar, isRightSidebarExpanded, setIsRightSidebarExpanded, addToast]);

  // When the user switches tabs on mobile, make sure we create a session before opening the Files tab
  const handleMobileTabChange = useCallback(async (tab: 'chat' | 'files' | 'assets') => {
    if (tab === 'files' && !currentConversationId && userId) {
      await initializeConversation(userId);
    }

    setActiveTab(tab);
  }, [currentConversationId, userId, initializeConversation]);

  return (
    <>
      <ChatLayout
        header={
          <ChatHeader
            currentAgent={chat.currentAgent}
            currentConversationId={currentConversationId}
            isCreatingSession={isCreatingSession}
            showHistoryDropdown={history.showHistoryDropdown}
            isLoadingHistory={history.isLoadingHistory}
            chatHistory={history.chatHistory}
            editSessionId={history.editSessionId}
            editSessionTitle={history.editSessionTitle}
            isDeletingSession={history.isDeletingSession}
            userId={userId}
            showAgentsSidebar={showAgentsSidebar}
            showLeftSidebar={showLeftSidebar}
            onReset={handleReset}
            onToggleDropdown={handleToggleHistoryDropdown}
            onToggleAgentsSidebar={() => setShowAgentsSidebar(!showAgentsSidebar)}
            onToggleLeftSidebar={handleToggleLeftSidebar}
            onEditTitle={handleEditSessionTitle}
            onDeleteSession={handleDeleteSession}
            onSelectSession={handleHistorySelect}
            onSetEditSessionId={history.setEditSessionId}
            onSetEditSessionTitle={history.setEditSessionTitle}
            todayMessageCount={todayMessageCount}
            onRefreshMessageCount={refreshTodayMessageCount}
            onResetSidebarTab={handleResetSidebarTab}
            noteParagraphs={noteParagraphs}
            flashCards={flashCards}
            agentSlides={agentSlides}
            cvContent={cvContent}
            onToggleVisibility={handleToggleVisibility}
          />
        }
        leftSidebar={
          (showLeftSidebar || isMobile) ? (
            <FileSidebar
              uploadedFiles={files.uploadedFiles}
              isUploadingFile={files.isUploadingFile}
              showFileInfo={showFileInfo}
              userId={userId}
              currentConversationId={currentConversationId}
              defaultVectorStoreId={files.defaultVectorStoreId}
              onFileUpload={files.handleFileUpload}
              onLinkSubmit={files.handleLinkSubmit}
              onToggleFileInfo={() => setShowFileInfo(!showFileInfo)}
              onFileDeleted={files.handleFileDeleted}
              onVectorStoreCreated={files.setDefaultVectorStoreId}
              onRefreshFiles={files.handleRefreshFiles}
              isRefreshing={files.isRefreshing}
              onSendMessage={(message, agent) => handleInputSend(message, undefined, agent)}
              onFileQuickAction={handleFileQuickAction}
              onShowAnalysis={analysis.handleShowAnalysis}
              onFileSelect={files.setSelectedFile}
              isMobile={isMobile}
              autoAddSources={autoAddSources}
              setAutoAddSources={setAutoAddSources}
              isExpanded={isLeftSidebarExpanded}
              onToggleExpand={handleExpandLeftSidebar}
            />
          ) : null
        }
        rightSidebar={
          showAgentsSidebar ? (
            <AgentsSidebar
              ref={agentsSidebarRef}
              agents={agents.agents}
              showAgentsSidebar={showAgentsSidebar}
              onToggleAgentsSidebar={() => setShowAgentsSidebar(!showAgentsSidebar)}
              isLoadingAgents={agents.isLoadingAgents}
              onToggleAgentOrTool={handleToggleAgentOrTool}
              vectorStoreInfo={vectorStoreInfo}
              userId={userId}
              onAgentsUpdate={(updatedAgents) => agents.setAgents(updatedAgents)}
              onTabChange={handleAgentsSidebarTabChange}
              currentConversationId={currentConversationId || undefined}
              flashCards={flashCards}
              onCreateFlashCard={handleCreateFlashCard}
              onEditFlashCard={handleEditFlashCard}
              onDeleteFlashCard={handleDeleteFlashCard}
              onReviewFlashCard={handleReviewFlashCard}
              activeTab={agentsSidebarTab === 'agents' ? null : agentsSidebarTab === 'webresearch' ? null : agentsSidebarTab}
              noteParagraphs={noteParagraphs}
              onParagraphUpdate={handleParagraphUpdate}
              onParagraphDelete={handleParagraphDelete}
              onParagraphAdd={handleParagraphAdd}
              onReferencesUpdate={handleReferencesUpdate}
              onFileReferenceClick={handleFileReferenceClick}
              isSavingNotes={isSavingNotes}
              isLoadingNotes={isLoadingNotes}
              lastSavedNoteParagraphs={lastSavedNoteParagraphs}
              agentSlides={agentSlides}
              onAgentSlideUpdate={handleAgentSlideUpdate}
              cvContent={cvContent}
              onCreateCV={() => handleInputSend('I need help creating a professional CV. Please guide me through the process and ask for all the necessary information.', undefined, 'CV Writer Agent')}
              isLoadingCV={false}
              onSendMessage={(payload) => handleInputSend(payload.message, undefined, payload.agent)}
              isExpanded={isRightSidebarExpanded}
              onToggleExpand={handleExpandRightSidebar}
            />
          ) : null
        }
        content={
          <ChatContent
            messages={chatMessages}
            currentMessage={chat.currentMessage}
            isProcessing={chat.isProcessing}
            showWelcome={chat.showWelcome || !currentConversationId} // Show welcome when no conversation exists
            isLoadingSession={isLoadingSession}
            isCreatingSession={isCreatingSession}
            mode={mode}
            onMessageChange={(value: string) => chat.handleInputChange(value)}
            onSendMessage={(message: string) => handleInputSend(message)}
            onCopy={handleCopy}
            onEdit={handleMessageEdit}
            onDelete={handleMessageDelete}
            onLinkSubmit={async (url: string) => {
              await files.handleLinkSubmit(url);
              return;
            }}
            onFileSelect={(file) => {
              files.setSelectedFile(file);
            }}
            cachedMetadata={fileMetadataCache}
            onWriteTextComplete={handleWriteTextComplete}
            onOpenNotes={handleOpenNotes}
            onOpenFlashcards={handleOpenFlashcards}
            onCVComplete={handleCVComplete}
            onOpenCV={handleOpenCV}
            onOpenPresentations={handleOpenPresentations}
            showLeftSidebar={showLeftSidebar}
            showRightSidebar={showAgentsSidebar}
            onMobileTabChange={handleMobileTabChange}
            autoAddSources={autoAddSources}
            onPublicSessionClick={handlePublicSessionClick}
            hasConversation={!!currentConversationId} // Pass whether a conversation exists
            onSendMessageFromActions={(payload) => handleInputSend(payload.message, undefined, payload.agent)}
            inputComponent={
              !selectedScenario && !isInScenarioGenerationMode && !currentConversationId && chatMessages.length === 0 && !isCreatingSession && !isLoadingSession ? (
                <ChatInput
                  value={chat.currentMessage}
                  onChange={(value: string) => chat.handleInputChange(value)}
                  onSend={handleInputSend}
                  disabled={chat.isProcessing || isLoadingSession || isCreatingSession}
                  currentAgent={chat.currentAgent}
                  onAgentChange={(agentName: string) => chat.setCurrentAgent(agentName)}
                  onScenarioGenerate={handleScenarioGenerate}
                  isGeneratingScenario={isGeneratingScenario}
                  activeScenarioProgress={loadedScenarioProgress}
                  onContinueScenario={onContinueScenario}
                  showRightSidebar={showAgentsSidebar}
                  showLeftSidebar={showLeftSidebar}
                  onToggleLeftSidebar={handleToggleLeftSidebar}
                  chatHistory={chatMessages.map(msg => ({
                    role: msg.role as 'user' | 'assistant' | 'system',
                    content: msg.content,
                    agentName: msg.agentName
                  }))}
                  isNoMessageState={true}
                  isMobileDevice={isMobile}
                  onMobileTabChange={handleMobileTabChange}
                  sessionId={currentConversationId || undefined}
                />
              ) : null
            }
          />
        }
        inputComponent={
          // Hide input when creating a new session or loading a conversation
          (isCreatingSession || isLoadingSession) ? null : (
            selectedScenario || isInScenarioGenerationMode ? (
              <ScenarioCommandsInput
                scenario={isInScenarioGenerationMode && !selectedScenario ? {
                  id: 'generating',
                  title: 'Generating Scenario',
                  description: 'Please wait while we create your scenario...',
                  color: 'purple',
                  steps: []
                } : convertScenarioForCommands(selectedScenario!)}
                currentStep={currentStep}
                completedSteps={completedSteps}
                triggeredActions={triggeredActions}
                onStepAction={handleScenarioStepAction}
                onNextStep={handleNextStep}
                onGoToStep={handleGoToStep}
                onBackToScenarios={handleBackToScenarios}
                onTypeYourOwn={handleTypeYourOwn}
                disabled={chat.isProcessing || isLoadingSession || isCreatingSession}
                isProcessing={chat.isProcessing}
                isClosingScenario={isClosingScenario}
                isNextStepLoading={isNextStepLoading}
                isTypeYourOwnLoading={isTypeYourOwnLoading}
                onSaveScenario={handleSaveScenario}
                onShareScenario={handleShareScenario}
                isSavingScenario={isSavingScenario}
                isGeneratingScenario={isGeneratingScenario}
                scenarioError={scenarioError}
                onStartScenarioAgain={handleStartScenarioAgain}
                scenarioObject={scenarioObject}
                onRunGeneratedScenario={handleRunGeneratedScenario}
                showLeftSidebar={showLeftSidebar}
                showRightSidebar={showAgentsSidebar}
              />
            ) : currentConversationId ? (
              <ChatInput
                value={chat.currentMessage}
                onChange={(value: string) => chat.handleInputChange(value)}
                onSend={handleInputSend}
                disabled={chat.isProcessing || isLoadingSession || isCreatingSession}
                currentAgent={chat.currentAgent}
                onAgentChange={(agentName: string) => chat.setCurrentAgent(agentName)}
                onScenarioGenerate={handleScenarioGenerate}
                isGeneratingScenario={isGeneratingScenario}
                activeScenarioProgress={loadedScenarioProgress}
                onContinueScenario={onContinueScenario}
                showRightSidebar={showAgentsSidebar}
                showLeftSidebar={showLeftSidebar}
                onToggleLeftSidebar={handleToggleLeftSidebar}
                chatHistory={chatMessages.map(msg => ({
                  role: msg.role as 'user' | 'assistant' | 'system',
                  content: msg.content,
                  agentName: msg.agentName
                }))}
                isNoMessageState={false}
                isMobileDevice={isMobile}
                onMobileTabChange={handleMobileTabChange}
                sessionId={currentConversationId || undefined}
              />
            ) : null
          )
        }
        isMobile={isMobile}
        activeTab={activeTab}
        isLoading={isLoadingSession || isCreatingSession}
        loadingMessage={
          isCreatingSession
            ? 'Creating new conversation...'
            : 'Loading conversation...'
        }
        onTabChange={handleMobileTabChange}
        rightSidebarWide={rightSidebarWide}
        rightSidebarExtraWide={rightSidebarExtraWide}
        leftSidebarWide={contextSelectedFile !== null}
        showRightSidebar={showAgentsSidebar}
        showLeftSidebar={showLeftSidebar}
        isLeftSidebarExpanded={isLeftSidebarExpanded}
        isRightSidebarExpanded={isRightSidebarExpanded}
        researchLoadingIndicator={mode === 'research' ? (
          <ResearchLoadingIndicator />
        ) : undefined}
        noteParagraphs={noteParagraphs}
        flashCards={flashCards}
        cvContent={cvContent}
        agentSlides={agentSlides}
      />

      <AnalysisModal
        modal={analysis.analysisModal}
        onClose={analysis.handleCloseAnalysis}
      />
    </>
  );
}
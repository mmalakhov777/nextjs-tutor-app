'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  FiSend, FiRefreshCw, FiCopy, FiInfo, FiX, FiArrowRight, 
  FiPaperclip, FiFile, FiUpload, FiToggleLeft, FiToggleRight, FiUsers, FiTool,
  FiSearch, FiMaximize2, FiExternalLink, FiClock, FiEdit2, FiTrash2, FiMoreVertical,
  FiMessageSquare, FiFolder, FiUser
} from 'react-icons/fi';
import { RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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

// Import our hooks
import { useChat } from '@/hooks/useChat';
import { useFiles } from '@/hooks/useFiles';
import { useHistory } from '@/hooks/useHistory';
import { useAnalysis } from '@/hooks/useAnalysis';
import { useAgents } from '@/hooks/useAgents';

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
  // Get user_id from URL
  const [userId, setUserId] = useState<string | null>(null);

  // Use our custom hooks
  const chat = useChat(userId);
  const files = useFiles(userId, chat.currentConversationId);
  const history = useHistory(userId);
  const analysis = useAnalysis();
  const agents = useAgents(userId);
  
  // Create a ref for the AgentsSidebar component
  const agentsSidebarRef = useRef<AgentsSidebarRef>(null);
  
  // State for showing file info
  const [showFileInfo, setShowFileInfo] = useState(false);
  
  // State for showing agents sidebar
  const [showAgentsSidebar, setShowAgentsSidebar] = useState(false);
  
  // Vector store info combining from URL and from fetched data
  const [vectorStoreInfo, setVectorStoreInfo] = useState<{ id: string; fileCount?: number; type?: string; } | null>(vectorStoreInfoFromUrl);

  // New loading states for different operations
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(false);

  // Add seenAgents state
  const [seenAgents, setSeenAgents] = useState<Set<string>>(new Set(['Triage Agent']));
  
  // Mobile responsiveness
  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'files' | 'agents'>('chat');
  
  // Add state to track active sidebar tab
  const [agentsSidebarTab, setAgentsSidebarTab] = useState<'agents' | 'notes'>('agents');

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
    const searchParams = new URLSearchParams(window.location.search);
    const userIdParam = searchParams.get('user_id');
    const conversationIdParam = searchParams.get('conversation_id');
    
    if (userIdParam) {
      setUserId(userIdParam);
    } else {
      console.error('Error: User ID is required. Please add ?user_id=YOUR_USER_ID to the URL.');
    }
    
    if (conversationIdParam) {
      chat.setCurrentConversationId(conversationIdParam);
      loadConversationById(conversationIdParam);
    }
  }, []);

  // Fix the vectorStoreInfo effect that's causing circular updates
  useEffect(() => {
    if (files.defaultVectorStoreId) {
      // Cast to the proper type to avoid TypeScript errors
      const newInfo: { id: string; fileCount?: number; type?: string } = {
        id: files.defaultVectorStoreId,
        fileCount: vectorStoreInfo?.fileCount,
        type: vectorStoreInfo?.type || 'Vector Store'
      };
      
      // Only update if the ID has changed
      if (vectorStoreInfo?.id !== files.defaultVectorStoreId) {
        setVectorStoreInfo(newInfo);
      }
    } else if (vectorStoreInfo !== null) {
      // Only update if there's a change needed
      setVectorStoreInfo(null);
    }
    // Remove vectorStoreInfo from dependencies to prevent circular updates
  }, [files.defaultVectorStoreId, vectorStoreInfo?.id]);

  // Add effect to fetch files when vector store ID changes
  useEffect(() => {
    if (files.defaultVectorStoreId) {
      fetchFilesByVectorStoreId(files.defaultVectorStoreId);
    } else {
      // Clear files if no vector store ID
      files.setUploadedFiles([]);
    }
  }, [files.defaultVectorStoreId]);
  
  // Fetch chat history when userId changes
  useEffect(() => {
    if (userId) {
      history.fetchChatHistory().then(sessions => {
        // If no conversation is currently loaded and we have sessions available, load the most recent one
        const urlParams = new URLSearchParams(window.location.search);
        const conversationIdParam = urlParams.get('conversation_id');
        
        if (!conversationIdParam && !chat.currentConversationId && sessions.length > 0) {
          loadConversationById(sessions[0].id);
          chat.setCurrentConversationId(sessions[0].id);
          
          // Update URL with the conversation_id without refreshing the page
          const url = new URL(window.location.href);
          url.searchParams.set('conversation_id', sessions[0].id);
          window.history.pushState({}, '', url.toString());
          
          // Call initialization complete callback
          if (onInitializationComplete) {
            console.log("Calling onInitializationComplete after loading existing session");
            onInitializationComplete();
          }
        } else if (!conversationIdParam && !chat.currentConversationId && sessions.length === 0) {
          // If there are no existing conversations, create a new one
          initializeConversation(userId);
        } else if (conversationIdParam) {
          // If URL already has conversation_id, we're already initialized
          if (onInitializationComplete) {
            console.log("Calling onInitializationComplete for existing conversation_id");
            onInitializationComplete();
          }
        }
      });
    }
  }, [userId]);

  // Effect to refresh message count when new messages arrive
  useEffect(() => {
    // Check if there are messages and if the most recent one is from an agent (assistant)
    if (chat.messages.length > 0) {
      const lastMessage = chat.messages[chat.messages.length - 1];
      // If the last message is from an assistant, refresh the message count
      if (lastMessage.role === 'assistant' && !chat.isProcessing) {
        // Slight delay to ensure the message is fully processed
        const timeoutId = setTimeout(() => {
          agentsSidebarRef.current?.refreshMessageCount();
        }, 500);
        
        return () => clearTimeout(timeoutId);
      }
    }
  }, [chat.messages, chat.isProcessing]);

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content)
      .then(() => {
        console.log('Copied to clipboard!');
      })
      .catch(() => {
        console.error('Failed to copy to clipboard');
      });
  };

  // Function to initialize a new conversation
  const initializeConversation = async (userId: string) => {
    setIsCreatingSession(true);
    
    try {
      // Construct the backend URL properly
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5002';
      
      // Create new chat session
      const sessionResponse = await fetch(`${backendUrl}/api/chat-sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          title: 'New Chat',
          user_id: userId
        }),
      });
      
      if (!sessionResponse.ok) {
        throw new Error(`Failed to create new chat session: ${sessionResponse.status} ${sessionResponse.statusText}`);
      }
      
      // Get response as text first to debug any issues
      const responseText = await sessionResponse.text();
      console.log('Session creation response:', responseText.substring(0, 200) + '...');
      
      // Try to parse as JSON
      let newSession;
      try {
        newSession = JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}...`);
      }
      
      console.log('New session created:', newSession);
      chat.setCurrentConversationId(newSession.id);
      
      // Create vector store
      const vectorStoreResponse = await fetch(`${backendUrl}/api/vector-store`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          user_id: userId,
          chat_id: newSession.id
        }),
      });
      
      if (!vectorStoreResponse.ok) {
        throw new Error(`Failed to create vector store: ${vectorStoreResponse.status} ${vectorStoreResponse.statusText}`);
      }
      
      // Get response as text first to debug any issues
      const vectorStoreResponseText = await vectorStoreResponse.text();
      console.log('Vector store creation response:', vectorStoreResponseText.substring(0, 200) + '...');
      
      // Try to parse as JSON
      let vectorStoreData;
      try {
        vectorStoreData = JSON.parse(vectorStoreResponseText);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        throw new Error(`Invalid JSON response: ${vectorStoreResponseText.substring(0, 100)}...`);
      }
      
      const vectorStoreId = vectorStoreData.vectorStoreId;
      
      if (!vectorStoreId) {
        throw new Error('No vector store ID returned from API');
      }
      
      console.log('Vector store created:', vectorStoreId);
      
      // Update session with vector store ID
      const updateSessionResponse = await fetch(`${backendUrl}/api/chat-sessions/${newSession.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          vector_store_id: vectorStoreId,
          title: newSession.title,
          user_id: userId
        }),
      });
      
      if (!updateSessionResponse.ok) {
        throw new Error(`Failed to update chat session with vector store ID: ${updateSessionResponse.status} ${updateSessionResponse.statusText}`);
      }
      
      // Get response as text first to debug any issues
      const updateResponseText = await updateSessionResponse.text();
      console.log('Session update response:', updateResponseText.substring(0, 200) + '...');
      
      files.setDefaultVectorStoreId(vectorStoreId);
      
      const url = new URL(window.location.href);
      url.searchParams.set('conversation_id', newSession.id);
      window.history.pushState({}, '', url.toString());
      
      // Reset messages
      chat.setMessages([]);
      chat.setShowWelcome(true);
      
      console.log('New conversation created successfully');
      
      return newSession.id;
    } catch (error) {
      console.error('Error creating new session:', error);
      return null;
    } finally {
      setIsCreatingSession(false);
      if (onInitializationComplete) {
        console.log("Calling onInitializationComplete from initializeConversation");
        onInitializationComplete();
      }
    }
  };

  // Function to load a conversation by ID
  const loadConversationById = async (conversationId: string) => {
    setIsLoadingSession(true);
    console.log(`Loading conversation with ID: ${conversationId}`);
    
    try {
      // Construct the backend URL properly
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5002';
      const apiUrl = `${backendUrl}/api/chat-sessions/${conversationId}`;
      
      console.log('Fetching session from URL:', apiUrl);
      
      const sessionResponse = await fetch(apiUrl, {
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
      console.log('Raw response:', responseText.substring(0, 200) + '...');
      
      // Try to parse as JSON
      let sessionData;
      try {
        sessionData = JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}...`);
      }
      
      console.log('Session data parsed successfully:', sessionData);
      
      if (!sessionData) {
        throw new Error('No session data received');
      }
      
      // Extract the chat session object - handle both formats (wrapped in chat_session or direct)
      const chatSession = sessionData.chat_session || sessionData;
      
      if (!chatSession) {
        throw new Error('No chat session found in response');
      }
      
      console.log('Chat session found:', chatSession);
      
      // Get vector store info if available
      const vectorStoreId = chatSession.vector_store_id;
      console.log('Vector store ID from session:', vectorStoreId);
      
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
          const message: Message = {
            id: msg.id,
            role: msg.role as MessageRole,
            content: msg.content,
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
          }
          
          return message;
        });
      
      console.log('Processed messages:', convertedMessages.length, 'messages');
      
      // Update state with the loaded conversation
      chat.setMessages(convertedMessages);
      chat.setShowWelcome(false);
      
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
      urlObj.searchParams.set('conversation_id', conversationId);
      window.history.pushState({}, '', urlObj.toString());
      
      // Set the conversation title
      if (chatSession.title) {
        document.title = `Chat: ${chatSession.title}`;
      }
      
      console.log(`Loaded conversation: ${chatSession.title}`);
      
      setIsLoadingSession(false);
      
      // Call initialization complete callback
      if (onInitializationComplete) {
        console.log("Calling onInitializationComplete after loading conversation by ID");
        onInitializationComplete();
      }
      
      return true;
    } catch (error) {
      console.error('Error loading conversation:', error);
      
      setIsLoadingSession(false);
      
      // Call initialization complete even on error
      if (onInitializationComplete) {
        console.log("Calling onInitializationComplete after error loading conversation");
        onInitializationComplete();
      }
      
      return false;
    }
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

  // Update handleHistorySelect to check files for vector store ID if not found in session
  const handleHistorySelect: HandleHistorySelectFn = async (session, skipSessionFetch = false) => {
    try {
      chat.setCurrentConversationId(session.id);
      
      // Set loading state immediately
      setIsLoadingSession(true);
      
      // Close the dropdown immediately after selection
      history.setShowHistoryDropdown(false);

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
            const message: Message = {
              id: msg.id,
              role: msg.role as MessageRole,
              content: msg.content,
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
        
        // Add messages to state
        chat.setMessages(uniqueMessages);
        
        // Log messages for debugging
        console.log('Loaded messages from history:', uniqueMessages);
        
        // Set the conversation title
        document.title = `Chat: ${session.title || 'Untitled'}`;
        
        // Show notification
        console.log(`Loaded conversation: ${session.title}`);
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

  // Optimize handler functions with useCallback to prevent excessive re-renders
  const handleToggleAgentOrTool = useCallback(async (agent: any) => {
    const result = await agents.handleToggleAgentOrTool(agent);
    if (result.success) {
      handleActionSuccess(result.message || `${agent.name} ${!agent.enabled ? 'enabled' : 'disabled'}`);
    } else {
      handleActionError(result.message || 'Failed to toggle agent');
    }
  }, [agents, handleActionSuccess, handleActionError]);

  const handleEditSessionTitle = useCallback(async (sessionId: string, title: string) => {
    const result = await history.handleEditSessionTitle(sessionId, title);
    if (result.success) {
      handleActionSuccess(result.message || 'Chat title updated successfully');
    } else if (result.message) {
      handleActionError(result.message || 'Failed to update chat title');
    }
  }, [history, handleActionSuccess, handleActionError]);

  const handleDeleteSession = useCallback(async (sessionId: string) => {
    const result = await history.handleDeleteSession(sessionId);
    if (result.success) {
      handleActionSuccess(result.message || 'Chat deleted successfully');
      
      // If we just deleted the current conversation, create a new one
      if (chat.currentConversationId === result.deletedSessionId) {
        chat.handleReset();
      }
    } else if (result.message) {
      handleActionError(result.message || 'Failed to delete chat');
    }
  }, [history, chat, handleActionSuccess, handleActionError]);

  const handleShowAnalysis = useCallback(async (file: any) => {
    const result = await analysis.handleShowAnalysis(file, chat.messages);
    if (!result.success && result.message) {
      handleActionError(result.message || 'Failed to analyze file');
    }
  }, [analysis, chat.messages, handleActionError]);

  // Add a memoized reset handler that also properly updates history
  const handleReset = useCallback(async () => {
    if (isCreatingSession) return;
    
    setIsCreatingSession(true);
    
    try {
      // Call the chat reset handler first
      await chat.handleReset();
      
      // If user is set, create a new session
      if (userId) {
        await initializeConversation(userId);
        
        // Force refresh chat history with the new session
        await history.fetchChatHistory(true);
      }
    } finally {
      setIsCreatingSession(false);
    }
  }, [chat, userId, history, isCreatingSession]);

  // Add message edit and delete handlers
  const handleMessageEdit = useCallback(async (message: Message) => {
    try {
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/chat-sessions/${chat.currentConversationId}/messages/${message.id}`, {
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
  }, [chat.currentConversationId]);

  const handleMessageDelete = useCallback(async (message: Message) => {
    try {
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/chat-sessions/${chat.currentConversationId}/messages/${message.id}`, {
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
  }, [chat.currentConversationId]);

  // Custom handlers for the ChatHeader component
  const handleToggleHistoryDropdown = useCallback(() => {
    if (!history.showHistoryDropdown) {
      if (userId) history.fetchChatHistory();
    }
    history.setShowHistoryDropdown(!history.showHistoryDropdown);
  }, [history, userId]);

  // Set initial vector store info
  useEffect(() => {
    if (vectorStoreInfoFromUrl) {
      setVectorStoreInfo(vectorStoreInfoFromUrl);
    }
  }, [vectorStoreInfoFromUrl]);

  // Update chat title with first user message
  useEffect(() => {
    // Only proceed if we have a valid conversation ID
    if (!chat.currentConversationId || !userId) return;
    
    // Look for the first user message
    const firstUserMessage = chat.messages.find(msg => msg.role === 'user');
    
    // If we found a user message and the conversation exists in history
    if (firstUserMessage) {
      const currentConversation = history.chatHistory.find(
        session => session.id === chat.currentConversationId
      );
      
      // Only update if the current title is "New Chat" and we have a user message with content
      if (
        currentConversation && 
        currentConversation.title === 'New Chat' && 
        typeof firstUserMessage.content === 'string' && 
        firstUserMessage.content.trim() !== ''
      ) {
        // Get first 50 chars of message for the title (or less if message is shorter)
        let newTitle = firstUserMessage.content.trim();
        
        // Skip if it's a FILE_QUICK_ACTION message
        if (newTitle.includes('<FILE_QUICK_ACTION>')) return;
        
        // Limit title length
        if (newTitle.length > 50) {
          newTitle = newTitle.substring(0, 47) + '...';
        }
        
        // Update the title via API
        handleEditSessionTitle(chat.currentConversationId, newTitle);
      }
    }
    // We only want to run this effect when messages change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat.messages, chat.currentConversationId, userId]);

  // Quick actions should be sent directly from FileSidebar
  const handleFileQuickAction = useCallback((fileInfo: UploadedFile, action: string, content: string) => {
    // Create a special message for display in UI
    const displayMessage: Message = {
      role: 'user',
      content: `<FILE_QUICK_ACTION>
filename: ${fileInfo.name || "document"}
file_id: ${fileInfo.id}
action: ${action}
content: HIDDEN_CONTENT
</FILE_QUICK_ACTION>`,
      timestamp: new Date()
    };
    
    // Add the display message to the UI
    chat.setMessages(prev => [...prev, displayMessage]);
    
    // Create the backend-friendly message format
    const backendMessage = `Text content: ${content}, user query: ${action}. (do not use file search tool while answering)`;
    
    // Set state for processing
    chat.setCurrentMessage('');
    chat.setIsProcessing(true);
    chat.setShowWelcome(false);
    
    // Use chat API endpoint directly
    const endpoint = '/api/proxy/chat';
    
    const requestBody = {
      question: backendMessage,
      userId: userId || 'anonymous',
      conversationId: chat.currentConversationId,
      history: chat.messages
        .filter(msg => 
          // Filter out any previous FILE_QUICK_ACTION messages since they might interfere
          msg.role !== 'error' && 
          msg.role !== 'system' &&
          (typeof msg.content !== 'string' || !msg.content.includes('<FILE_QUICK_ACTION>'))
        )
        .map(msg => ({ 
          role: msg.role, 
          content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content) 
        }))
    };
    
    console.log('Sending file quick action request to:', endpoint);
    
    // Instead of doing our own fetch, let's leverage the reader setup from useChat
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    })
    .then(async response => {
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let currentResponse = '';
      let responseAdded = false;
      
      // Add placeholder message for streaming
      let assistantMessageAdded = false;
      
      while (reader) {
        try {
          const { value, done } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                console.log('Stream Event (Quick Action):', { 
                  type: data.type, 
                  content: data.content && data.content.length > 50 ? 
                    data.content.substring(0, 50) + '...' : data.content 
                });
                
                switch (data.type) {
                  case 'message':
                    currentResponse = data.content;
                    
                    if (!assistantMessageAdded) {
                      // First create the assistant message
                      chat.setMessages(prev => {
                        return [...prev, { 
                          role: 'assistant', 
                          content: currentResponse,
                          timestamp: new Date(),
                          citations: [],
                          agentName: data.agent_name || chat.currentAgent
                        }];
                      });
                      assistantMessageAdded = true;
                      responseAdded = true;
                    } else {
                      // Then update it as more content comes in
                      chat.setMessages(prev => {
                        const newMessages = [...prev];
                        const lastMessage = newMessages[newMessages.length - 1];
                        if (lastMessage && lastMessage.role === 'assistant') {
                          lastMessage.content = currentResponse;
                        }
                        return newMessages;
                      });
                    }
                    break;
                    
                  case 'token':
                    currentResponse += data.content;
                    
                    if (!assistantMessageAdded) {
                      // First create the assistant message
                      chat.setMessages(prev => {
                        return [...prev, { 
                          role: 'assistant', 
                          content: currentResponse,
                          timestamp: new Date(),
                          citations: [],
                          agentName: chat.currentAgent
                        }];
                      });
                      assistantMessageAdded = true;
                      responseAdded = true;
                    } else {
                      // Then update it as more content comes in
                      chat.setMessages(prev => {
                        const newMessages = [...prev];
                        const lastMessage = newMessages[newMessages.length - 1];
                        if (lastMessage && lastMessage.role === 'assistant') {
                          lastMessage.content = currentResponse;
                        }
                        return newMessages;
                      });
                    }
                    break;
                    
                  case 'file_citation':
                    chat.setMessages(prev => {
                      const newMessages = [...prev];
                      const lastMessage = newMessages[newMessages.length - 1];
                      if (lastMessage && lastMessage.role === 'assistant') {
                        if (!lastMessage.citations) {
                          lastMessage.citations = [];
                        }
                        lastMessage.citations.push({
                          file_id: data.raw_citation.file_id,
                          index: data.raw_citation.index,
                          type: 'file_citation',
                          filename: data.raw_citation.filename,
                          raw_content: data.content
                        });
                      }
                      return newMessages;
                    });
                    break;
                    
                  case 'annotations':
                    chat.setMessages(prev => [...prev, {
                      role: 'tool',
                      content: data.content,
                      timestamp: new Date(),
                      toolAction: 'annotations',
                      toolName: data.toolName
                    }]);
                    break;
                    
                  case 'error':
                    chat.setMessages(prev => [...prev, { 
                      role: 'error', 
                      content: data.content,
                      timestamp: new Date()
                    }]);
                    break;
                }
              } catch (e) {
                console.error('Error processing message:', e);
              }
            }
          }
        } catch (readError) {
          console.error('Error reading from stream:', readError);
          break;
        }
      }
      
      // Make sure processing state is cleared
      chat.setIsProcessing(false);
    })
    .catch(error => {
      console.error('Error sending file quick action:', error);
      chat.setMessages(prev => [...prev, { 
        role: 'error', 
        content: 'Connection error. Please try again.',
        timestamp: new Date()
      }]);
      chat.setIsProcessing(false);
    });
  }, [chat, userId]);

  // Handler to track sidebar tab changes
  const handleAgentsSidebarTabChange = (tab: 'agents' | 'notes') => {
    setAgentsSidebarTab(tab);
  };

  return (
    <>
      <ChatLayout
        header={
          <ChatHeader
            currentAgent={chat.currentAgent}
            currentConversationId={chat.currentConversationId}
            isCreatingSession={isCreatingSession}
            showHistoryDropdown={history.showHistoryDropdown}
            isLoadingHistory={history.isLoadingHistory}
            chatHistory={history.chatHistory}
            editSessionId={history.editSessionId}
            editSessionTitle={history.editSessionTitle}
            isDeletingSession={history.isDeletingSession}
            userId={userId}
            onReset={handleReset}
            onToggleDropdown={handleToggleHistoryDropdown}
            onEditTitle={handleEditSessionTitle}
            onDeleteSession={handleDeleteSession}
            onSelectSession={handleHistorySelect}
            onSetEditSessionId={history.setEditSessionId}
            onSetEditSessionTitle={history.setEditSessionTitle}
          />
        }
        leftSidebar={
          <FileSidebar
            uploadedFiles={files.uploadedFiles}
            isUploadingFile={files.isUploadingFile}
            showFileInfo={showFileInfo}
            userId={userId}
            currentConversationId={chat.currentConversationId}
            defaultVectorStoreId={files.defaultVectorStoreId}
            onFileUpload={files.handleFileUpload}
            onLinkSubmit={files.handleLinkSubmit}
            onShowAnalysis={handleShowAnalysis}
            onToggleFileInfo={() => setShowFileInfo(!showFileInfo)}
            onFileDeleted={files.handleFileDeleted}
            onVectorStoreCreated={files.setDefaultVectorStoreId}
            onRefreshFiles={files.handleRefreshFiles}
            isRefreshing={files.isRefreshing}
            onSendMessage={chat.handleSendMessage}
            onFileQuickAction={handleFileQuickAction}
          />
        }
        rightSidebar={
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
            currentConversationId={chat.currentConversationId || undefined}
          />
        }
        content={
          <ChatContent
            messages={chat.messages}
            currentMessage={chat.currentMessage}
            isProcessing={chat.isProcessing}
            showWelcome={chat.showWelcome}
            isLoadingSession={isLoadingSession}
            isCreatingSession={isCreatingSession}
            currentAgent={chat.currentAgent}
            onMessageChange={chat.handleMessageChange}
            onSendMessage={chat.handleSendMessage}
            onCopy={handleCopy}
            onEdit={handleMessageEdit}
            onDelete={handleMessageDelete}
            onLinkSubmit={async (url: string) => {
              await files.handleLinkSubmit(url);
              return;
            }}
            onFileSelect={(file) => {
              // This handles file selection from Message component
              // Use the same approach as when selecting from the FileSidebar
              files.setSelectedFile(file);
            }}
          />
        }
        inputComponent={
          <ChatInput
            value={chat.currentMessage}
            onChange={chat.handleMessageChange}
            onSend={chat.handleSendMessage}
            disabled={chat.isProcessing || isLoadingSession || isCreatingSession}
          />
        }
        isMobile={isMobile}
        activeTab={activeTab}
        isLoading={isLoadingSession || isCreatingSession}
        loadingMessage={isCreatingSession ? 'Creating new conversation...' : 'Loading conversation...'}
        onTabChange={setActiveTab}
        rightSidebarWide={agentsSidebarTab === 'notes'}
      />

      <AnalysisModal
        modal={analysis.analysisModal}
        onClose={analysis.handleCloseAnalysis}
      />

      {/* Render the FileDetailModal when a file is selected */}
      {files.selectedFile && (
        <FileDetailModal 
          file={files.selectedFile} 
          onClose={() => files.setSelectedFile(null)}
          onSendMessage={chat.handleSendMessage}
          onFileQuickAction={handleFileQuickAction}
        />
      )}
    </>
  );
}
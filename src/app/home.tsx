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
import { AgentsSidebar } from '@/components/chat/AgentsSidebar';
import { AnalysisModal } from '@/components/chat/AnalysisModal';
import { Notification } from '@/components/chat/Notification';
import { ChatHistoryDropdown } from '@/components/chat/ChatHistoryDropdown';
import { MobileTabBar } from '@/components/chat/MobileTabBar';
import { ChatLayout } from '@/components/chat/ChatLayout';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';

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

// Update Message type to include citations
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
};

// Updating or adding the DatabaseMessage type
interface ExtendedDBMessage {
  role: string;
  content: string;
  created_at: string;
  timestamp?: string;
  id: string;
  session_id: string;
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
  
  // State for showing file info
  const [showFileInfo, setShowFileInfo] = useState(false);
  
  // State for showing agents sidebar
  const [showAgentsSidebar, setShowAgentsSidebar] = useState(false);
  
  // Vector store info combining from URL and from fetched data
  const [vectorStoreInfo, setVectorStoreInfo] = useState<{ id: string; fileCount?: number; type?: string; } | null>(vectorStoreInfoFromUrl);

  // State for notification
  const [notification, setNotification] = useState<string | null>(null);
  
  // New loading states for different operations
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(false);

  // Add seenAgents state
  const [seenAgents, setSeenAgents] = useState<Set<string>>(new Set(['Triage Agent']));
  
  // Mobile responsiveness
  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'files' | 'agents'>('chat');
  
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
      setNotification('Error: User ID is required. Please add ?user_id=YOUR_USER_ID to the URL.');
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
        } else if (!conversationIdParam && !chat.currentConversationId && sessions.length === 0) {
          // If there are no existing conversations, create a new one
          initializeConversation(userId);
        }
      });
    }
  }, [userId]);

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content)
      .then(() => {
        setNotification('Copied to clipboard!');
        setTimeout(() => setNotification(null), 2000);
      })
      .catch(() => {
        setNotification('Failed to copy to clipboard');
        setTimeout(() => setNotification(null), 2000);
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
      
      setNotification('New conversation created successfully');
      setTimeout(() => setNotification(null), 2000);
      
      return newSession.id;
    } catch (error) {
      console.error('Error creating new session:', error);
      setNotification('Failed to create new chat session: ' + (error instanceof Error ? error.message : String(error)));
      setTimeout(() => setNotification(null), 2000);
      return null;
    } finally {
      setIsCreatingSession(false);
      if (onInitializationComplete) {
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
      
      // Setup messages
      let messagesArray = chatSession.messages || [];
      if (!Array.isArray(messagesArray)) {
        console.error('Messages is not an array:', messagesArray);
        messagesArray = [];
      }
      
      // Map backend messages to frontend format and handle field name differences
      const messages = messagesArray.map((msg: any) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        name: msg.name || msg.agent_name,
        sessionId: msg.session_id || msg.chat_session_id, // Handle both formats
        timestamp: new Date(msg.created_at),
        agentName: msg.agent_name,
        metadata: msg.metadata
      }));
      
      console.log('Processed messages:', messages.length, 'messages');
      
      // Get vector store info if available
      const vectorStoreId = chatSession.vector_store_id;
      console.log('Vector store ID from session:', vectorStoreId);
      
      // Update state with the loaded conversation
      chat.setMessages(messages);
      chat.setShowWelcome(false);
      
      if (vectorStoreId) {
        files.setDefaultVectorStoreId(vectorStoreId);
        setVectorStoreInfo({
          id: vectorStoreId,
          fileCount: vectorStoreInfo?.fileCount,
          type: vectorStoreInfo?.type || 'Vector Store'
        });
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
      
      setNotification(`Loaded conversation: ${chatSession.title}`);
      setTimeout(() => setNotification(null), 2000);
      
      setIsLoadingSession(false);
      return true;
    } catch (error) {
      console.error('Error loading conversation:', error);
      setNotification('Failed to load conversation: ' + (error instanceof Error ? error.message : String(error)));
      setTimeout(() => setNotification(null), 2000);
      setIsLoadingSession(false);
      return false;
    }
  };

  // Add a helper function to get the backend URL
  const getBackendUrl = () => {
    return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5002';
  };

  // Update fetchFilesByVectorStoreId to handle refresh state
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
      
      if (filesList.length > 0) {
        const filesData = filesList.map((file: any) => {
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
      } else {
        files.setUploadedFiles([]);
      }
    } catch (e) {
      setNotification('Failed to load files');
      setTimeout(() => setNotification(null), 2000);
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
        
        // Convert database messages to our Message format
        const convertedMessages = data.messages
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
          .map((msg: ExtendedDBMessage) => {
            const message: Message = {
              role: msg.role as MessageRole,
              content: msg.content,
              timestamp: new Date(msg.created_at || msg.timestamp || Date.now()),
              id: msg.id,
              sessionId: msg.session_id
            };
            
            // Add agent name if available
            if (msg.agent_name) {
              message.agentName = msg.agent_name;
            }
            
            // Add metadata
            if (msg.metadata && typeof msg.metadata === 'object') {
              message.metadata = msg.metadata;
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
        setNotification(`Loaded conversation: ${session.title}`);
        setTimeout(() => setNotification(null), 2000);
      } else {
        throw new Error('Invalid message data format');
      }
    } catch (error) {
      setNotification('Failed to load chat history');
      setTimeout(() => setNotification(null), 2000);
    } finally {
      setIsLoadingSession(false);
    }
  };

  // Define utility functions with useCallback to maintain stability
  const handleActionSuccess = useCallback((message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 2000);
  }, []);

  const handleActionError = useCallback((message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 3000);
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
            onShowAnalysis={handleShowAnalysis}
            onToggleFileInfo={() => setShowFileInfo(!showFileInfo)}
            onFileDeleted={files.handleFileDeleted}
            onVectorStoreCreated={files.setDefaultVectorStoreId}
            onRefreshFiles={files.handleRefreshFiles}
            isRefreshing={files.isRefreshing}
          />
        }
        rightSidebar={
          <AgentsSidebar
            agents={agents.agents}
            showAgentsSidebar={showAgentsSidebar}
            onToggleAgentsSidebar={() => setShowAgentsSidebar(!showAgentsSidebar)}
            isLoadingAgents={agents.isLoadingAgents}
            onToggleAgentOrTool={handleToggleAgentOrTool}
            vectorStoreInfo={vectorStoreInfo}
            userId={userId}
            onAgentsUpdate={(updatedAgents) => agents.setAgents(updatedAgents)}
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
      />

      <AnalysisModal
        modal={analysis.analysisModal}
        onClose={analysis.handleCloseAnalysis}
      />

      <Notification 
        message={notification} 
        onClose={() => setNotification(null)} 
      />
    </>
  );
}
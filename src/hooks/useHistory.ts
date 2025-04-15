import { useState, useRef, useEffect, useCallback } from 'react';
import type { ChatSession } from '@/types/chat';

type ExtendedChatSession = ChatSession & {
  message_count?: number;
};

const getBackendUrl = () => {
  return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5002';
};

// Cache duration in milliseconds (5 seconds)
const CACHE_DURATION = 5000;

export function useHistory(userId: string | null) {
  const [chatHistory, setChatHistory] = useState<ExtendedChatSession[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);
  const [editSessionId, setEditSessionId] = useState<string | null>(null);
  const [editSessionTitle, setEditSessionTitle] = useState<string>('');
  const [isDeletingSession, setIsDeletingSession] = useState<string | null>(null);
  
  // Track last fetch time to prevent frequent fetches
  const lastFetchTime = useRef<number>(0);
  const cachedHistoryRef = useRef<ExtendedChatSession[]>([]);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingFetchRef = useRef<boolean>(false);
  
  // Fetch only session titles and basic info (light version)
  const fetchSessionTitlesFromApi = useCallback(async () => {
    if (!userId) return [];
    
    try {
      // Use titles_only=true parameter to fetch only titles
      const response = await fetch(`${getBackendUrl()}/api/chat-sessions?user_id=${encodeURIComponent(userId)}&titles_only=true`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch chat sessions: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data && data.chat_sessions && Array.isArray(data.chat_sessions)) {
        const sortedSessions = data.chat_sessions.sort((a: ChatSession, b: ChatSession) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        
        // Update the cache timestamp and data
        lastFetchTime.current = Date.now();
        cachedHistoryRef.current = sortedSessions;
        
        return sortedSessions;
      }
      return [];
    } catch (error) {
      console.error('Error fetching chat history titles:', error);
      return [];
    }
  }, [userId]);
  
  // Fetch full session details with message count when needed
  const fetchFullChatHistoryFromApi = useCallback(async () => {
    if (!userId) return [];
    
    try {
      const response = await fetch(`${getBackendUrl()}/api/chat-sessions?user_id=${encodeURIComponent(userId)}&include_message_count=true`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch chat sessions: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data && data.chat_sessions && Array.isArray(data.chat_sessions)) {
        const sortedSessions = data.chat_sessions.sort((a: ChatSession, b: ChatSession) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        return sortedSessions;
      }
      return [];
    } catch (error) {
      console.error('Error fetching full chat history:', error);
      return [];
    }
  }, [userId]);
  
  // Throttled fetch to avoid excessive API calls - by default only fetches titles
  const fetchChatHistory = useCallback(async (forceRefresh = false, fetchFullDetails = false) => {
    // Always return immediately if no user ID
    if (!userId) {
      setChatHistory([]);
      return [];
    }
    
    // If already loading and not forced, return cached data
    if (isLoadingHistory && !forceRefresh) {
      return cachedHistoryRef.current;
    }
    
    // Check if cache is valid (less than CACHE_DURATION ms old)
    const now = Date.now();
    const cacheAge = now - lastFetchTime.current;
    
    // If cache is valid and not forced, return cached data
    if (!forceRefresh && cacheAge < CACHE_DURATION && cachedHistoryRef.current.length > 0) {
      return cachedHistoryRef.current;
    }
    
    // Clear any pending fetch
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
      fetchTimeoutRef.current = null;
    }
    
    // If another fetch is already pending, just mark that we need another fetch
    if (pendingFetchRef.current && !forceRefresh) {
      return cachedHistoryRef.current;
    }
    
    setIsLoadingHistory(true);
    pendingFetchRef.current = true;
    
    try {
      // Either fetch full details or just titles
      const sessions = fetchFullDetails 
        ? await fetchFullChatHistoryFromApi()
        : await fetchSessionTitlesFromApi();
        
      setChatHistory(sessions);
      
      if (fetchFullDetails) {
        cachedHistoryRef.current = sessions;
        lastFetchTime.current = Date.now();
      }
      
      pendingFetchRef.current = false;
      setIsLoadingHistory(false);
      return sessions;
    } catch (error) {
      pendingFetchRef.current = false;
      setIsLoadingHistory(false);
      return cachedHistoryRef.current;
    }
  }, [userId, isLoadingHistory, fetchSessionTitlesFromApi, fetchFullChatHistoryFromApi]);
  
  // Get a single chat session by ID
  const fetchSessionById = useCallback(async (sessionId: string) => {
    if (!sessionId) return null;
    
    try {
      const response = await fetch(`${getBackendUrl()}/api/chat-sessions/${sessionId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch chat session: ${response.status}`);
      }
      
      const session = await response.json();
      return session;
    } catch (error) {
      console.error(`Error fetching chat session ${sessionId}:`, error);
      return null;
    }
  }, []);
  
  // Initialize history on mount or when userId changes - only fetch titles
  useEffect(() => {
    if (userId) {
      fetchChatHistory(false, false); // false = don't force refresh, false = don't fetch full details
    } else {
      setChatHistory([]);
    }
  }, [userId, fetchChatHistory]);

  const handleEditSessionTitle = async (sessionId: string, title: string) => {
    if (!sessionId) {
      return { success: false, message: 'Session ID is required' };
    }

    setEditSessionId(null);
    setEditSessionTitle('');

    try {
      const response = await fetch(`${getBackendUrl()}/api/chat-sessions/${sessionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title }),
      });

      if (!response.ok) {
        return { success: false, message: `Failed to update title: ${response.status}` };
      }

      // Update the session in local cache
      const updatedHistory = cachedHistoryRef.current.map(session => 
        session.id === sessionId ? { ...session, title } : session
      );
      cachedHistoryRef.current = updatedHistory;
      setChatHistory(updatedHistory);
      
      // Refresh after a delay to ensure db consistency - only titles
      setTimeout(() => fetchChatHistory(true, false), 500);
      
      return { success: true, message: 'Title updated successfully' };
    } catch (error) {
      return { success: false, message: 'Error updating title' };
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!sessionId) {
      return { success: false, message: 'Session ID is required' };
    }

    setIsDeletingSession(sessionId);

    try {
      const response = await fetch(`${getBackendUrl()}/api/chat-sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        setIsDeletingSession(null);
        return { success: false, message: `Failed to delete session: ${response.status}` };
      }

      // Update local cache immediately
      const updatedHistory = cachedHistoryRef.current.filter(session => session.id !== sessionId);
      cachedHistoryRef.current = updatedHistory;
      setChatHistory(updatedHistory);
      
      setIsDeletingSession(null);
      return { success: true, message: 'Session deleted successfully', deletedSessionId: sessionId };
    } catch (error) {
      setIsDeletingSession(null);
      return { success: false, message: 'Error deleting session' };
    }
  };

  return {
    // State
    chatHistory,
    isLoadingHistory,
    showHistoryDropdown,
    editSessionId,
    editSessionTitle,
    isDeletingSession,
    
    // State setters
    setChatHistory,
    setIsLoadingHistory,
    setShowHistoryDropdown,
    setEditSessionId,
    setEditSessionTitle,
    setIsDeletingSession,
    
    // Actions
    fetchChatHistory,
    fetchSessionById,
    handleEditSessionTitle,
    handleDeleteSession
  };
} 
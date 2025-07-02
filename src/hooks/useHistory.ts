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
const MIN_FETCH_INTERVAL = 2000; // Minimum 2 seconds between fetches

// Global tracking to prevent excessive API calls across all instances
let globalLastFetchTime = 0;
let globalFetchPromise: Promise<any> | null = null;
let globalUserId: string | null = null;

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
    
    // Global debounce check
    const now = Date.now();
    const timeSinceLastGlobalFetch = now - globalLastFetchTime;
    
    // If same user and too recent, return existing promise or cached data
    if (globalUserId === userId && timeSinceLastGlobalFetch < MIN_FETCH_INTERVAL) {
      console.log(`[useHistory] Debouncing API call for userId: ${userId}, last fetch was ${timeSinceLastGlobalFetch}ms ago`);
      if (globalFetchPromise) {
        return globalFetchPromise;
      }
      return cachedHistoryRef.current;
    }
    
    // Update global tracking
    globalLastFetchTime = now;
    globalUserId = userId;
    
    try {
      console.log(`[useHistory] Making API call for userId: ${userId}`);
      
      // Create and store the promise globally
      globalFetchPromise = fetch(`/api/chat-sessions?user_id=${encodeURIComponent(userId)}&titles_only=true`)
        .then(async (response) => {
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
        })
        .finally(() => {
          // Clear the global promise when done
          globalFetchPromise = null;
        });
      
      return await globalFetchPromise;
    } catch (error) {
      console.error('Error fetching chat history titles:', error);
      globalFetchPromise = null;
      return [];
    }
  }, [userId]);
  
  // Fetch full session details with message count when needed
  const fetchFullChatHistoryFromApi = useCallback(async () => {
    if (!userId) return [];
    
    try {
      // Use local API instead of proxy
      const response = await fetch(`/api/chat-sessions?user_id=${encodeURIComponent(userId)}&include_message_count=true`);
      
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
      // Use local API instead of proxy
      const response = await fetch(`/api/chat-sessions/${sessionId}`);
      
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
      console.log(`[useHistory] Fetching chat history for userId: ${userId}`);
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
      // Call the API to update the session title
      const response = await fetch(`/api/chat-sessions/${sessionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update session title');
      }

      const data = await response.json();
      
      if (data.success && data.chat_session) {
        // Update local cache with the response from the server
        const updatedHistory = cachedHistoryRef.current.map(session => 
          session.id === sessionId ? { ...session, title: data.chat_session.title } : session
        );
        cachedHistoryRef.current = updatedHistory;
        setChatHistory(updatedHistory);
        
        return { success: true, message: 'Title updated successfully' };
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Error updating session title:', error);
      return { success: false, message: `Error updating title: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!sessionId) {
      return { success: false, message: 'Session ID is required' };
    }

    setIsDeletingSession(sessionId);

    try {
      // Note: Session delete not implemented in local API yet
      console.warn('Session delete not implemented in local API yet');
      
      // For now, just update local cache
      const updatedHistory = cachedHistoryRef.current.filter(session => session.id !== sessionId);
      cachedHistoryRef.current = updatedHistory;
      setChatHistory(updatedHistory);
      
      setIsDeletingSession(null);
      return { success: true, message: 'Session deleted successfully (local only)', deletedSessionId: sessionId };
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
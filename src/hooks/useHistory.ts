import { useState, useRef } from 'react';
import type { ChatSession } from '@/types/chat';

type ExtendedChatSession = ChatSession & {
  message_count?: number;
};

const getBackendUrl = () => {
  return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5002';
};

export function useHistory(userId: string | null) {
  const [chatHistory, setChatHistory] = useState<ExtendedChatSession[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);
  const [editSessionId, setEditSessionId] = useState<string | null>(null);
  const [editSessionTitle, setEditSessionTitle] = useState<string>('');
  const [isDeletingSession, setIsDeletingSession] = useState<string | null>(null);
  
  // Track last fetch time to prevent frequent fetches
  const lastFetchTime = useRef<number>(0);
  
  // Throttled fetch to avoid excessive API calls
  const fetchChatHistory = async (forceRefresh = false) => {
    if (!userId) {
      return [];
    }
    
    if (isLoadingHistory && !forceRefresh) {
      return chatHistory;
    }
    
    setIsLoadingHistory(true);
    
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
        
        setChatHistory(sortedSessions);
        return sortedSessions;
      } else {
        setChatHistory([]);
        return [];
      }
    } catch (error) {
      console.error('Error fetching chat history:', error);
      return [];
    } finally {
      setIsLoadingHistory(false);
    }
  };

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

      // Update the chat history
      fetchChatHistory(true);
      
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

      // Update the chat history
      fetchChatHistory(true);
      
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
    handleEditSessionTitle,
    handleDeleteSession
  };
} 
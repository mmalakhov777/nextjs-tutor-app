import type { ChatSession } from '@/types/chat';

export interface ChatAccessResult {
  canAccess: boolean;
  shouldFork: boolean;
  shouldRedirect: boolean;
  redirectUrl?: string;
  message?: string;
}

export interface ForkChatResult {
  success: boolean;
  newSessionId?: string;
  originalTitle?: string;
  newTitle?: string;
  messageCount?: number;
  error?: string;
}

/**
 * Check if a user can access a chat session
 * @param chatSession - The chat session to check
 * @param currentUserId - The current user's ID
 * @returns Access result with instructions
 */
export function checkChatAccess(
  chatSession: ChatSession | null, 
  currentUserId: string | null
): ChatAccessResult {
  // If no chat session found
  if (!chatSession) {
    return {
      canAccess: false,
      shouldFork: false,
      shouldRedirect: false,
      message: 'Chat session not found'
    };
  }
  
  // If no current user, check if this is a shared public chat access
  if (!currentUserId) {
    return {
      canAccess: false,
      shouldFork: false,
      shouldRedirect: false,
      message: 'User not authenticated'
    };
  }
  
  // Special case: if user_id is "shared", they can only access public chats
  if (currentUserId === 'shared') {
    if (chatSession.visibility === 'public' || chatSession.is_public) {
      return {
        canAccess: true,
        shouldFork: false,
        shouldRedirect: false,
        message: 'Viewing shared public chat'
      };
    } else {
      return {
        canAccess: false,
        shouldFork: false,
        shouldRedirect: false,
        message: 'This chat is private and cannot be accessed via shared link'
      };
    }
  }
  
  // If it's the user's own chat
  if (chatSession.user_id === currentUserId) {
    return {
      canAccess: true,
      shouldFork: false,
      shouldRedirect: false
    };
  }
  
  // If it's a public chat
  if (chatSession.visibility === 'public' || chatSession.is_public) {
    return {
      canAccess: true,
      shouldFork: false,
      shouldRedirect: false,
      message: 'Viewing public chat'
    };
  }
  
  // If it's someone else's private chat - needs to be forked
  return {
    canAccess: false,
    shouldFork: true,
    shouldRedirect: true,
    message: 'This is a private chat. Creating your own copy...'
  };
}

/**
 * Fork a chat session for a user
 * @param originalSessionId - The original chat session ID
 * @param userId - The user who wants to fork the chat
 * @returns Fork result
 */
export async function forkChatSession(
  originalSessionId: string, 
  userId: string
): Promise<ForkChatResult> {
  try {
    const response = await fetch('/api/chat-sessions/fork', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        originalSessionId,
        userId
      }),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: result.error || 'Failed to fork chat session'
      };
    }
    
    return {
      success: true,
      newSessionId: result.newSessionId,
      originalTitle: result.originalTitle,
      newTitle: result.newTitle,
      messageCount: result.messageCount
    };
    
  } catch (error) {
    console.error('Error forking chat session:', error);
    return {
      success: false,
      error: 'Network error while forking chat'
    };
  }
}

/**
 * Handle chat access with automatic forking
 * @param sessionId - The chat session ID to access
 * @param currentUserId - The current user's ID
 * @param onSuccess - Callback for successful access
 * @param onFork - Callback for successful fork
 * @param onError - Callback for errors
 */
export async function handleChatAccess(
  sessionId: string,
  currentUserId: string | null,
  onSuccess?: (sessionId: string) => void,
  onFork?: (newSessionId: string, originalTitle: string) => void,
  onError?: (message: string) => void
) {
  try {
    // If no user ID, wait a bit and try again (user might still be initializing)
    if (!currentUserId) {
      // Try to get user_id from URL directly as fallback
      const urlParams = new URLSearchParams(window.location.search);
      const userIdFromUrl = urlParams.get('user_id');
      
      if (userIdFromUrl) {
        // Use the user ID from URL
        currentUserId = userIdFromUrl;
      } else {
        onError?.('User ID is required. Please add ?user_id=YOUR_USER_ID to the URL.');
        return;
      }
    }
    
    // First, try to get the chat session
    const response = await fetch(`/api/chat-sessions/${sessionId}`);
    
    if (!response.ok) {
      onError?.('Chat session not found');
      return;
    }
    
    const data = await response.json();
    const chatSession = data.chat_session;
    
    // Check access permissions
    const accessResult = checkChatAccess(chatSession, currentUserId);
    
    if (accessResult.canAccess) {
      // User can access the chat directly
      onSuccess?.(sessionId);
      return;
    }
    
    if (accessResult.shouldFork && currentUserId) {
      // Need to fork the chat
      const forkResult = await forkChatSession(sessionId, currentUserId);
      
      if (forkResult.success && forkResult.newSessionId) {
        onFork?.(forkResult.newSessionId, forkResult.originalTitle || 'Untitled');
        return;
      } else {
        onError?.(forkResult.error || 'Failed to create your own copy');
        return;
      }
    }
    
    // Default error case
    onError?.(accessResult.message || 'Cannot access this chat');
    
  } catch (error) {
    console.error('Error handling chat access:', error);
    onError?.('Error accessing chat session');
  }
} 
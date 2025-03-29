import { FiRefreshCw } from 'react-icons/fi';
import { RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChatHistoryDropdown } from '@/components/chat/ChatHistoryDropdown';
import type { ChatSession, HandleHistorySelectFn } from '@/types/chat';

interface ChatHeaderProps {
  currentAgent?: string;
  currentConversationId: string | null;
  isCreatingSession: boolean;
  showHistoryDropdown: boolean;
  isLoadingHistory: boolean;
  chatHistory: ChatSession[];
  editSessionId: string | null;
  editSessionTitle: string;
  isDeletingSession: string | null;
  userId: string | null;
  onReset: () => void;
  onToggleDropdown: () => void;
  onEditTitle: (sessionId: string, title: string) => Promise<void>;
  onDeleteSession: (sessionId: string) => Promise<void>;
  onSelectSession: HandleHistorySelectFn;
  onSetEditSessionId: (sessionId: string | null) => void;
  onSetEditSessionTitle: (title: string) => void;
}

export function ChatHeader({
  currentAgent,
  currentConversationId,
  isCreatingSession,
  showHistoryDropdown,
  isLoadingHistory,
  chatHistory,
  editSessionId,
  editSessionTitle,
  isDeletingSession,
  userId,
  onReset,
  onToggleDropdown,
  onEditTitle,
  onDeleteSession,
  onSelectSession,
  onSetEditSessionId,
  onSetEditSessionTitle
}: ChatHeaderProps) {
  return (
    <div 
      className="flex justify-end items-center h-[60px] px-4 bg-white"
      style={{ 
        borderBottom: '1px solid var(--light)',
        alignSelf: 'stretch',
        width: '100%'
      }}
    >
      <div className="flex items-center gap-2">
        <ChatHistoryDropdown
          isOpen={showHistoryDropdown}
          isLoading={isLoadingHistory}
          chatHistory={chatHistory}
          currentConversationId={currentConversationId}
          editSessionId={editSessionId}
          editSessionTitle={editSessionTitle}
          isDeletingSession={isDeletingSession}
          onToggleDropdown={onToggleDropdown}
          onEditTitle={onEditTitle}
          onDeleteSession={onDeleteSession}
          onSelectSession={onSelectSession}
          onSetEditSessionId={onSetEditSessionId}
          onSetEditSessionTitle={onSetEditSessionTitle}
        />
        <button
          onClick={onReset}
          disabled={isCreatingSession}
          title="Clear chat"
          style={{
            display: 'flex',
            height: '40px',
            padding: '8px',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '4px',
            borderRadius: '8px',
            border: '1px solid var(--light)',
            background: 'var(--white)',
            transition: 'all 0.2s ease-in-out',
            cursor: 'pointer'
          }}
          className={isCreatingSession ? 'opacity-70 cursor-not-allowed' : 'text-xs sm:text-sm'}
          onMouseOver={(e) => {
            if (!isCreatingSession) {
              e.currentTarget.style.background = 'var(--superlight)';
              e.currentTarget.style.borderColor = 'var(--normal)';
            }
          }}
          onMouseOut={(e) => {
            if (!isCreatingSession) {
              e.currentTarget.style.background = 'var(--white)';
              e.currentTarget.style.borderColor = 'var(--light)';
            }
          }}
        >
          {isCreatingSession ? (
            <>
              <div className="animate-spin h-3 w-3 border-2 border-blue-500 border-t-transparent rounded-full mr-1"></div>
              <span className="hidden sm:inline">Creating...</span>
              <span className="sm:hidden">New</span>
            </>
          ) : (
            <>
              <RefreshCw className="h-3 w-3" />
              <span className="hidden sm:inline">Clear</span>
              <span className="sm:hidden">New</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
} 
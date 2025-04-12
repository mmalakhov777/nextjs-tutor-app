import { FiRefreshCw, FiPlusCircle, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { RefreshCw, PlusCircle, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChatHistoryDropdown } from '@/components/chat/ChatHistoryDropdown';
import type { ChatSession, HandleHistorySelectFn } from '@/types/chat';
import { useRef, useEffect } from 'react';
import { LoadingSpinner } from '@/components/icons/LoadingSpinner';

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
  // Find current chat title from chatHistory
  const currentChat = chatHistory.find(chat => chat.id === currentConversationId);
  const chatTitle = currentChat?.title || "New Chat";
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      
      // Only process outside clicks when dropdown is open
      if (!showHistoryDropdown) return;
      
      // Close dropdown if clicking outside the dropdown and not on the title button
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        onToggleDropdown();
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showHistoryDropdown, onToggleDropdown]);
  
  return (
    <div 
      className="flex justify-between items-center h-[60px] px-4 bg-white"
      style={{ 
        borderBottom: '1px solid var(--light)',
        alignSelf: 'stretch',
        width: '100%'
      }}
    >
      {/* Left space for balance */}
      <div className="w-[100px]"></div>
      
      {/* Center - Chat name dropdown */}
      <div className="flex-1 flex justify-center relative">
        <button
          onClick={onToggleDropdown}
          className="flex items-center gap-1 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors"
        >
          <span className="font-medium truncate max-w-[200px]">{chatTitle}</span>
          <ChevronDown className="h-4 w-4" />
        </button>
        
        {showHistoryDropdown && (
          <div 
            ref={dropdownRef}
            className="absolute top-[50px] left-1/2 transform -translate-x-1/2 z-50"
            style={{
              width: '250px',
              padding: '8px',
              borderRadius: '12px',
              background: 'var(--Monochrome-Black, #232323)',
              boxShadow: '0px 0px 20px 0px rgba(203, 203, 203, 0.20)'
            }}
          >
            {isLoadingHistory ? (
              <div className="px-4 py-3 text-gray-200 text-center flex items-center justify-center">
                <LoadingSpinner color="#70D6FF" className="mr-2" />
                <span>Loading...</span>
              </div>
            ) : chatHistory.length > 0 ? (
              <div className="max-h-[300px] overflow-y-auto overflow-x-hidden custom-scrollbar">
                <style jsx global>{`
                  .custom-scrollbar::-webkit-scrollbar {
                    display: none;
                  }
                `}</style>
                {chatHistory.map((item) => (
                  <div key={item.id} className={`${isDeletingSession === item.id ? 'opacity-50' : ''}`}>
                    {editSessionId === item.id ? (
                      <div className="p-2 flex flex-col" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editSessionTitle}
                          onChange={(e) => onSetEditSessionTitle(e.target.value)}
                          className="w-full px-2 py-1 text-sm border rounded mb-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="Chat title"
                          autoFocus
                        />
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => onSetEditSessionId(null)}
                            className="px-2 py-1 text-xs text-gray-200 hover:text-white"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => onEditTitle(item.id, editSessionTitle)}
                            className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        className="group px-4 py-2 hover:bg-[#3C3C3C] rounded-md cursor-pointer"
                        style={{
                          background: item.id === currentConversationId ? 'var(--Monochrome-Black-Hover, #3C3C3C)' : ''
                        }}
                        onClick={() => {
                          if (item.id !== currentConversationId) {
                            onSelectSession(item);
                          }
                        }}
                      >
                        <div className="flex justify-between items-center">
                          <span className="truncate max-w-[160px] text-white">{item.title || 'Untitled'}</span>
                          <div className="hidden group-hover:flex space-x-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onSetEditSessionId(item.id);
                                onSetEditSessionTitle(item.title);
                              }}
                              className="p-1 text-gray-300 hover:text-white"
                              title="Edit"
                            >
                              <FiEdit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteSession(item.id);
                              }}
                              className="p-1 text-gray-300 hover:text-white"
                              title="Delete"
                              disabled={isDeletingSession === item.id}
                            >
                              {isDeletingSession === item.id ? (
                                <LoadingSpinner color="#FFFFFF" className="h-3.5 w-3.5" />
                              ) : (
                                <FiTrash2 className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-2 text-gray-200 text-center">No chat history</div>
            )}
          </div>
        )}
      </div>
      
      {/* Right - New chat button */}
      <div className="w-[100px] flex justify-end">
        <button
          onClick={onReset}
          disabled={isCreatingSession}
          title="New chat"
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
              <LoadingSpinner color="#3B82F6" className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">Creating...</span>
              <span className="sm:hidden">New</span>
            </>
          ) : (
            <>
              <PlusCircle className="h-3 w-3" />
              <span className="hidden sm:inline">New Chat</span>
              <span className="sm:hidden">New</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
} 
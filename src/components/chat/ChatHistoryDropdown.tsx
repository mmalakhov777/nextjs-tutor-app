import { useRef, useEffect } from 'react';
import { FiEdit2, FiTrash2, FiClock, FiMessageSquare } from 'react-icons/fi';
import type { ChatSession } from '@/types/chat';

interface ExtendedChatSession extends ChatSession {
  message_count?: number;
}

interface ChatHistoryDropdownProps {
  isOpen: boolean;
  isLoading: boolean;
  chatHistory: ExtendedChatSession[];
  currentConversationId: string | null;
  editSessionId: string | null;
  editSessionTitle: string;
  isDeletingSession: string | null;
  onToggleDropdown: () => void;
  onEditTitle: (sessionId: string, title: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onSelectSession: (session: ExtendedChatSession) => void;
  onSetEditSessionId: (sessionId: string | null) => void;
  onSetEditSessionTitle: (title: string) => void;
}

export function ChatHistoryDropdown({
  isOpen,
  isLoading,
  chatHistory,
  currentConversationId,
  editSessionId,
  editSessionTitle,
  isDeletingSession,
  onToggleDropdown,
  onEditTitle,
  onDeleteSession,
  onSelectSession,
  onSetEditSessionId,
  onSetEditSessionTitle,
}: ChatHistoryDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      
      // Only process outside clicks when dropdown is open
      if (!isOpen) return;
      
      // Allow clicking on the dropdown button
      if (buttonRef.current && buttonRef.current.contains(target)) {
        return;
      }
      
      // Close dropdown if clicking outside the dropdown
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        if (editSessionId) {
          onSetEditSessionId(null);
        } else {
          onToggleDropdown();
        }
      }
    }
    
    // Use mousedown instead of click for more reliable handling
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, editSessionId, onToggleDropdown, onSetEditSessionId]);

  // Handle clicking on the dropdown button explicitly
  const handleButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleDropdown();
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={handleButtonClick}
        disabled={isLoading}
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
          cursor: 'pointer',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
        }}
        className={isLoading ? 'opacity-70 cursor-not-allowed' : 'text-xs sm:text-sm'}
        onMouseOver={(e) => {
          if (!isLoading) {
            e.currentTarget.style.background = 'var(--superlight)';
            e.currentTarget.style.borderColor = 'var(--normal)';
          }
        }}
        onMouseOut={(e) => {
          if (!isLoading) {
            e.currentTarget.style.background = 'var(--white)';
            e.currentTarget.style.borderColor = 'var(--light)';
          }
        }}
      >
        {isLoading ? (
          <>
            <div className="animate-spin h-3 w-3 border-2 border-blue-500 border-t-transparent rounded-full mr-1"></div>
            <span>Loading...</span>
          </>
        ) : (
          <>
            <FiClock className="h-3 w-3" />
            <span>History</span>
          </>
        )}
      </button>
      
      {isOpen && (
        <div 
          ref={dropdownRef}
          className="absolute right-0 mt-2 overflow-x-hidden z-50"
          style={{
            display: 'flex',
            width: '180px',
            padding: '8px',
            flexDirection: 'column',
            alignItems: 'flex-start',
            borderRadius: '12px',
            background: 'var(--Monochrome-Black, #232323)',
            boxShadow: '0px 0px 20px 0px rgba(203, 203, 203, 0.20)',
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
          }}
        >
          <div className="py-1 w-full">
            {isLoading ? (
              <div className="px-4 py-3 text-gray-200 text-center flex items-center justify-center" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
                <svg className="animate-spin mr-2 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Loading conversations...</span>
              </div>
            ) : chatHistory.length > 0 ? (
              <div className="max-h-[300px] overflow-y-auto overflow-x-hidden scrollbar-hide">
                {chatHistory.map((item) => (
                  <div
                    key={item.id}
                    className={`${isDeletingSession === item.id ? 'opacity-50' : ''}`}
                  >
                    {editSessionId === item.id ? (
                      <div className="p-2 flex flex-col" data-editing="true" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editSessionTitle}
                          onChange={(e) => onSetEditSessionTitle(e.target.value)}
                          className="w-full px-2 py-1 text-sm border rounded mb-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}
                          placeholder="Chat title"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              onEditTitle(item.id, editSessionTitle);
                            } else if (e.key === 'Escape') {
                              onSetEditSessionId(null);
                            }
                            e.stopPropagation();
                          }}
                          autoFocus
                        />
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSetEditSessionId(null);
                            }}
                            className="px-2 py-1 text-xs text-deep hover:text-[#232323]"
                            style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditTitle(item.id, editSessionTitle);
                            }}
                            className="px-2 py-1 text-xs bg-blue-normal text-white rounded hover:bg-blue-medium"
                            style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="group relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (item.id !== currentConversationId && !editSessionId) {
                              onSelectSession(item);
                            }
                          }}
                          className="w-full px-4 py-2 text-left flex justify-between items-center"
                          style={{
                            borderRadius: '8px',
                            background: item.id === currentConversationId ? 'var(--Monochrome-Black-Hover, #3C3C3C)' : ''
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.background = 'var(--Monochrome-Black-Hover, #3C3C3C)';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.background = item.id === currentConversationId ? 'var(--Monochrome-Black-Hover, #3C3C3C)' : '';
                          }}
                          disabled={isDeletingSession === item.id}
                        >
                          <div className="flex flex-col">
                            <span className="truncate max-w-[150px]" style={{
                              color: 'var(--Monochrome-White, #FFF)',
                              fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                              fontSize: '14px',
                              fontStyle: 'normal',
                              fontWeight: 400,
                              lineHeight: '20px'
                            }}>{item.title || 'Untitled'}</span>
                            <div className="flex items-center justify-between text-xs text-gray-400 mt-0.5 w-full" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
                              <div className="flex items-center">
                                <FiMessageSquare className="h-3 w-3 mr-1" />
                                <span>{item.message_count || 0}</span>
                              </div>
                              <div className="flex items-center">
                                <span className="mx-1.5 text-gray-500">•</span>
                                <span className="text-xs text-gray-400 whitespace-nowrap">
                                  {new Date(item.created_at).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                        </button>
                        
                        <div className="absolute right-1 top-1/2 transform -translate-y-1/2 hidden group-hover:flex bg-white shadow-sm rounded border border-light">
                          <button
                            data-action="edit"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSetEditSessionId(item.id);
                              onSetEditSessionTitle(item.title);
                            }}
                            className="p-1 text-deep hover:text-blue-normal"
                            title="Edit chat title"
                            disabled={isDeletingSession === item.id}
                          >
                            <FiEdit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            data-action="delete"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteSession(item.id);
                            }}
                            className="p-1 text-deep hover:text-pink"
                            title="Delete chat"
                            disabled={isDeletingSession === item.id}
                          >
                            {isDeletingSession === item.id ? (
                              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-pink border-t-transparent" />
                            ) : (
                              <FiTrash2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-2 text-gray-200 text-center" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>No chat history found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 
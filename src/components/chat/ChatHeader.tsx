import { FiRefreshCw, FiPlusCircle, FiEdit2, FiTrash2, FiLayers, FiPlus, FiZap, FiSidebar, FiGlobe, FiLock, FiShare2 } from 'react-icons/fi';
import { RefreshCw, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChatHistoryDropdown } from '@/components/chat/ChatHistoryDropdown';
import type { ChatSession, HandleHistorySelectFn } from '@/types/chat';
import { useRef, useEffect, useState } from 'react';
import { LoadingSpinner } from '@/components/icons/LoadingSpinner';
import { NewChatIcon } from '@/components/icons/NewChatIcon';
import { useFileContext } from '@/contexts/FileContext';
import { clearAllFileMetadataFromStorage } from '@/utils/fileStorage';

// Define MSD global interface type
declare global {
  interface Window {
    MSD?: {
      getUser: () => Promise<{ 
        user?: { 
          subscription?: boolean | string;
          subscription_type?: string;
          is_subscription_cancelled?: boolean;
          subscription_valid_until?: string;
          has_paid?: boolean;
          [key: string]: any;  // Allow for any other properties
        } 
      }>;
      openSubscriptionDialog: (options: {
        isClosable: boolean;
        shouldVerifySubscriptionRetrieval: boolean;
        type: string;
        promoMode?: string;
        source?: string;
      }) => Promise<void>;
      sendAmpEvent?: (eventName: string, eventProperties?: Record<string, any>) => void;
    };
    // Add debug utilities
    show_limits_as_for_unsubscribed?: () => void;
    restore_subscription_state?: () => void;
    force_show_limits?: () => void;
    force_hide_limits?: () => void;
  }
}

const MESSAGE_LIMIT = 3;

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
  showAgentsSidebar?: boolean;
  showLeftSidebar?: boolean;
  onReset: () => void;
  onToggleDropdown: () => void;
  onToggleAgentsSidebar?: () => void;
  onToggleLeftSidebar?: () => void;
  onEditTitle: (sessionId: string, title: string) => Promise<void>;
  onDeleteSession: (sessionId: string) => Promise<void>;
  onSelectSession: HandleHistorySelectFn;
  onSetEditSessionId: (sessionId: string | null) => void;
  onSetEditSessionTitle: (title: string) => void;
  todayMessageCount?: number;
  onRefreshMessageCount?: () => Promise<void>;
  onResetSidebarTab?: () => void;
  // Props to check if sidebar has content
  noteParagraphs?: any[];
  flashCards?: any[];
  agentSlides?: any[];
  cvContent?: any;
  // New visibility props
  onToggleVisibility?: (sessionId: string, visibility: 'public' | 'private') => Promise<void>;
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
  showAgentsSidebar = false,
  showLeftSidebar = false,
  onReset,
  onToggleDropdown,
  onToggleAgentsSidebar,
  onToggleLeftSidebar,
  onEditTitle,
  onDeleteSession,
  onSelectSession,
  onSetEditSessionId,
  onSetEditSessionTitle,
  todayMessageCount,
  onRefreshMessageCount,
  onResetSidebarTab,
  noteParagraphs,
  flashCards,
  agentSlides,
  cvContent,
  onToggleVisibility
}: ChatHeaderProps) {
  // Find current chat title from chatHistory
  const currentChat = chatHistory.find(chat => chat.id === currentConversationId);
  const chatTitle = currentChat?.title || "New Chat";
  const chatVisibility = currentChat?.visibility || 'private';
  const isPublic = chatVisibility === 'public';
  const dropdownRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const { setUploadedFiles } = useFileContext();
  
  // State for visibility toggle loading
  const [isTogglingVisibility, setIsTogglingVisibility] = useState<boolean>(false);
  
  // State for responsive text visibility
  const [showButtonText, setShowButtonText] = useState<boolean>(true);
  const [headerWidth, setHeaderWidth] = useState<number>(0);
  
  // Function to check if sidebar has any content
  const hasSidebarContent = () => {
    // Check notes content
    const hasNotes = noteParagraphs && noteParagraphs.length > 0 && 
      noteParagraphs.some(p => p.content && p.content.trim() !== '' && p.content !== '<p></p>');
    
    // Check flashcards content
    const hasFlashCards = flashCards && flashCards.length > 0;
    
    // Check CV content
    const hasCV = cvContent !== null && cvContent !== undefined;
    
    // Check presentations content
    const hasPresentations = agentSlides && agentSlides.length > 0;
    
    return hasNotes || hasFlashCards || hasCV || hasPresentations;
  };
  
  // Message counting and subscription state variables
  const [isLoadingMessageCount, setIsLoadingMessageCount] = useState<boolean>(false);
  const [hasSubscription, setHasSubscription] = useState<boolean>(false);
  const [isCheckingSubscription, setIsCheckingSubscription] = useState<boolean>(true);
  
  // Use the passed todayMessageCount or default to 0
  const messageCount = todayMessageCount ?? 0;
  
  // Debug state to override subscription status
  const [debugOverrideSubscription, setDebugOverrideSubscription] = useState<boolean | null>(null);
  const [originalSubscriptionState, setOriginalSubscriptionState] = useState<boolean | null>(null);
  
  // Track if we've already shown the limit modal to prevent multiple triggers
  const [hasShownLimitModal, setHasShownLimitModal] = useState<boolean>(false);
  
  // Auto-trigger payment modal when limit is reached
  useEffect(() => {
    // Only trigger if:
    // 1. User has reached the limit (messageCount >= MESSAGE_LIMIT)
    // 2. User doesn't have subscription
    // 3. We haven't already shown the modal
    // 4. Not in debug override mode (unless forced to show limits)
    if (
      messageCount >= MESSAGE_LIMIT &&
      !hasSubscription &&
      !hasShownLimitModal &&
      debugOverrideSubscription !== true && // Don't trigger if debug is hiding limits
      !isCheckingSubscription // Don't trigger while still checking subscription
    ) {
      console.log('[ChatHeader] Message limit reached, auto-triggering payment modal');
      setHasShownLimitModal(true);
      
      // Trigger the payment modal with isClosable: false
      if (typeof window !== 'undefined' && window.MSD) {
        window.MSD.openSubscriptionDialog({
          isClosable: false, // User cannot close this modal
          shouldVerifySubscriptionRetrieval: true,
          type: "alt2",
          promoMode: 'after-close',
          source: 'chat-limit-reached'
        }).then(() => {
          // Check subscription status again after dialog closes
          window.MSD?.getUser().then(user => {
            const userHasSubscription = !!user?.user?.subscription;
            setHasSubscription(userHasSubscription);
            if (userHasSubscription) {
              console.log('[ChatHeader] User subscribed after limit modal');
            }
          }).catch(error => {
            console.error('[MSD] Error checking subscription after limit modal:', error);
          });
        }).catch(error => {
          console.error('[MSD] Error in auto-triggered subscription dialog:', error);
        });
      }
    }
  }, [messageCount, hasSubscription, hasShownLimitModal, debugOverrideSubscription, isCheckingSubscription]);
  
  // Reset the modal shown flag when subscription status changes or when starting a new session
  useEffect(() => {
    if (hasSubscription || currentConversationId) {
      setHasShownLimitModal(false);
    }
  }, [hasSubscription, currentConversationId]);
  
  // Check subscription status
  useEffect(() => {
    const checkSubscription = async () => {
      try {
        setIsCheckingSubscription(true);
        console.log('[ChatHeader] Starting subscription check');
        
        // Use the MSD global object to check subscription status
        if (typeof window !== 'undefined' && window.MSD) {
          try {
            const user = await window.MSD.getUser();
            console.log('[ChatHeader] MSD user data:', user);
            
            const userHasSubscription = !!user?.user?.subscription;
            console.log('[ChatHeader] User has subscription:', userHasSubscription);
            setHasSubscription(userHasSubscription);
          } catch (subscriptionError) {
            console.error('[MSD] Error getting user data:', subscriptionError);
            setHasSubscription(false);
          }
        } else {
          console.log('[ChatHeader] MSD not available, setting hasSubscription to false');
          setHasSubscription(false);
        }
      } catch (error) {
        console.error('[MSD] Error in subscription check flow:', error);
        setHasSubscription(false);
      } finally {
        console.log('[ChatHeader] Subscription check completed');
        setIsCheckingSubscription(false);
      }
    };
    
    checkSubscription();
  }, []);
  
  // Set up debug commands in window object for testing
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Command to simulate unsubscribed user
      window.show_limits_as_for_unsubscribed = () => {
        if (originalSubscriptionState === null) {
          setOriginalSubscriptionState(hasSubscription);
        }
        setDebugOverrideSubscription(false);
        console.log('Debug mode: Showing UI for unsubscribed user');
      };
      
      // Command to restore actual subscription state
      window.restore_subscription_state = () => {
        if (originalSubscriptionState !== null) {
          setDebugOverrideSubscription(null);
          console.log('Debug mode off: Showing actual subscription state');
        }
      };
      
      // Command to force show limits even with subscription
      window.force_show_limits = () => {
        setDebugOverrideSubscription(false);
        console.log('Force showing limits display');
      };
      
      // Command to hide limits
      window.force_hide_limits = () => {
        setDebugOverrideSubscription(true);
        console.log('Force hiding limits display');
      };
      
      // Cleanup
      return () => {
        window.show_limits_as_for_unsubscribed = undefined;
        window.restore_subscription_state = undefined;
        window.force_show_limits = undefined;
        window.force_hide_limits = undefined;
      };
    }
  }, [hasSubscription, originalSubscriptionState]);
  
  // Handler to open subscription dialog
  const handleGetUnlimited = async () => {
    try {
      if (typeof window !== 'undefined' && window.MSD) {
        await window.MSD.openSubscriptionDialog({
          isClosable: true, // User initiated, so allow closing
          shouldVerifySubscriptionRetrieval: true,
          type: "alt2",
          promoMode: 'after-close',
          source: 'chat'
        });
        
        // Check subscription status again after dialog closes
        try {
          const user = await window.MSD.getUser();
          const userHasSubscription = !!user?.user?.subscription;
          setHasSubscription(userHasSubscription);
        } catch (updateError) {
          console.error('[MSD] Error checking updated subscription:', updateError);
        }
      } else {
        console.error('[MSD] MSD not available for subscription dialog');
      }
    } catch (error) {
      console.error('[MSD] Error in subscription dialog flow:', error);
    }
  };
  
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      
      // Only process outside clicks when dropdown is open
      if (!showHistoryDropdown) return;
      
      // Don't interfere with button clicks - check if the target is a button or inside a button
      const isButton = target instanceof HTMLElement && (
        target.tagName === 'BUTTON' || 
        target.closest('button') !== null
      );
      
      if (isButton) return;
      
      // Close dropdown if clicking outside the dropdown and not on the title button
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        onToggleDropdown();
      }
    }
    
    // Only add the event listener when the dropdown is open
    if (showHistoryDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showHistoryDropdown, onToggleDropdown]);
  
  // Use the robust utility to clear all file metadata from localStorage
  const clearAllFileMetadata = () => {
    clearAllFileMetadataFromStorage();
    setUploadedFiles([]);
    console.log('All file metadata cleared from local storage');
  };
  
  // Handle visibility toggle
  const handleToggleVisibility = async () => {
    console.log('[ChatHeader] Visibility toggle clicked', {
      currentConversationId,
      onToggleVisibility: !!onToggleVisibility,
      isTogglingVisibility,
      currentVisibility: chatVisibility,
      isPublic
    });
    
    if (!currentConversationId || !onToggleVisibility || isTogglingVisibility) {
      console.log('[ChatHeader] Visibility toggle aborted - missing requirements');
      return;
    }
    
    setIsTogglingVisibility(true);
    try {
      const newVisibility = isPublic ? 'private' : 'public';
      console.log('[ChatHeader] Calling onToggleVisibility with:', newVisibility);
      await onToggleVisibility(currentConversationId, newVisibility);
      console.log('[ChatHeader] Visibility toggle completed successfully');
    } catch (error) {
      console.error('Error toggling visibility:', error);
    } finally {
      setIsTogglingVisibility(false);
    }
  };
  
  // Handle copy public URL
  const handleCopyPublicUrl = async () => {
    if (!currentConversationId || !isPublic) return;
    
    try {
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const baseUrl = isLocal ? `${window.location.protocol}//${window.location.host}` : 'https://mystylus.ai';
      const path = isLocal ? '' : '/chat-agents';
      
      // Use the standard chat URL format with conversation_id parameter
      // This will work with the existing chat access control system
      const shareUrl = `${baseUrl}${path}/chat?conversation_id=${currentConversationId}&user_id=shared`;
      
      await navigator.clipboard.writeText(shareUrl);
      // You could add a toast notification here
      console.log('Public URL copied to clipboard:', shareUrl);
    } catch (error) {
      console.error('Failed to copy public URL:', error);
    }
  };

  // Use ResizeObserver to detect header width and adjust text visibility
  useEffect(() => {
    if (!headerRef.current) return;
    
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        setHeaderWidth(width);
        
        // Calculate minimum widths needed for different configurations
        const buttonsCount = [
          !hasSubscription || debugOverrideSubscription === false, // Limits button
          currentConversationId && onToggleVisibility, // Visibility button
          currentConversationId && isPublic, // Share button
          true, // New Chat button
          onToggleAgentsSidebar && !showAgentsSidebar && hasSidebarContent() // Assets button
        ].filter(Boolean).length;
        
        // Base width calculations:
        // Left section: 150px (limits)
        // Center section: 200px (title dropdown)
        // Right section: buttonsCount * 120px (with text) or buttonsCount * 56px (icon only)
        // Plus padding: 32px (16px each side)
        const minWidthWithText = 150 + 200 + (buttonsCount * 120) + 32;
        
        // Show text only if we have enough space
        setShowButtonText(width >= minWidthWithText);
      }
    });
    
    resizeObserver.observe(headerRef.current);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, [hasSubscription, debugOverrideSubscription, currentConversationId, onToggleVisibility, isPublic, onToggleAgentsSidebar, showAgentsSidebar]);

  return (
    <div 
      ref={headerRef}
      className="flex justify-between items-center h-[60px] px-4 bg-white"
      style={{ 
        borderBottom: '1px solid var(--light)',
        alignSelf: 'stretch',
        width: '100%'
      }}
    >
      {/* Left - Compact limits display */}
      <div className="flex-shrink-0 flex items-center gap-2">
        {(isCheckingSubscription || !hasSubscription || debugOverrideSubscription === false) && (
          <button
            onClick={handleGetUnlimited}
            title={`Today: ${messageCount}/${MESSAGE_LIMIT} messages`}
            style={{
              display: 'flex',
              height: '40px',
              width: showButtonText ? 'auto' : '40px',
              padding: showButtonText ? '8px 12px' : '8px',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '6px',
              borderRadius: '8px',
              border: '1px solid var(--light)',
              background: 'white',
              transition: 'all 0.2s ease-in-out',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              pointerEvents: 'auto',
              position: 'relative',
              zIndex: 1
            }}
            className="text-xs sm:text-sm"
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#FED770';
              e.currentTarget.style.borderColor = 'var(--normal)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'white';
              e.currentTarget.style.borderColor = 'var(--light)';
            }}
          >
            {isLoadingMessageCount ? (
              <span className="inline-block w-3 h-3 bg-slate-200 animate-pulse rounded flex-shrink-0"></span>
            ) : (
              <FiZap className="h-4 w-4 flex-shrink-0" />
            )}
            {/* Show text only when there's enough space */}
            {showButtonText && (
              <span>
                {isCheckingSubscription ? (
                  "Loading..."
                ) : (
                  `${messageCount}/${MESSAGE_LIMIT}`
                )}
              </span>
            )}
          </button>
        )}
      </div>
      
      {/* Center - Chat name dropdown */}
      <div className="flex-1 flex justify-center relative min-w-0 mx-2">
        <button
          onClick={onToggleDropdown}
          className="flex items-center gap-1 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors max-w-full"
          style={{
            // Adjust position to account for right-side buttons to keep title truly centered
            marginLeft: (() => {
              // Count visible buttons on the right
              let rightButtonsCount = 1; // Always have "New Chat" button
              if (currentConversationId && onToggleVisibility) rightButtonsCount++; // Visibility button
              if (currentConversationId && isPublic) rightButtonsCount++; // Share button  
              if (onToggleAgentsSidebar && !showAgentsSidebar && hasSidebarContent()) rightButtonsCount++; // Assets button
              
              // Each button is approximately 56px when icon-only, 120px when with text
              const buttonWidth = showButtonText ? 120 : 56;
              const totalRightWidth = rightButtonsCount * buttonWidth + (rightButtonsCount - 1) * 8; // 8px gap between buttons
              
              // Left side only has limits button when visible
              const hasLimitsButton = !hasSubscription || debugOverrideSubscription === false;
              const leftWidth = hasLimitsButton ? (showButtonText ? 120 : 56) : 0;
              
              // Calculate offset to center the title
              const offset = (totalRightWidth - leftWidth) / 2;
              return `${Math.max(0, offset)}px`;
            })()
          }}
        >
          <span
            className="font-medium truncate"
            style={{
              maxWidth: showButtonText ? '200px' : '100px',
              display: 'block',
            }}
          >
            {chatTitle}
          </span>
          <ChevronDown className="h-4 w-4 flex-shrink-0" />
        </button>
        
        {showHistoryDropdown && (
          <div 
            ref={dropdownRef}
            className="absolute top-[50px] left-1/2 transform -translate-x-1/2 z-[9999]"
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
              <div className="max-h-[300px] overflow-y-auto overflow-x-hidden scrollbar-hide">
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
      
      {/* Right - Visibility toggle and New chat button */}
      <div className="flex-shrink-0 flex justify-end gap-2">
        {/* Visibility Toggle Button - only show if there's a current conversation */}
        {currentConversationId && onToggleVisibility && (
          <button
            onClick={handleToggleVisibility}
            disabled={isTogglingVisibility}
            title={isPublic ? "Make chat private" : "Make chat public"}
            style={{
              display: 'flex',
              height: '40px',
              width: showButtonText ? 'auto' : '40px',
              padding: showButtonText ? '8px 12px' : '8px',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '6px',
              borderRadius: '8px',
              border: '1px solid var(--light)',
              background: isPublic ? '#FED770' : 'var(--white)',
              transition: 'all 0.2s ease-in-out',
              cursor: isTogglingVisibility ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap',
              pointerEvents: 'auto',
              position: 'relative',
              zIndex: 1
            }}
            className={isTogglingVisibility ? 'opacity-70' : 'text-xs sm:text-sm'}
            onMouseEnter={(e) => {
              if (!isTogglingVisibility) {
                e.currentTarget.style.background = isPublic ? '#FED770' : 'var(--superlight)';
                e.currentTarget.style.borderColor = 'var(--normal)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isTogglingVisibility) {
                e.currentTarget.style.background = isPublic ? '#FED770' : 'var(--white)';
                e.currentTarget.style.borderColor = 'var(--light)';
              }
            }}
          >
            {isTogglingVisibility ? (
              <>
                <LoadingSpinner color="#3B82F6" className="h-4 w-4 flex-shrink-0" />
                {showButtonText && <span>Updating...</span>}
              </>
            ) : (
              <>
                {isPublic ? (
                  <FiGlobe className="h-4 w-4 flex-shrink-0" />
                ) : (
                  <FiLock className="h-4 w-4 flex-shrink-0" />
                )}
                {showButtonText && (
                  <span>
                    {isPublic ? 'Public' : 'Private'}
                  </span>
                )}
              </>
            )}
          </button>
        )}
        
        {/* Share Button - only show if chat is public */}
        {currentConversationId && isPublic && (
          <button
            onClick={handleCopyPublicUrl}
            title="Copy public link"
            style={{
              display: 'flex',
              height: '40px',
              width: showButtonText ? 'auto' : '40px',
              padding: showButtonText ? '8px 12px' : '8px',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '6px',
              borderRadius: '8px',
              border: '1px solid var(--light)',
              background: 'var(--white)',
              transition: 'all 0.2s ease-in-out',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              pointerEvents: 'auto',
              position: 'relative',
              zIndex: 1
            }}
            className="text-xs sm:text-sm"
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--superlight)';
              e.currentTarget.style.borderColor = 'var(--normal)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--white)';
              e.currentTarget.style.borderColor = 'var(--light)';
            }}
          >
            <FiShare2 className="h-4 w-4 flex-shrink-0" />
            {showButtonText && <span>Share</span>}
          </button>
        )}

        {/* New Chat Button */}
        <button
          onClick={() => {
            // Reset sidebar tab to show "Start Creating" state
            if (onResetSidebarTab) {
              onResetSidebarTab();
            }
            // Close AgentsSidebar if it's open
            if (showAgentsSidebar && onToggleAgentsSidebar) {
              onToggleAgentsSidebar();
            }
            // Close FileSidebar if it's open
            if (showLeftSidebar && onToggleLeftSidebar) {
              onToggleLeftSidebar();
            }
            clearAllFileMetadata();
            
            // Clean URL parameters to avoid re-triggering
            console.log('[ChatHeader] Cleaning URL parameters on New Chat click');
            console.log('[ChatHeader] Current URL:', window.location.href);
            
            // Parse URL to get user_id first
            const url = new URL(window.location.href);
            const userId = url.searchParams.get('user_id');
            
            // Create a completely new clean URL with only user_id
            // This approach handles malformed parameters better
            const cleanUrl = new URL(window.location.origin + window.location.pathname);
            
            if (userId) {
              cleanUrl.searchParams.set('user_id', userId);
              console.log('[ChatHeader] New clean URL:', cleanUrl.toString());
            } else {
              console.log('[ChatHeader] No user_id, using base path:', cleanUrl.toString());
            }
            
            // Replace the entire URL, removing ALL parameters except user_id
            window.history.replaceState({}, '', cleanUrl.toString());
            
            onReset();
          }}
          disabled={isCreatingSession}
          title="New chat"
          style={{
            display: 'flex',
            height: '40px',
            width: showButtonText ? 'auto' : '40px',
            padding: showButtonText ? '8px 12px' : '8px',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '6px',
            borderRadius: '8px',
            border: '1px solid var(--light)',
            background: 'var(--white)',
            transition: 'all 0.2s ease-in-out',
            cursor: isCreatingSession ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap',
            pointerEvents: 'auto',
            position: 'relative',
            zIndex: 1
          }}
          className={isCreatingSession ? 'opacity-70' : 'text-xs sm:text-sm'}
          onMouseEnter={(e) => {
            if (!isCreatingSession) {
              e.currentTarget.style.background = 'var(--superlight)';
              e.currentTarget.style.borderColor = 'var(--normal)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isCreatingSession) {
              e.currentTarget.style.background = 'var(--white)';
              e.currentTarget.style.borderColor = 'var(--light)';
            }
          }}
        >
          {isCreatingSession ? (
            <>
              <LoadingSpinner color="#3B82F6" className="h-4 w-4 flex-shrink-0" />
              {showButtonText && <span>Creating...</span>}
            </>
          ) : (
            <>
              <FiPlus className="h-4 w-4 flex-shrink-0" />
              {showButtonText && <span>New Chat</span>}
            </>
          )}
        </button>

        {/* Toggle Agents Sidebar Button - only show if there's content */}
        {onToggleAgentsSidebar && !showAgentsSidebar && hasSidebarContent() && (
          <button
            onClick={onToggleAgentsSidebar}
            title={showAgentsSidebar ? "Hide sidebar" : "Show sidebar"}
            style={{
              display: 'flex',
              height: '40px',
              width: showButtonText ? 'auto' : '40px',
              padding: showButtonText ? '8px 12px' : '8px',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '6px',
              borderRadius: '8px',
              border: '1px solid var(--light)',
              background: showAgentsSidebar ? 'var(--superlight)' : 'var(--white)',
              transition: 'all 0.2s ease-in-out',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              pointerEvents: 'auto',
              position: 'relative',
              zIndex: 1
            }}
            className="text-xs sm:text-sm"
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--superlight)';
              e.currentTarget.style.borderColor = 'var(--normal)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = showAgentsSidebar ? 'var(--superlight)' : 'var(--white)';
              e.currentTarget.style.borderColor = 'var(--light)';
            }}
          >
            <FiLayers className="h-4 w-4 flex-shrink-0" />
            {showButtonText && (
              <span>
                Assets ({[
                  noteParagraphs && noteParagraphs.length > 0 && noteParagraphs.some(p => p.content && p.content.trim() !== '' && p.content !== '<p></p>'),
                  flashCards && flashCards.length > 0,
                  cvContent !== null && cvContent !== undefined,
                  agentSlides && agentSlides.length > 0
                ].filter(Boolean).length})
              </span>
            )}
          </button>
        )}
      </div>
    </div>
  );
} 
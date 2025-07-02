import React, { ReactNode } from 'react';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { MobileTabBar } from '@/components/chat/MobileTabBar';
import { cn } from '@/lib/utils';

// Style for scrollbar positioning
const scrollbarStyles = `
  .scrollbar-at-edge {
    scrollbar-gutter: stable;
    scrollbar-width: thin;
    /* Optimize for smooth scrolling performance */
    will-change: scroll-position;
    transform: translateZ(0); /* Force hardware acceleration */
  }
  
  /* For webkit browsers like Chrome/Safari */
  .scrollbar-at-edge::-webkit-scrollbar {
    width: 8px;
  }
  
  .scrollbar-at-edge::-webkit-scrollbar-track {
    background: transparent;
  }
  
  .scrollbar-at-edge::-webkit-scrollbar-thumb {
    background-color: rgba(35, 35, 35, 0.2);
    border-radius: 20px;
  }

  /* Optimize streaming content rendering */
  .streaming-content {
    contain: layout style paint;
    will-change: contents;
  }

  /* Smooth transitions for message appearance */
  .message-container {
    transition: opacity 0.2s ease-in-out;
  }

  /* Reduce layout thrashing during streaming */
  .message-content {
    contain: layout style;
  }

  /* Optimize animations */
  .animate-pulse {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: .5;
    }
  }
`;

interface ChatLayoutProps {
  header: ReactNode;
  leftSidebar: ReactNode;
  rightSidebar: ReactNode;
  content: ReactNode;
  inputComponent?: ReactNode;
  isMobile: boolean;
  activeTab: 'chat' | 'files' | 'assets';
  isLoading: boolean;
  loadingMessage: string;
  onTabChange: (tab: 'chat' | 'files' | 'assets') => void;
  chatPadding?: string;
  rightSidebarWide?: boolean;
  rightSidebarExtraWide?: boolean;
  leftSidebarWide?: boolean;
  showRightSidebar?: boolean;
  showLeftSidebar?: boolean;
  isLeftSidebarExpanded?: boolean;
  isRightSidebarExpanded?: boolean;
  researchLoadingIndicator?: ReactNode;
  // Assets count props for mobile tabs
  noteParagraphs?: Array<{ content?: string }>;
  flashCards?: Array<any>;
  cvContent?: any;
  agentSlides?: Array<any>;
}

export function ChatLayout({
  header,
  leftSidebar,
  rightSidebar,
  content,
  inputComponent,
  isMobile,
  activeTab,
  isLoading,
  loadingMessage,
  onTabChange,
  chatPadding = "",
  rightSidebarWide = false,
  rightSidebarExtraWide = false,
  leftSidebarWide = false,
  showRightSidebar = false,
  showLeftSidebar = false,
  isLeftSidebarExpanded = false,
  isRightSidebarExpanded = false,
  researchLoadingIndicator,
  noteParagraphs,
  flashCards,
  cvContent,
  agentSlides
}: ChatLayoutProps) {
  // Calculate if assets exist
  const hasAssets = React.useMemo(() => {
    const availableAssets = [
      {
        exists: noteParagraphs && noteParagraphs.length > 0 && noteParagraphs.some(p => p.content && p.content.trim() !== '' && p.content !== '<p></p>')
      },
      {
        exists: flashCards && flashCards.length > 0
      },
      {
        exists: cvContent !== null && cvContent !== undefined
      },
      {
        exists: agentSlides && agentSlides.length > 0
      }
    ].filter(asset => asset.exists);
    
    return availableAssets.length > 0;
  }, [noteParagraphs, flashCards, cvContent, agentSlides]);

  // Auto-switch away from assets tab if no assets exist
  React.useEffect(() => {
    if (isMobile && activeTab === 'assets' && !hasAssets) {
      onTabChange('chat');
    }
  }, [isMobile, activeTab, hasAssets, onTabChange]);
  const rightSidebarWidth = rightSidebarExtraWide ? "w-[37.5rem]" : (rightSidebarWide ? "w-96" : "w-64");
  const leftSidebarWidth = leftSidebarWide ? "w-96" : "w-64";
  
  // Default padding when AgentsSidebar is hidden
  const getDefaultPadding = () => {
    if (isMobile) return "4px 4px 0px 4px";
    if (rightSidebarExtraWide) return "40px 120px 24px 120px";
    if (rightSidebarWide) return "40px 120px 24px 120px";
    if (showRightSidebar) return "40px 120px 24px 120px";
    return "40px 120px 24px 120px";
  };

  const getDefaultInputPadding = () => {
    if (isMobile) return "0px 4px 4px 4px";
    if (rightSidebarExtraWide) return "px-8 pb-2";
    if (showRightSidebar) return "px-20 pb-2";
    // When AgentsSidebar is hidden by default, use the specific padding
    return "px-20 pb-2";
  };
  
  // Calculate chat area padding based on sidebar states
  const getChatAreaPadding = () => {
    // Let ChatMessages handle its own dynamic padding based on available space
    return "0px";
  };
  
  // Calculate input area padding based on sidebar states
  const getInputAreaPadding = () => {
    // Let ChatInput handle its own dynamic padding based on available space
    return "0px";
  };
  
  return (
    <div className="flex flex-col lg:flex-row h-screen bg-white overflow-hidden">
      {/* Left Sidebar - Only visible on desktop and when right sidebar is not expanded */}
      {!isMobile && showLeftSidebar && leftSidebar && !isRightSidebarExpanded && (
        <div className={`${isLeftSidebarExpanded ? 'w-full' : leftSidebarWidth} border-r border-slate-200 bg-white hidden lg:block transition-all duration-300`}>
          {leftSidebar}
        </div>
      )}

      {/* Main Content Area - Hidden when sidebar is expanded */}
      {!isLeftSidebarExpanded && !isRightSidebarExpanded && (
        <div className="flex-1 flex flex-col relative min-w-0 max-h-screen">
        {/* Header - Always visible and fixed */}
        <div className="flex-shrink-0">
          {header}
        </div>

        {/* Mobile Tab Navigation - Moved above content */}
        {isMobile && (
          <MobileTabBar 
            activeTab={activeTab} 
            onTabChange={onTabChange}
            noteParagraphs={noteParagraphs}
            flashCards={flashCards}
            cvContent={cvContent}
            agentSlides={agentSlides}
          />
        )}

        {/* Content Area - Conditional rendering based on mobile tabs */}
        {(!isMobile || (isMobile && activeTab === 'chat')) && (
          <div className="flex-1 h-[calc(100vh-60px)] overflow-hidden flex flex-col relative">
            {/* Messages container - takes remaining space above input */}
            <div className="flex-1 overflow-y-auto scrollbar-hide min-h-0">
              <div 
                className="w-full"
                style={{
                  padding: getChatAreaPadding()
                }}
              >
                {content}
              </div>
            </div>
            
            {/* Input component - Fixed height at bottom */}
            {inputComponent && (
              <div
                className="flex-shrink-0 bg-white/95 backdrop-blur-sm"
                style={{
                  padding: getInputAreaPadding()
                }}
              >
                {inputComponent}
              </div>
            )}
            
            <style jsx global>{scrollbarStyles}</style>
          </div>
        )}
        
        {/* Files Tab - Only visible on mobile when active */}
        {isMobile && activeTab === 'files' && (
          <div className="flex-1 overflow-hidden bg-white">
            {leftSidebar}
          </div>
        )}
        
        {/* Assets Tab - Only visible on mobile when active */}
        {isMobile && activeTab === 'assets' && (
          <div className="flex-1 overflow-hidden">
            {rightSidebar}
          </div>
        )}
        

        
        {/* Loading Overlay */}
        {isLoading && (researchLoadingIndicator ? (
          researchLoadingIndicator
        ) : (
          <LoadingOverlay 
            isVisible={isLoading}
            message={loadingMessage}
          />
        ))}
        </div>
      )}

      {/* Right Sidebar - Only visible on desktop and when left sidebar is not expanded */}
      {!isMobile && showRightSidebar && !isLeftSidebarExpanded && (
        <div className={`${isRightSidebarExpanded ? 'w-full' : rightSidebarWidth} border-l border-slate-200 bg-white hidden lg:block transition-all duration-300`}>
          {rightSidebar}
        </div>
      )}
    </div>
  );
} 
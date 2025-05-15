import { ReactNode } from 'react';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { MobileTabBar } from '@/components/chat/MobileTabBar';
import { cn } from '@/lib/utils';

// Style for scrollbar positioning
const scrollbarStyles = `
  .scrollbar-at-edge {
    scrollbar-gutter: stable;
    scrollbar-width: thin;
  }
  
  /* For webkit browsers like Chrome/Safari */
  .scrollbar-at-edge::-webkit-scrollbar {
    width: 8px;
  }
  
  .scrollbar-at-edge::-webkit-scrollbar-track {
    background: transparent;
  }
  
  .scrollbar-at-edge::-webkit-scrollbar-thumb {
    background-color: rgba(0, 0, 0, 0.2);
    border-radius: 20px;
  }
`;

interface ChatLayoutProps {
  header: ReactNode;
  leftSidebar: ReactNode;
  rightSidebar: ReactNode;
  content: ReactNode;
  inputComponent?: ReactNode;
  isMobile: boolean;
  activeTab: 'chat' | 'files' | 'agents' | 'scenarios';
  isLoading: boolean;
  loadingMessage: string;
  onTabChange: (tab: 'chat' | 'files' | 'agents' | 'scenarios') => void;
  chatPadding?: string;
  rightSidebarWide?: boolean;
  researchLoadingIndicator?: ReactNode;
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
  researchLoadingIndicator
}: ChatLayoutProps) {
  const rightSidebarWidth = rightSidebarWide ? "w-96" : "w-64";
  
  return (
    <div className="flex flex-col lg:flex-row h-screen bg-white overflow-hidden">
      {/* Left Sidebar - Only visible on desktop */}
      {!isMobile && (
        <div className="w-64 border-r border-slate-200 bg-white hidden lg:block">
          {leftSidebar}
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative min-w-0 max-h-screen">
        {/* Header - Always visible and fixed */}
        <div className="flex-shrink-0">
          {header}
        </div>

        {/* Mobile Tab Navigation - Moved above content */}
        {isMobile && (
          <MobileTabBar activeTab={activeTab} onTabChange={onTabChange} />
        )}

        {/* Content Area - Conditional rendering based on mobile tabs */}
        {(!isMobile || (isMobile && activeTab === 'chat')) && (
          <div className="flex-1 h-[calc(100vh-60px)] overflow-hidden flex flex-col relative">
            {/* Outer container with scrollbar at edge */}
            <div className="flex-1 overflow-y-auto scrollbar-at-edge min-h-0 pb-16">
              {/* Inner container with padding */}
              <div className={cn("w-full", isMobile ? "pt-4" : (chatPadding || "px-20"))}>
                {content}
              </div>
            </div>
            
            {/* Input component - Fixed at the bottom of chat */}
            {inputComponent && (
              <div className={cn(
                "fixed bottom-0 left-0 right-0 lg:left-64 z-10 bg-transparent transition-all duration-300", 
                isMobile ? "px-2 py-2" : "px-20 py-3",
                rightSidebarWide ? "lg:right-96" : "lg:right-64" 
              )}>
                {inputComponent}
              </div>
            )}
            
            <style jsx global>{scrollbarStyles}</style>
          </div>
        )}
        
        {/* Files Tab - Only visible on mobile when active */}
        {isMobile && activeTab === 'files' && (
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              {leftSidebar}
            </div>
          </div>
        )}
        
        {/* Agents Tab - Only visible on mobile when active */}
        {isMobile && activeTab === 'agents' && (
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              {rightSidebar}
            </div>
          </div>
        )}
        
        {/* Scenarios Tab - Only visible on mobile when active */}
        {isMobile && activeTab === 'scenarios' && (
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              {rightSidebar}
            </div>
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

      {/* Right Sidebar - Only visible on desktop */}
      {!isMobile && (
        <div className={`${rightSidebarWidth} border-l border-slate-200 bg-white hidden lg:block transition-all duration-300`}>
          {rightSidebar}
        </div>
      )}
    </div>
  );
} 
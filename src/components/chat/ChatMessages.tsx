import { useRef, useMemo, useState, useEffect } from 'react';
import type { ChatMessagesProps, UploadedFile } from '@/types/chat';
import type { Message as MessageType } from '@/types/chat';
import { Message } from './Message';
import { WelcomeIcon } from '@/components/icons/WelcomeIcon';
import { LoadingIndicator } from './LoadingIndicator';
import ResearchLoadingIndicator from './ResearchLoadingIndicator';
import { PublicSessionsShowcase } from './PublicSessionsShowcase';
import { ChevronDown, ChevronRight, Wrench, BarChart3, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ToolCallDisplay } from './ToolCallDisplay';

// Inline WelcomeMessage component since the import is missing
const WelcomeMessage = ({ 
  size = 'large', 
  scenario = null,
  inputComponent = null,
  onPublicSessionClick = undefined,
  showShowcase = true,
  hasConversation = false
}: { 
  size?: 'small' | 'large';
  scenario?: {
    title: string;
    description: string;
  } | null;
  inputComponent?: React.ReactNode;
  onPublicSessionClick?: (sessionId: string) => void;
  showShowcase?: boolean;
  hasConversation?: boolean;
}) => {
  if (size === 'small') {
    return null; // Remove the small welcome message entirely
  }

  // If we have a scenario, show scenario-specific welcome
  if (scenario) {
    return (
      <div className="w-full text-center p-8 rounded-lg">
        <div className="flex justify-center mb-4">
          <div style={{ width: '80px', height: '80px', aspectRatio: '1/1' }}>
            <WelcomeIcon width={80} height={80} />
          </div>
        </div>
        <h2 className="text-3xl font-medium mb-2" style={{ fontSize: '32px' }}>{scenario.title}</h2>
        <p className="text-[#232323] mb-6 text-lg">
          {scenario.description}
        </p>
        
        {/* Usage guide */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-left">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">How to use this scenario:</h3>
          <ul className="text-xs text-blue-800 space-y-1">
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              <span>Click on the suggested action buttons below to get started</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              <span>Each action will guide you through the scenario step by step</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              <span>Use "Type your own" to ask custom questions while staying in the scenario</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              <span>Click "Next step" when you're ready to move forward in the scenario</span>
            </li>
          </ul>
        </div>
      </div>
    );
  }

  // Default welcome message with input component embedded
  return (
    <div className="w-full">
      <div className="text-center mb-4">
        <div className="h-30 mb-4"></div>
        <h1 
          className="text-center font-normal mb-10 text-2xl sm:text-3xl md:text-4xl lg:text-5xl leading-tight sm:leading-snug md:leading-normal"
          style={{
            color: 'var(--Monochrome-Black, #232323)',
            fontFamily: '"Orbikular Variable"',
          }}
        >
          What Can I Do For You?
        </h1>
      </div>
      
      {inputComponent && (
        <div className="w-full mb-8">
          {inputComponent}
        </div>
      )}
      
      {/* Public Sessions Showcase - only show when showShowcase is true AND there's no conversation */}
      {showShowcase && !hasConversation && (
        <div className="w-full mt-8 px-4 sm:px-8 md:px-16 lg:px-24 xl:px-32">
          <PublicSessionsShowcase onSessionClick={onPublicSessionClick} />
        </div>
      )}
    </div>
  );
};

interface ExtendedMessage extends MessageType {
  metadata?: {
    agent_name?: string;
    event_type?: string;
    [key: string]: any;
  };
  id?: string;
  sessionId?: string;
}

interface ExtendedChatMessagesProps extends Omit<ChatMessagesProps, 'messages'> {
  messages: ExtendedMessage[];
  onLinkSubmit?: (url: string) => Promise<void>;
  onFileSelect?: (file: UploadedFile) => void;
  cachedMetadata?: Record<string, any>;
  mode: 'chat' | 'research';
  currentScenario?: {
    title: string;
    description: string;
  } | null;
  onWriteTextComplete?: (content: string) => void;
  onFlashCardComplete?: () => void;
  onOpenNotes?: () => void;
  onOpenFlashcards?: () => void;
  onCVComplete?: (cvContent: any) => void;
  onOpenCV?: () => void;
  onOpenPresentations?: () => void;
  inputComponent?: React.ReactNode;
  showLeftSidebar?: boolean;
  showRightSidebar?: boolean;
  onMobileTabChange?: (tab: 'assets') => void;
  autoAddSources?: boolean;
  onPublicSessionClick?: (sessionId: string) => void;
  hasConversation?: boolean;
  onSendMessage?: (payload: { message: string; type?: 'research' | 'chat'; agent?: string }) => void;
}

// Add ToolMessage component
const ToolMessage = ({ message }: { message: ExtendedMessage }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Parse tool information from content
  let toolName = message.toolName;
  let toolArgs: any = {};
  let toolResult: any = null;
  
  if (typeof message.content === 'string') {
    try {
      const parsed = JSON.parse(message.content);
      toolName = parsed.tool || parsed.name || toolName || 'Unknown Tool';
      toolArgs = parsed.args || {};
      toolResult = parsed.result;
    } catch (e) {
      // If not JSON, use the content as is
    }
  }
  
  // Special handling for writeText tool - show only result
  if (toolName === 'writeText' && toolResult) {
    const resultStr = typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult);
    const isLarge = resultStr.length > 1000;
    const isHTML = resultStr.includes('<p>') || resultStr.includes('<h1>') || resultStr.includes('<h2>');
    
    if (isHTML) {
      return (
        <div className="my-2">
          <div 
            className="prose prose-sm max-w-none text-gray-700 dark:text-gray-300"
            dangerouslySetInnerHTML={{ 
              __html: isExpanded || !isLarge ? resultStr : resultStr.substring(0, 500) + '...'
            }}
          />
          {isLarge && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-2 text-blue-600 dark:text-blue-400 hover:underline text-xs"
            >
              {isExpanded ? 'Show Less' : 'Show More'}
            </button>
          )}
        </div>
      );
    }
  }
  
  // Determine if this is a call or result based on toolAction or presence of result
  const isToolCall = message.toolAction === 'call' || (!message.toolAction && !toolResult);
  const hasResult = toolResult !== null && toolResult !== undefined;
  const isWaitingForResult = isToolCall && !hasResult;
  
  // Use different labels based on what we have
  let label = 'Tool';
  if (isToolCall && !hasResult) {
    label = 'Tool Executing';
  } else if (hasResult && !isToolCall) {
    label = 'Tool Result';
  } else if (hasResult && isToolCall) {
    label = 'Tool Call & Result';
  }
  
  // Show spinner when waiting for result, otherwise show appropriate icon
  const icon = isWaitingForResult ? (
    <Loader2 className="h-4 w-4 animate-spin" />
  ) : isToolCall && !hasResult ? (
    <Wrench className="h-4 w-4" />
  ) : (
    <BarChart3 className="h-4 w-4" />
  );
  
  return (
    <div className="w-full mb-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "w-full flex items-center justify-between px-4 py-2.5 rounded-lg transition-all duration-200",
          isWaitingForResult 
            ? "bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 text-yellow-700"
            : "bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700",
          "font-medium text-sm",
          isExpanded && "rounded-b-none"
        )}
      >
        <div className="flex items-center gap-2">
          {icon}
          <span>{label}: {toolName}</span>
          {isWaitingForResult && (
            <span className="text-xs text-yellow-600 font-normal">Please wait...</span>
          )}
        </div>
        {isExpanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </button>
      
      {isExpanded && (
        <div className={cn(
          "border border-t-0 rounded-b-lg p-4",
          isWaitingForResult 
            ? "border-yellow-200 bg-yellow-50/50"
            : "border-blue-200 bg-blue-50/50"
        )}>
          {Object.keys(toolArgs).length > 0 && (
            <div className="mb-3">
              <h4 className={cn(
                "text-xs font-semibold mb-1",
                isWaitingForResult ? "text-yellow-900" : "text-blue-900"
              )}>Arguments:</h4>
              <pre className="text-xs bg-white rounded p-2 overflow-x-auto">
                {JSON.stringify(toolArgs, null, 2)}
              </pre>
            </div>
          )}
          
          {isWaitingForResult ? (
            <div className="flex items-center gap-2 text-yellow-700">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Executing tool...</span>
            </div>
          ) : toolResult ? (
            <div>
              <h4 className="text-xs font-semibold text-blue-900 mb-1">Result:</h4>
              <pre className="text-xs bg-white rounded p-2 overflow-x-auto max-h-64 overflow-y-auto">
                {typeof toolResult === 'string' ? 
                  (toolResult.startsWith('{') || toolResult.startsWith('[') ? 
                    JSON.stringify(JSON.parse(toolResult), null, 2) : 
                    toolResult) : 
                  JSON.stringify(toolResult, null, 2)}
              </pre>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

// Function to calculate padding based on sidebar states
const calculatePadding = (showLeftSidebar?: boolean, showRightSidebar?: boolean) => {
  // Base vertical padding: 20px top, 10px bottom (increased for more spacing)
  const verticalPadding = 'pt-[20px] pb-[10px]';
  
  // If AgentsSidebar (right sidebar) is open, use very minimal padding to maximize chat space
  if (showRightSidebar) {
    return `${verticalPadding} px-1 sm:px-2 md:px-3 lg:px-4 xl:px-5 2xl:px-6`;
  }
  // If only FileSidebar (left sidebar) is open, use medium padding
  else if (showLeftSidebar) {
    return `${verticalPadding} px-6 sm:px-24 md:px-32 lg:px-40 xl:px-48 2xl:px-56`;
  }
  // If no sidebars are open, use more padding for better spacing
  else {
    return `${verticalPadding} px-8 sm:px-32 md:px-48 lg:px-64 xl:px-80 2xl:px-96`;
  }
};

export function ChatMessages({
  messages,
  isProcessing,
  showWelcome,
  mode,
  onCopy,
  onEdit,
  onDelete,
  onLinkSubmit,
  onFileSelect,
  cachedMetadata = {},
  currentScenario,
  onWriteTextComplete,
  onFlashCardComplete,
  onOpenNotes,
  onOpenFlashcards,
  onCVComplete,
  onOpenCV,
  onOpenPresentations,
  inputComponent,
  showLeftSidebar,
  showRightSidebar,
  onMobileTabChange,
  autoAddSources,
  onPublicSessionClick,
  hasConversation,
  onSendMessage
}: ExtendedChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter out all system messages from UI display
  const displayMessages = useMemo(() => messages.filter(message => 
    message.role !== 'system' && message.role !== 'tool'  // Remove system and tool messages from display
  ), [messages]);

  // Determine if we should show the welcome message
  const shouldShowWelcome = showWelcome || displayMessages.length === 0;

  // Determine if we should show the loading indicator
  const shouldShowLoading = useMemo(() => {
    // Always show loading indicator when processing
    if (!isProcessing) return false;
    // Check if the last message was from a user, which means we're waiting for a response
    const lastMessage = displayMessages[displayMessages.length - 1];
    const result = lastMessage && lastMessage.role === 'user';
    return result;
  }, [isProcessing, displayMessages]);

  // Auto-scroll to bottom when messages change or loading state changes
  useEffect(() => {
    const scrollToBottom = () => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ 
          behavior: 'smooth',
          block: 'end'
        });
      }
    };

    // Use a small timeout to ensure DOM has updated
    const timeoutId = setTimeout(scrollToBottom, 100);
    
    return () => clearTimeout(timeoutId);
  }, [displayMessages.length, shouldShowLoading, isProcessing]);

  // Custom loading indicator without "AI is thinking..." text
  const renderLoadingIndicator = () => {
    return (
      <LoadingIndicator 
        message="Loading..."
        spinnerColor="#70D6FF" 
        customStyles={{
          background: "#FFF",
          border: "1px solid #E8E8E5",
          borderRadius: "16px",
          padding: "8px 12px",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: "8px",
          alignSelf: "stretch",
          width: "100%"
        }}
      />
    );
  };

  // Determine auto add sources preference (default to true)
  const effectiveAutoAddSources = autoAddSources !== undefined ? autoAddSources : true;

  return (
    <div ref={containerRef} className="flex-1 bg-white flex flex-col h-full overflow-hidden">
      {shouldShowWelcome && displayMessages.length === 0 ? (
        // Show welcome message without centering when there are no messages
        <div className="flex-1 w-full">
          <WelcomeMessage 
            size="large" 
            scenario={currentScenario} 
            inputComponent={inputComponent}
            onPublicSessionClick={onPublicSessionClick}
            showShowcase={true}
            hasConversation={hasConversation || false}
          />
        </div>
      ) : (
        // Normal layout with messages (and optional welcome card at top) - add padding here
        <div 
          className={`space-y-4 flex flex-col flex-1 overflow-hidden ${calculatePadding(showLeftSidebar, showRightSidebar)}`}
        >
          {shouldShowWelcome && displayMessages.length > 0 && (
            <div className="flex justify-center">
              <WelcomeMessage 
                size="small" 
                scenario={currentScenario}
              />
            </div>
          )}
          
          <div className="space-y-2 flex flex-col overflow-y-auto scrollbar-hide">
            {displayMessages.map((message, index) => {
              // Check if this is the last message and we're processing
              const isLastMessage = index === displayMessages.length - 1;
              const isStreaming = isLastMessage && isProcessing && message.role === 'assistant';
              
              // Render other messages normally
              return (
                <div 
                  key={message.id || `${message.role}-${message.timestamp?.getTime() || Date.now()}-${Math.random().toString(36).slice(2)}`}
                  className={`flex w-full message-container justify-start`}
                >
                  <div className={message.role === 'assistant' ? 'w-full' : ''}>
                    <Message 
                      message={message} 
                      onCopy={onCopy}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onLinkSubmit={onLinkSubmit}
                      onFileSelect={onFileSelect}
                      cachedMetadata={cachedMetadata}
                      onWriteTextComplete={onWriteTextComplete}
                      isStreaming={isStreaming}
                      onFlashCardComplete={onFlashCardComplete}
                      onOpenNotes={onOpenNotes}
                      onOpenFlashcards={onOpenFlashcards}
                      onCVComplete={onCVComplete}
                      onOpenCV={onOpenCV}
                      onOpenPresentations={onOpenPresentations}
                      onMobileTabChange={onMobileTabChange}
                      autoAddSources={effectiveAutoAddSources}
                      onSendMessage={onSendMessage}
                    />
                  </div>
                </div>
              );
            })}
            
            {shouldShowLoading && (
              (() => {
                return mode === 'research'
                  ? <ResearchLoadingIndicator />
                  : renderLoadingIndicator();
              })()
            )}

            {/* Scroll anchor - this ensures smooth scrolling to bottom */}
            <div ref={messagesEndRef} className="h-1" />
          </div>
        </div>
      )}
    </div>
  );
}
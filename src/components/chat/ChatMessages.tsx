import { useRef, useEffect, useMemo } from 'react';
import type { ChatMessagesProps, UploadedFile } from '@/types/chat';
import type { Message as MessageType } from '@/types/chat';
import { Message } from './Message';
import { WelcomeIcon } from '@/components/icons/WelcomeIcon';
import { LoadingIndicator } from './LoadingIndicator';

// Inline WelcomeMessage component since the import is missing
const WelcomeMessage = ({ size = 'large' }: { size?: 'small' | 'large' }) => {
  if (size === 'small') {
    return (
      <div className="text-center p-2 text-sm text-black mb-2">
        <p>How can I help you today?</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg w-full mx-auto text-center p-8 rounded-lg">
      <div className="flex justify-center mb-4">
        <div style={{ width: '80px', height: '80px', aspectRatio: '1/1' }}>
          <WelcomeIcon width={80} height={80} />
        </div>
      </div>
      <h2 className="text-3xl font-medium mb-2" style={{ fontSize: '32px' }}>Get the best possible answer</h2>
      <p className="text-black">
        Ask anything or chat with your files — we'll pick the best AI for the job
      </p>
    </div>
  );
};

interface ExtendedMessage extends MessageType {
  metadata?: {
    agent_name?: string;
    event_type?: string;
    [key: string]: any;
  };
  annotations?: {
    content: string;
    toolName?: string;
    toolAction?: string;
  };
  id?: string;
  sessionId?: string;
}

interface ExtendedChatMessagesProps extends Omit<ChatMessagesProps, 'messages'> {
  messages: ExtendedMessage[];
  currentAgent?: string;
  onLinkSubmit?: (url: string) => Promise<void>;
  onFileSelect?: (file: UploadedFile) => void;
}

// Define a type for processed messages
interface ProcessedMessage {
  message: ExtendedMessage;
  annotation?: ExtendedMessage & { toolAction: 'annotations' };
}

export function ChatMessages({
  messages,
  isProcessing,
  showWelcome,
  onCopy,
  onEdit,
  onDelete,
  currentAgent = 'Assistant',
  onLinkSubmit,
  onFileSelect
}: ExtendedChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Filter out all system messages from UI display
  const displayMessages = useMemo(() => messages.filter(message => 
    message.role !== 'system'  // Remove all system messages from display
  ), [messages]);

  // Determine if we should show the welcome message
  const shouldShowWelcome = showWelcome || displayMessages.length === 0;

  // Determine if we should show the loading indicator
  const shouldShowLoading = useMemo(() => {
    // Always show loading indicator when processing
    if (!isProcessing) return false;
    
    // Check if the last message was from a user, which means we're waiting for a response
    const lastMessage = displayMessages[displayMessages.length - 1];
    return lastMessage && lastMessage.role === 'user';
  }, [isProcessing, displayMessages]);

  // Scroll to bottom when messages change or when loading appears
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, shouldShowLoading]);

  // Find annotation messages and associate them with relevant assistant messages
  const messageWithAnnotations = useMemo(() => {
    // Identify all annotation messages first
    const annotationIndices: number[] = [];
    messages.forEach((message, index) => {
      if (message.role === 'tool' && 
          (message.toolAction === 'annotations' || 
           (typeof message.content === 'string' && 
            message.content.includes('annotations=')))) {
        
        annotationIndices.push(index);
      }
    });
    
    // Create a map of assistant messages to their relevant annotations
    const assistantToAnnotationMap: Record<number, number> = {};
    
    // For each annotation, find the closest assistant message before or after it
    annotationIndices.forEach(annotationIndex => {
      // Look for an adjacent assistant message (prioritize the one after the annotation)
      let bestAssistantIndex = -1;
      let minDistance = Infinity;
      
      messages.forEach((message, index) => {
        if (message.role === 'assistant') {
          // Calculate distance, but prioritize assistant messages that come after the annotation
          const distance = Math.abs(index - annotationIndex);
          
          // Check if this is the closest assistant message, or if it's after the annotation 
          // and the current best is before the annotation
          if (distance < minDistance || 
              (index > annotationIndex && bestAssistantIndex < annotationIndex)) {
            bestAssistantIndex = index;
            minDistance = distance;
          }
        }
      });
      
      // If we found a close assistant message and it's not too far (max 3 positions away)
      if (bestAssistantIndex !== -1 && minDistance <= 3) {
        assistantToAnnotationMap[bestAssistantIndex] = annotationIndex;
      }
    });
    
    return assistantToAnnotationMap;
  }, [messages]);

  // Pre-process messages with their annotations to avoid recalculation during render
  const processedMessages = useMemo(() => {
    const result: ProcessedMessage[] = [];
    
    for (const message of displayMessages) {
      // Skip annotation messages
      if (message.role === 'tool' && 
          (message.toolAction === 'annotations' || 
          (typeof message.content === 'string' && 
            message.content.includes('annotations=')))) {
        continue;
      }

      // Get annotation based on existing data or computed map
      let annotation = undefined;
      
      // If message has direct annotations property, use that
      if (message.annotations) {
        annotation = {
          role: 'tool' as MessageType['role'],
          content: message.annotations.content,
          toolAction: 'annotations' as const,
          toolName: message.annotations.toolName,
          timestamp: message.timestamp
        };
      } 
      // Otherwise fall back to the old method
      else if (message.role === 'assistant') {
        const messageIndex = messages.findIndex(m => 
          m.id === message.id || 
          (m.timestamp && message.timestamp && m.timestamp.getTime() === message.timestamp.getTime())
        );
        
        if (messageIndex !== -1 && messageWithAnnotations[messageIndex] !== undefined) {
          const annotationIndex = messageWithAnnotations[messageIndex];
          annotation = messages[annotationIndex] as ExtendedMessage & { toolAction: 'annotations' };
        }
      }
      
      result.push({ message, annotation });
    }
    
    return result;
  }, [displayMessages, messages, messageWithAnnotations]);

  // Custom loading indicator styled for current agent
  const renderLoadingIndicator = () => {
    const agentName = currentAgent || 'AI';
    
    return (
      <LoadingIndicator 
        message={`${agentName} is thinking...`}
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

  return (
    <div className="flex-1 overflow-y-auto bg-white px-2 sm:p-4 flex flex-col h-full">
      {shouldShowWelcome && displayMessages.length === 0 ? (
        // Center the welcome message when there are no messages
        <div className="flex items-center justify-center min-h-[80vh] flex-1">
          <WelcomeMessage size="large" />
        </div>
      ) : (
        // Normal layout with messages (and optional welcome card at top)
        <div className="space-y-4 flex flex-col flex-1">
          {shouldShowWelcome && displayMessages.length > 0 && (
            <div className="flex justify-center">
              <WelcomeMessage size="small" />
            </div>
          )}
          
          <div className="space-y-2 flex flex-col">
            {processedMessages.map(({ message, annotation }) => (
              <div 
                key={message.id || `${message.role}-${message.timestamp?.getTime() || Date.now()}-${Math.random().toString(36).slice(2)}`}
                className={`flex w-full ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div className={message.role === 'assistant' ? 'w-full' : ''}>
                  <Message 
                    message={message} 
                    onCopy={onCopy}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    annotations={annotation}
                    currentAgent={currentAgent}
                    onLinkSubmit={onLinkSubmit}
                    onFileSelect={onFileSelect}
                  />
                </div>
              </div>
            ))}
            
            {shouldShowLoading && renderLoadingIndicator()}

            <div ref={messagesEndRef} />
          </div>
        </div>
      )}
    </div>
  );
}
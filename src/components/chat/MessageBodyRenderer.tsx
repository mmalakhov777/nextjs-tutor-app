import React, { useState, useRef, useEffect, useMemo /*, useCallback*/ } from 'react';
import { Message as MessageType, UploadedFile } from '@/types/chat';
import { cn } from "@/lib/utils";
// import { Button } from "@/components/ui/button"; // Button might be used by edit controls, keep for now
// import { Card, CardContent } from "@/components/ui/card"; // Unused
// import { Badge } from "@/components/ui/badge"; // Unused if citations badge is gone
/*import {
  Copy, ArrowRight, File, ChevronDown, ChevronRight, Download, Search, FileText, 
  AlertCircle, Loader2, Trash2, Pencil, Share2, Check, Link, ExternalLink, 
  Volume2, VolumeX, Users, X, Info, Plus, Settings, Wrench, Shield, UserCircle, 
  Brain, Globe, Sparkles, BookOpen, Code, Lightbulb, ChevronDown as ChevronDownIcon, ChevronUp
} from 'lucide-react';*/ // Many of these might be unused now, review later if MessageActions is simplified

import { MessageContent } from './MessageContent';

import MessageActions from './MessageActions';
import { ToolCallDisplay } from './ToolCallDisplay';
import { SourceCardsDisplay } from './SourceCardsDisplay';

// Helper function to clean metadata from message content
const cleanMessageContent = (content: string): string => {
  if (typeof content !== 'string') return content;
  
  // Remove __FILES_METADATA__ ... __END_FILES_METADATA__ block (and everything in between)
  content = content.replace(/__FILES_METADATA__([\s\S]*?)__END_FILES_METADATA__/g, '').trim();
  
  // Remove __FILE_CONTENTS__ ... __END_FILE_CONTENTS__ block (and everything in between)
  content = content.replace(/__FILE_CONTENTS__([\s\S]*?)__END_FILE_CONTENTS__/g, '').trim();
  
  return content;
};

interface OriginalMessageProps {
  message: MessageType & {
    toolName?: string;
    toolAction?: 'call' | 'output' | 'annotations'; // annotations might be removable from MessageType itself later
    sessionId?: string;
    metadata?: {
      agent_name?: string;
      event_type?: string;
      provider?: string;
    };
    provider?: string;
    toolCall?: any;
    toolInvocations?: any[];
    parts?: any[];
    reasoning?: string;
  };
  // annotations prop from MessageType is already out
}

export interface MessageBodyRendererProps {
  message: OriginalMessageProps['message'];
  isEditing: boolean;
  isStreaming: boolean;
  editTextareaRef: React.RefObject<HTMLTextAreaElement>;
  editedContent: string;
  setEditedContent: React.Dispatch<React.SetStateAction<string>>;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onLinkSubmit?: (url: string) => Promise<void>;
  loadingLinkId?: string | null;
  setLoadingLinkId: React.Dispatch<React.SetStateAction<string | null>>;
  setNotification: React.Dispatch<React.SetStateAction<string | null>>;
  isResearchResponseResult: boolean;
  onCopy: (content: string) => void;
  isSpeaking: boolean;
  isLoadingSpeech: boolean;
  handleSpeak: () => Promise<void>;
  isMobile: boolean;
  onWriteTextComplete?: (content: string) => void;
  onOpenNotes?: () => void;
  onOpenFlashcards?: () => void;
  onCVComplete?: (cvContent: any) => void;
  onOpenCV?: () => void;
  onOpenPresentations?: () => void;
  onMobileTabChange?: (tab: 'assets') => void;
  autoAddSources?: boolean;
}

export const MessageBodyRenderer: React.FC<MessageBodyRendererProps> = ({
  message,
  isEditing,
  isStreaming,
  editTextareaRef,
  editedContent,
  setEditedContent,
  handleKeyDown,
  onLinkSubmit,
  loadingLinkId,
  setLoadingLinkId,
  setNotification,
  isResearchResponseResult,
  onCopy,
  isSpeaking,
  isLoadingSpeech,
  handleSpeak,
  isMobile,
  onWriteTextComplete,
  onOpenNotes,
  onOpenFlashcards,
  onCVComplete,
  onOpenCV,
  onOpenPresentations,
  onMobileTabChange,
  autoAddSources,
}) => {
  // Track which tool invocations have been processed
  const processedInvocationsRef = useRef<Set<string>>(new Set());
  


  const displayContent = useMemo(() => {
    if (isEditing) return editedContent;
    // Clean metadata from assistant message content for display
    return cleanMessageContent(message.content);
  }, [isEditing, editedContent, message.content]);

  const streamingState = useMemo(() => ({
    isStreaming,
    hasContent: displayContent && displayContent.length > 0
  }), [isStreaming, displayContent]);

  // Add effect to detect when Write Text tool completes
  useEffect(() => {
    if (message.toolInvocations && onWriteTextComplete) {
      message.toolInvocations.forEach((invocation, index) => {
        // Create a unique ID for this invocation
        const invocationId = `${message.id}-${index}-${invocation.toolName}-${invocation.state}`;
        

        
        // Check if this is a Write Text tool with a result that hasn't been processed yet
        if (invocation.toolName === 'writeText' && 
            invocation.state === 'result' && 
            invocation.result &&
            !processedInvocationsRef.current.has(invocationId)) {
          // Extract the text content from the result
          let textContent = '';
          
          if (typeof invocation.result === 'string') {
            textContent = invocation.result;
          } else if (invocation.result && typeof invocation.result === 'object') {
            // Handle object result with content property
            textContent = invocation.result.content || invocation.result.text || JSON.stringify(invocation.result);
          }
          

          
          // Call the callback with the written text and the invocation ID
          // Pass the invocation ID to allow parent to track processed invocations
          if (typeof onWriteTextComplete === 'function') {
            // If onWriteTextComplete accepts two parameters, pass the ID
            if (onWriteTextComplete.length >= 2) {
              (onWriteTextComplete as any)(textContent, invocationId);
            } else {
              // Fallback for existing implementation
              onWriteTextComplete(textContent);
            }
          }
          
          // Mark this invocation as processed
          processedInvocationsRef.current.add(invocationId);
        }
      });
    }
  }, [message.toolInvocations, message.id, onWriteTextComplete]);

  // Add effect to detect when CV Writer tool completes
  useEffect(() => {
    if (message.toolInvocations && onCVComplete) {
      message.toolInvocations.forEach((invocation, index) => {
        // Create a unique ID for this invocation
        const invocationId = `${message.id}-${index}-${invocation.toolName}-${invocation.state}`;
        

        
        // Check if this is a CV Writer tool with a result that hasn't been processed yet
        if (invocation.toolName === 'writeCv' && 
            invocation.state === 'result' && 
            invocation.result &&
            !processedInvocationsRef.current.has(invocationId)) {
          

          
          // Parse the result if it's a string, otherwise use as-is
          let cvContent = invocation.result;
          
          // If the result is a string, try to parse it as JSON
          if (typeof invocation.result === 'string') {
            try {
              cvContent = JSON.parse(invocation.result);
            } catch (e) {
              // If it's not valid JSON, treat it as raw content that CVViewer will handle
              cvContent = invocation.result;
            }
          }
          

          
          // Call the callback with the processed CV content
          onCVComplete(cvContent);
          
          // Mark this invocation as processed
          processedInvocationsRef.current.add(invocationId);
        }
      });
    }
  }, [message.toolInvocations, message.id, onCVComplete]);

  if (isEditing) {
    return (
      <div 
        className="w-full"
      >
        <textarea
          ref={editTextareaRef}
          value={editedContent}
          onChange={(e) => setEditedContent(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={Math.max(3, editedContent.split('\n').length)}
          style={{ minHeight: '80px' }}
        />
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => {
              // Save logic is typically handled by onEdit in parent, or a specific save handler prop
              // For now, assuming parent handles save via onEdit which is part of MessageProps in Message.tsx
              const parentOnEdit = (message.metadata as any)?.onEdit; // Example access, needs proper prop drilling
              if (parentOnEdit) parentOnEdit({ ...message, content: editedContent });
            }}
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
          >
            Save
          </button>
          <button
            onClick={() => {
              // Cancel logic: reset editedContent to original message.content
              // and potentially call a prop to signal edit cancellation if parent needs to know
              setEditedContent(message.content);
              // If there was an setIsEditing prop: setIsEditing(false);
            }}
            className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={cn("message-content-container", {
        "streaming-content": streamingState.isStreaming,
      })}
    >
      {message.role === 'assistant' && (
        <>
          {/* Only render toolCall if there are no toolInvocations or if they don't overlap */}
          {message.toolCall && (!message.toolInvocations || message.toolInvocations.length === 0) && (
            <ToolCallDisplay 
              toolCall={message.toolCall} 
              timestamp={message.timestamp}
              onOpenNotes={onOpenNotes}
              onOpenFlashcards={onOpenFlashcards}
              onOpenCV={onOpenCV}
              onOpenPresentations={onOpenPresentations}
              isMobileDevice={isMobile}
              onMobileTabChange={onMobileTabChange}
              onLinkSubmit={onLinkSubmit}
              autoAddSources={autoAddSources}
            />
          )}
          
          {/* Render toolInvocations - this is the newer format */}
          {message.toolInvocations && message.toolInvocations.length > 0 && (
            <div className="space-y-2 mb-3">
              {(() => {
                // Group tool invocations by tool name
                type GroupedInvocation = {
                  toolName: string;
                  args: Record<string, any>;
                  result?: any;
                  state?: 'call' | 'result';
                  originalIndex: number;
                };

                const groupedInvocations = message.toolInvocations.reduce((groups, invocation, index) => {
                  const toolName = invocation.toolName;
                  if (!groups[toolName]) {
                    groups[toolName] = [];
                  }
                  groups[toolName].push({ ...invocation, originalIndex: index });
                  return groups;
                }, {} as Record<string, GroupedInvocation[]>);

                return Object.keys(groupedInvocations).map(toolName => {
                  const invocations = groupedInvocations[toolName];
                  const firstInvocation = invocations[0];
                  
                  return (
                    <ToolCallDisplay 
                      key={`${message.id}-tool-${toolName}`}
                      toolCall={{
                        tool: firstInvocation.toolName,
                        args: firstInvocation.args,
                        result: firstInvocation.result,
                        state: firstInvocation.state
                      }} 
                      timestamp={message.timestamp}
                      onOpenNotes={onOpenNotes}
                      onOpenFlashcards={onOpenFlashcards}
                      onOpenCV={onOpenCV}
                      onOpenPresentations={onOpenPresentations}
                      isMobileDevice={isMobile}
                      onMobileTabChange={onMobileTabChange}
                      onLinkSubmit={onLinkSubmit}
                      autoAddSources={autoAddSources}
                      stackedInvocations={invocations.length > 1 ? invocations : undefined}
                    />
                  );
                });
              })()}
            </div>
          )}
          
          {streamingState.isStreaming && !streamingState.hasContent ? (
            null
          ) : (
            <div className={`message-content`}>
              <MessageContent 
                content={displayContent}
                messageId={message.id}
                isStreaming={streamingState.isStreaming}
                hasFileAnnotations={false} // Kept as false, was previously hasStableFileAnnotations
                isResearchResponse={isResearchResponseResult}
              />
            </div>
          )}
        </>
      )}
      
      {message.role === 'user' && (
        <div>
          {displayContent}
        </div>
      )}

      {/* Two-column layout for SourceCardsDisplay and MessageActions */}
      {!isEditing && !streamingState.isStreaming && message.role === 'assistant' && (
        <div className="mt-4">
          <div className="flex flex-col md:flex-row gap-4 items-start">
            {/* Left side - SourceCardsDisplay */}
            <div className="flex-1 w-full">
              <SourceCardsDisplay
                message={message}
                onLinkSubmit={onLinkSubmit}
                loadingLinkId={loadingLinkId}
                setLoadingLinkId={setLoadingLinkId}
                setNotification={setNotification}
                isMessageComplete={true}
              />
            </div>
            
            {/* Right side - MessageActions and badges */}
            <div className="flex-shrink-0 flex items-start mt-2 md:mt-2 w-full md:w-auto justify-end md:justify-start">
              <div className="flex items-center gap-2">
                {isMobile && isResearchResponseResult && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      height: '24px',
                      padding: '0 10px',
                      backgroundColor: 'transparent',
                      color: '#232323',
                      fontSize: '12px',
                      fontWeight: '500',
                      borderRadius: '1000px',
                      border: '1px solid #E8E8E5',
                      letterSpacing: '0.5px',
                      position: 'relative',
                    }}
                  >
                    Research
                  </div>
                )}
                
                {!isMobile && isResearchResponseResult ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '24px',
                      padding: '0 10px',
                      backgroundColor: 'transparent',
                      color: '#232323',
                      fontSize: '12px',
                      fontWeight: '500',
                      borderRadius: '1000px',
                      border: '1px solid #E8E8E5',
                      letterSpacing: '0.5px',
                    }}
                  >
                    Research
                  </div>
                ) : null}
                
                <MessageActions
                  message={message}
                  onCopy={onCopy}
                  isSpeaking={isSpeaking}
                  isLoadingSpeech={isLoadingSpeech}
                  handleSpeak={handleSpeak}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 
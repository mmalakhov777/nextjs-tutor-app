import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import React from 'react';
import Image from 'next/image';
import { Copy, ArrowRight, File, ChevronDown, ChevronRight, Download, Search, FileText, AlertCircle, Trash2, Pencil, Share2, Check, Link, ExternalLink, Volume2, VolumeX, Users, X, Info, Plus, Settings, Wrench, Shield, UserCircle, Brain, Globe, Sparkles, BookOpen, Code, Lightbulb, ChevronDown as ChevronDownIcon, ChevronUp } from 'lucide-react';
import equal from 'fast-deep-equal';
import { Message as MessageType } from '@/types/chat';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import DeleteIcon from '@/components/icons/DeleteIcon';
import { SpinnerIcon } from '@/components/icons/SpinnerIcon';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/toast";
import { speakText, stopSpeaking } from '@/services/audioService';
import { FileDetailModal } from './FileDetailModal';
import { UploadedFile } from '@/types/chat';
import { getFileMetadataFromLocalStorage, saveFileMetadataToLocalStorage } from '@/utils/fileStorage';
import { getAgentDescription } from '@/data/agentDescriptions';
import { MessageBodyRenderer } from './MessageBodyRenderer';
import { 
  getAgentIcon, 
  getAgentCircleColor, 
  getAgentTextColor, 
  getDisplayAgentName 
} from '@/lib/agents';

const getBackendUrl = () => {
  return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5002';
};

interface FileAnnotation {
  type: string;
  file_citation: {
    file_id: string;
    index: number;
    filename: string;
  };
}

interface DebugState {
  fileContents: Record<string, string | null>;  
  isLoading: boolean;
  error: string | null;
}

interface MessageProps {
  message: MessageType & {
    toolName?: string;
    toolAction?: 'call' | 'output' | 'annotations';
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
  onCopy: (content: string) => void;
  onDelete?: (message: MessageType) => void;
  onEdit?: (message: MessageType) => void;
  onLinkSubmit?: (url: string) => Promise<void>;
  onFileSelect?: (file: UploadedFile) => void;
  cachedMetadata?: Record<string, any>;
  onWriteTextComplete?: (content: string) => void;
  isStreaming?: boolean;
  onOpenNotes?: () => void;
  onOpenFlashcards?: () => void;
  onFlashCardComplete?: () => void;
  onCVComplete?: (cvContent: any) => void;
  onOpenCV?: () => void;
  onOpenPresentations?: () => void;
  onMobileTabChange?: (tab: 'assets') => void;
  autoAddSources?: boolean;
  onSendMessage?: (payload: { message: string; type?: 'research' | 'chat'; agent?: string }) => void;
}

export const Message = React.memo(function Message({ message, onCopy, onDelete, onEdit, onLinkSubmit, onFileSelect, cachedMetadata = {}, onWriteTextComplete, isStreaming: isStreamingProp = false, onOpenNotes, onOpenFlashcards, onCVComplete, onOpenCV, onOpenPresentations, onMobileTabChange, autoAddSources, onSendMessage }: MessageProps) {
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [fileContents, setFileContents] = useState<Record<string, string | null>>({});
  const [editedContent, setEditedContent] = useState(message.content);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoadingSpeech, setIsLoadingSpeech] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null);
  const [loadingFileId, setLoadingFileId] = useState<string | null>(null);
  const [loadingLinkId, setLoadingLinkId] = useState<string | null>(null);
  const [showReasoning, setShowReasoning] = useState(true);
  
  // Add toast hook
  const { addToast } = useToast();
  
  // Use the prop instead of content-based detection
  const isStreaming = isStreamingProp;
  

  
  // Check if message has reasoning content - check multiple sources
  const hasReasoning = useMemo(() => {
    // Always show reasoning section for Claude Creative messages (even if no reasoning content yet)
    if (message.metadata?.agent_name === 'Claude Creative' || message.agentName === 'Claude Creative') {
      return true;
    }
    
    // Check AI SDK reasoning property first
    if (message.reasoning && typeof message.reasoning === 'string' && message.reasoning.trim()) {
      return true;
    }
    
    // Check metadata for reasoning
    if (message.metadata?.has_reasoning && message.metadata?.reasoning_content) {
      return true;
    }
    
    return false;
  }, [message.reasoning, message.metadata, message.agentName]);
  

  
  const reasoningContent = useMemo(() => {
    // Prefer AI SDK reasoning property
    if (message.reasoning && typeof message.reasoning === 'string' && message.reasoning.trim()) {
      return message.reasoning;
    }
    
    // Fallback to metadata
    if (message.metadata?.reasoning_content) {
      return message.metadata.reasoning_content;
    }
    
    return '';
  }, [message.reasoning, message.metadata?.reasoning_content]);

  // Helper function to safely render reasoning content with HTML tags
  const renderReasoningContent = (content: string) => {
    // Check if reasoning is currently streaming (ends with ...)
    const isReasoningStreaming = content.endsWith('...');
    
    // Show placeholder if no content yet for Claude Creative
    if (!content && (message.metadata?.agent_name === 'Claude Creative' || message.agentName === 'Claude Creative')) {
      return (
        <div className="text-sm text-gray-500 italic bg-gray-50 p-3 rounded border">
          {isStreaming ? 'Reasoning will appear here as Claude thinks...' : 'No reasoning content available for this response.'}
        </div>
      );
    }
    
    return (
      <div className="text-sm text-gray-700 whitespace-pre-wrap font-mono bg-gray-50 p-3 rounded border">
        {content}
      </div>
    );
  };
  
  const handleSendMessage = (message: string) => {
    if (onLinkSubmit && message.startsWith('http')) {
      setLoadingLinkId(message);
      onLinkSubmit(message)
        .then(() => {
          // Successfully submitted link
        })
        .catch(error => {
          console.error("Error submitting link:", error);
        })
        .finally(() => {
          setLoadingLinkId(null);
        });
    }
  };
  
  const handleLinkSubmitInternal = async (url: string) => {
    if (onLinkSubmit) {
      setLoadingLinkId(url);
      try {
        console.log("Message component submitting link:", url);
        await onLinkSubmit(url);
        console.log("Link submitted successfully in Message component");
        
        // Success - no toast notification needed
        
        return Promise.resolve(); // Success
      } catch (error) {
        console.error("Error submitting link in Message component:", error);
        
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        // Don't show toast for duplicate errors since useFiles already handles that
        if (!errorMessage.includes('already been processed')) {
          addToast({
            type: 'error',
            message: errorMessage,
            title: 'Failed to add source',
            duration: 5000
          });
        }
        
        return Promise.resolve();
      } finally {
        setLoadingLinkId(null);
      }
    }
    return Promise.resolve();
  };
  
  const handleFileQuickAction = (file: UploadedFile, action: string, content: string) => {
    // No-op for now as this is handled in the parent
  };
  
  const handleFileClick = async (fileId: string, filename: string) => {
    try {
      setLoadingFileId(fileId);
      const storedMetadata = getFileMetadataFromLocalStorage(fileId);
      
      if (storedMetadata && storedMetadata.file_content) {
        const file: UploadedFile = {
          id: fileId,
          name: storedMetadata.name || filename,
          size: storedMetadata.size || 0,
          type: storedMetadata.type || '',
          uploadDate: new Date(storedMetadata.uploadDate || new Date()),
          url: storedMetadata.url || '',
          format: storedMetadata.format || 'unknown',
          vectorStoreId: storedMetadata.vectorStoreId || '',
          doc_type: storedMetadata.doc_type || '',
          doc_title: storedMetadata.doc_title || '',
          doc_authors: storedMetadata.doc_authors || [],
          doc_publication_year: typeof storedMetadata.doc_publication_year === 'string' ? 
                               parseInt(storedMetadata.doc_publication_year, 10) || null : 
                               storedMetadata.doc_publication_year || null,
          doc_summary: storedMetadata.doc_summary || '',
          total_pages: storedMetadata.total_pages || 0,
          source: storedMetadata.source || 'upload',
          status: storedMetadata.status || 'completed',
          processed_at: storedMetadata.processed_at || '',
          file_content: storedMetadata.file_content
        };
        
        if (onFileSelect) {
          onFileSelect(file);
        } else {
          setSelectedFile(file);
        }
        
        setLoadingFileId(null);
        return;
      }
      
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/files/${fileId}`);
      if (!response.ok) throw new Error(`Failed to fetch file details: ${response.status}`);
      const fileData = await response.json();
      
      let fileContent = null;
      try {
        const contentResponse = await fetch(`${backendUrl}/api/files/${fileId}/content`);
        if (contentResponse.ok) {
          const contentData = await contentResponse.json();
          if (contentData && contentData.content) {
            fileContent = contentData.content;
            fileData.file_content = contentData.content;
          }
        }
      } catch (contentError) {}
      
      if (fileData.chatSessionId) {
        try {
          const metadataResponse = await fetch(`${backendUrl}/api/files?chat_session_id=${encodeURIComponent(fileData.chatSessionId)}`);
          if (metadataResponse.ok) {
            const allFiles = await metadataResponse.json();
            if (Array.isArray(allFiles)) {
              const enrichedFile = allFiles.find(f => f.id === fileId);
              if (enrichedFile) Object.assign(fileData, enrichedFile);
              }
            }
        } catch (metadataError) {}
      }
      
      const file: UploadedFile = {
        id: fileData.id,
        name: fileData.name || filename,
        size: parseInt(String(fileData.size), 10) || 0,
        type: fileData.type || '',
        uploadDate: new Date(fileData.created_at || fileData.upload_date || new Date()),
        url: fileData.url || '',
        format: fileData.type?.split('/')[1] || fileData.name?.split('.').pop() || 'unknown',
        vectorStoreId: fileData.vectorStoreId || '',
        doc_type: fileData.document?.type || fileData.doc_type || '',
        doc_title: fileData.document?.title || fileData.doc_title || '',
        doc_authors: fileData.document?.authors || fileData.doc_authors || [],
        doc_publication_year: typeof fileData.document?.publication_year === 'string' ? 
                             parseInt(fileData.document.publication_year, 10) || null : 
                             fileData.document?.publication_year || 
                             (typeof fileData.doc_publication_year === 'string' ? 
                              parseInt(fileData.doc_publication_year, 10) || null : 
                              fileData.doc_publication_year || null),
        doc_summary: fileData.document?.summary || fileData.doc_summary || '',
        total_pages: fileData.document?.total_pages || fileData.total_pages || 0,
        source: fileData.source || (fileData.url ? 'link' : 'upload'),
        status: fileData.status || 'completed',
        processed_at: fileData.processed_at || '',
        file_content: fileContent
      };
      
      saveFileMetadataToLocalStorage(file);
      if (onFileSelect) onFileSelect(file); else setSelectedFile(file);
    } catch (error) {
      setNotification('Error loading file details');
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setLoadingFileId(null);
    }
  };
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        setIsTooltipVisible(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFetchFileContent = async (fileId: string) => {
    if (fileContents[fileId]) return;

    try {
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/files/${fileId}/content`);
      const text = await response.text();
      
      try {
        const data = JSON.parse(text);
        const content = typeof data.content === 'string' ? data.content : 
                       typeof data === 'string' ? data : 
                       JSON.stringify(data);
        setFileContents(prev => ({ ...prev, [fileId]: content }));
      } catch (parseError) {
        setFileContents(prev => ({ ...prev, [fileId]: text }));
      }
    } catch (error) {
      setFileContents(prev => ({ ...prev, [fileId]: null }));
    }
  };

  const handleStartEdit = () => {
    setIsEditing(true);
    setEditedContent(message.content);
    
    setTimeout(() => {
      if (editTextareaRef.current) {
        editTextareaRef.current.focus();
        editTextareaRef.current.setSelectionRange(
          editTextareaRef.current.value.length,
          editTextareaRef.current.value.length
        );
      }
    }, 0);
  };

  const handleSaveEdit = () => {
    if (onEdit && editedContent !== message.content) onEdit({ ...message, content: editedContent });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedContent(message.content);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSaveEdit();
    else if (e.key === 'Escape') handleCancelEdit();
  };

  const handleSpeak = async () => {
    if (isSpeaking || isLoadingSpeech) {
      stopSpeaking();
      setIsSpeaking(false);
      setIsLoadingSpeech(false);
      return;
    }
    
    if (message.role !== 'assistant') {
      return; 
    }
    
    try {
      setIsLoadingSpeech(true);
      setIsSpeaking(true);
      
      const textToSpeak = message.content;
      
      await speakText(textToSpeak);
      
      setIsSpeaking(false);
    } catch (error) {
      setIsSpeaking(false);
    } finally {
      setIsLoadingSpeech(false);
    }
  };

  useEffect(() => {
    return () => {
      if (isSpeaking) {
        stopSpeaking();
      }
    };
  }, [isSpeaking]);

  const isResearchResponseResult = useMemo(() => {
    if (message.metadata?.agent_name === 'Perplexity' || message.agentName === 'Perplexity') return false;
    if (message.metadata?.agent_name === 'Research' || message.metadata?.agent_name === 'Research Agent' || message.agentName === 'Research' || message.agentName === 'Research Agent') return true;
    if (message.provider === 'Perplexity' || message.metadata?.provider === 'Perplexity') return false;
    return false;
  }, [message.metadata?.agent_name, message.agentName, message.provider, message.metadata?.provider]);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkIfMobile = () => setIsMobile(typeof window !== 'undefined' && window.innerWidth < 768);
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  // Helper function to clean scenario context and metadata from messages
  const cleanMessageContent = (content: string): string => {
    if (typeof content !== 'string') return content;
    
    // Remove __FILES_METADATA__ ... __END_FILES_METADATA__ block (and everything in between)
    content = content.replace(/__FILES_METADATA__([\s\S]*?)__END_FILES_METADATA__/g, '').trim();
    
    // Remove __FILE_CONTENTS__ ... __END_FILE_CONTENTS__ block (and everything in between)
    content = content.replace(/__FILE_CONTENTS__([\s\S]*?)__END_FILE_CONTENTS__/g, '').trim();
    
    // Check if this is an enhanced scenario prompt
    if (content.includes('**SCENARIO CONTEXT:**')) {
      // Extract just the command from the enhanced prompt
      const commandMatch = content.match(/Please do the following command: "([^"]+)"/);
      if (commandMatch) {
        return commandMatch[1];
      }
      
      // Fallback: try to extract the first line before scenario context
      const lines = content.split('\n');
      const firstLine = lines[0];
      if (firstLine && !firstLine.includes('**SCENARIO CONTEXT:**')) {
        // Remove "Please do the following command: " prefix if present
        return firstLine.replace(/^Please do the following command: "?/, '').replace(/"$/, '');
      }
    }
    
    return content;
  };

  const getAgentDescription = (agentName: string) => {
    switch(agentName) {
      case "SEO Agent":
        return "SEO specialist for keyword research, content optimization, and digital marketing.";
      case "Content Writer Agent":
        return "Professional content writer for concise, high-quality text.";
      // You can add more agent descriptions here as needed
      default:
        return getAgentDescription(agentName); // fallback to imported function
    }
  };

  // Get agent name for display
  const getAgentName = () => {
    return message.metadata?.agent_name || message.agentName || 'Assistant';
  };

  if (message.role === 'system' && message.agentName) {
    return (
      <div className="flex items-center gap-2 py-1 px-3 my-2 rounded-md text-gray-200 text-xs font-mono shadow-md">
        <span className="text-gray-400">[SYSTEM]</span>
        <ArrowRight className="text-gray-400 h-3 w-3" />
        <span className="text-emerald-400">Agent: {message.content}</span>
      </div>
    );
  }
  
  // Skip rendering tool messages - they're handled in ChatMessages.tsx
  if (message.role === 'tool' && message.toolAction !== 'annotations') {
    return null;
  }
  
  // Handle annotations differently - they're still processed here but only for display
  if (message.role === 'tool' && message.toolAction === 'annotations') {
    // This entire block should be removed as per the request to remove annotation handling
    return null; 
  }

  const isFileQuickAction = (content: string) => {
    return typeof content === 'string' && 
          (content.startsWith('<FILE_QUICK_ACTION>') || 
           content.startsWith('Analyze this document:'));
  };

  const parseFileQuickAction = (content: string) => {
    if (!isFileQuickAction(content)) return null;
    
    if (content.startsWith('Analyze this document:')) {
      try {
        const filenameMatch = content.match(/Analyze this document: "([^"]+)"/);
        const filename = filenameMatch ? filenameMatch[1] : "document";
        
        const actionMatch = content.match(/Analyze this document: "[^"]+"\.?[^\.]+/);
        const action = actionMatch ? actionMatch[1].trim() : "Analyze";
        
        return {
          filename,
          action,
          file_id: "unknown"
        };
      } catch (e) {
        return null;
      }
    }
    
    if (content.startsWith('<FILE_QUICK_ACTION>')) {
      const lines = content.split('\n');
      const result: {[key: string]: string} = {};
      
      for (let i = 1; i < lines.length - 1; i++) {
        const line = lines[i].trim();
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
          const key = line.substring(0, colonIndex).trim();
          const value = line.substring(colonIndex + 1).trim();
          result[key] = value;
        }
      }
      
      return result;
    }
    
    return null;
  };

  if (message.role === 'user') {
    // Clean the content to remove scenario context
    const cleanedContent = cleanMessageContent(message.content);
    
    if (typeof cleanedContent === 'string' && isFileQuickAction(cleanedContent)) {
      const actionData = parseFileQuickAction(cleanedContent);
      if (actionData) {
        return (
          <div className="inline-block w-auto mb-8 py-3 px-4 relative group"
            style={{
              background: '#FFF',
              border: '1px solid #E8E8E5',
              borderRadius: '16px',
              color: '#232323',
              fontSize: '14px',
              fontFamily: 'Inter',
              fontStyle: 'normal',
              fontWeight: 400,
              lineHeight: '20px',
              marginLeft: '0',
              textAlign: 'left',
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-gray-600" />
              <span className="font-medium text-sm">{actionData.filename}</span>
            </div>
            <div className="text-sm flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-gray-600" />
              <span><span className="font-medium">Action:</span> {actionData.action}</span>
            </div>
          </div>
        );
      }
    }
    
    if (typeof cleanedContent === 'string' && cleanedContent.includes('Document content:')) {
      try {
        let fileActionMessage = false;
        let filename = "";
        let action = "";

        const analyzeMatch = cleanedContent.match(/Analyze this document: "([^"]+)"\.?[^\.]+/);
        if (analyzeMatch) {
          fileActionMessage = true;
          filename = analyzeMatch[1] || "document";
          action = analyzeMatch[2]?.trim() || "Analyze";
        } else {
          const titleMatch = cleanedContent.match(/^([^|\.]+)(\s*\|\s*[^\.]+)?\s*Action:\s*(.+?)(?=\s*Document content:)/s);
          if (titleMatch) {
            fileActionMessage = true;
            filename = titleMatch[1]?.trim() || "document";
            action = titleMatch[3]?.trim() || "Analyze";
          }
        }

        if (fileActionMessage) {
          return (
            <div className="inline-block w-auto mb-8 py-3 px-4 relative group"
              style={{
                background: '#FFF',
                border: '1px solid #E8E8E5',
                borderRadius: '16px',
                color: '#232323',
                fontSize: '14px',
                fontFamily: 'Inter',
                fontStyle: 'normal',
                fontWeight: 400,
                lineHeight: '20px',
                marginLeft: '0',
                textAlign: 'left',
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-gray-600" />
                <span className="font-medium text-sm">{filename}</span>
              </div>
              <div className="text-sm flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-gray-600" />
                <span><span className="font-medium">Action:</span> {action}</span>
              </div>
            </div>
          );
        }

        const contentParts = cleanedContent.split('Document content:');
        const displayContent = contentParts[0].trim();
        
        return (
          <div className="inline-block w-auto mb-8 py-3 px-4 relative group"
            style={{
              background: '#FFF',
              border: '1px solid #E8E8E5',
              borderRadius: '16px',
              color: '#232323',
              fontSize: '14px',
              fontFamily: 'Inter',
              fontStyle: 'normal',
              fontWeight: 400,
              lineHeight: '20px',
              marginLeft: '0',
              textAlign: 'left',
            }}
          >
            <div>{displayContent}</div>
          </div>
        );
      } catch (e) {
        const contentParts = cleanedContent.split('Document content:');
        const displayContent = contentParts[0].trim();
        
        return (
          <div className="inline-block w-auto mb-8 py-3 px-4 relative group"
            style={{
              background: '#FFF',
              border: '1px solid #E8E8E5',
              borderRadius: '16px',
              color: '#232323',
              fontSize: '14px',
              fontFamily: 'Inter',
              fontStyle: 'normal',
              fontWeight: 400,
              lineHeight: '20px',
              marginLeft: '0',
              textAlign: 'left',
            }}
          >
            <div>{displayContent}</div>
          </div>
        );
      }
    }
    
    return (
      <div className="inline-block w-auto mb-8 py-3 px-4 relative group"
        style={{
          background: '#FFF',
          border: '1px solid #E8E8E5',
          borderRadius: '16px',
          color: '#232323',
          fontSize: '14px',
          fontFamily: 'Inter',
          fontStyle: 'normal',
          fontWeight: 400,
                  lineHeight: '20px',
        marginLeft: '0',
        textAlign: 'left',
      }}
    >
      <div>{cleanedContent}</div>
    </div>
  );
}

  if (message.role === 'error') {
    return (
      <div className="inline-block w-auto mb-8 py-3 px-4 rounded-[16px] text-red-700"
        style={{
          background: '#FFF'
        }}
      >
        <div>{message.content}</div>
      </div>
    );
  }

  // For assistant messages, render as collapsible dropdown
  const agentName = getAgentName();
  const displayAgentName = getDisplayAgentName(agentName);
  const AgentIcon = getAgentIcon(agentName);

  // Add Actions component
  const ActionsBlock = ({ onSendMessage }: { onSendMessage?: (payload: { message: string; type?: 'research' | 'chat'; agent?: string }) => void }) => {
    if (!onSendMessage) return null;

    return (
      <div className="mt-6 pt-4 border-t border-gray-100">
        <div className="mb-3" style={{ fontSize: '16px', fontStyle: 'normal', fontWeight: 500, lineHeight: '24px', color: 'var(--Monochrome-Black, #232323)' }}>Actions</div>
        
        {/* Horizontal scrollable container */}
        <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
          <div className="flex gap-3" style={{ minWidth: 'fit-content' }}>
            {/* Make Flashcards */}
            <button
              onClick={() => onSendMessage({ message: 'Create flashcards based on our conversation', type: 'chat', agent: 'Flash Card Maker' })}
              className="transition-all duration-200 text-gray-700 hover:text-gray-800 hover:bg-gray-50 whitespace-nowrap flex-shrink-0"
              style={{
                display: 'flex',
                padding: '8px 12px',
                alignItems: 'center',
                gap: '8px',
                borderRadius: '12px',
                border: '1px solid var(--Monochrome-Light, #E8E8E5)',
                height: '40px',
                minWidth: 'fit-content'
              }}
            >
              <div 
                style={{
                  width: '24px',
                  height: '24px',
                  background: '#70D6FF',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  flexShrink: 0
                }}
              >
                🧠
              </div>
              <div className="font-medium text-sm whitespace-nowrap">Make Flashcards</div>
            </button>

            {/* Make Presentation */}
            <button
              onClick={() => onSendMessage({ message: 'Create a presentation about our conversation', type: 'chat', agent: 'Presentation Creator Agent' })}
              className="transition-all duration-200 text-gray-700 hover:text-gray-800 hover:bg-gray-50 whitespace-nowrap flex-shrink-0"
              style={{
                display: 'flex',
                padding: '8px 12px',
                alignItems: 'center',
                gap: '8px',
                borderRadius: '12px',
                border: '1px solid var(--Monochrome-Light, #E8E8E5)',
                height: '40px',
                minWidth: 'fit-content'
              }}
            >
              <div 
                style={{
                  width: '24px',
                  height: '24px',
                  background: '#FF70A6',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  flexShrink: 0
                }}
              >
                📊
              </div>
              <div className="font-medium text-sm whitespace-nowrap">Make Presentation</div>
            </button>

            {/* Compose Text */}
            <button
              onClick={() => onSendMessage({ message: 'Please based on our conversation write a text document', type: 'chat', agent: 'Content Writer Agent' })}
              className="transition-all duration-200 text-gray-700 hover:text-gray-800 hover:bg-gray-50 whitespace-nowrap flex-shrink-0"
              style={{
                display: 'flex',
                padding: '8px 12px',
                alignItems: 'center',
                gap: '8px',
                borderRadius: '12px',
                border: '1px solid var(--Monochrome-Light, #E8E8E5)',
                height: '40px',
                minWidth: 'fit-content'
              }}
            >
              <div 
                style={{
                  width: '24px',
                  height: '24px',
                  background: '#FFD670',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  flexShrink: 0
                }}
              >
                ✍️
              </div>
              <div className="font-medium text-sm whitespace-nowrap">Compose Text</div>
            </button>

            {/* Make Web Research */}
            <button
              onClick={() => onSendMessage({ message: 'Research this topic on the web and compose a comprehensive text summary', type: 'research', agent: 'Deep Web Researcher' })}
              className="transition-all duration-200 text-gray-700 hover:text-gray-800 hover:bg-gray-50 whitespace-nowrap flex-shrink-0"
              style={{
                display: 'flex',
                padding: '8px 12px',
                alignItems: 'center',
                gap: '8px',
                borderRadius: '12px',
                border: '1px solid var(--Monochrome-Light, #E8E8E5)',
                height: '40px',
                minWidth: 'fit-content'
              }}
            >
              <div 
                style={{
                  width: '24px',
                  height: '24px',
                  background: '#FF9770',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  flexShrink: 0
                }}
              >
                🔍
              </div>
              <div className="font-medium text-sm whitespace-nowrap">Make Research</div>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div 
      className="w-full mb-8 relative group streaming-content"
      style={{
        background: 'var(--Monochrome-White, #FFF)'
      }}
      id={`message-${message.id}`}
    >
      {notification && (
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 bg-[#232323] bg-opacity-80 text-white px-4 py-2 rounded shadow-lg z-[9999] text-sm">
          {notification}
        </div>
      )}
      
      <div className="px-4 py-4">
        {/* Edit Controls */}
        {isEditing && (
          <div className="flex items-center gap-2 mb-3">
            <Button
              onClick={handleSaveEdit}
              variant="ghost"
              size="sm"
              className={cn(
                "text-slate-500 hover:bg-gray-100 rounded-md cursor-pointer transition-colors",
                !message.content && "opacity-50 cursor-not-allowed"
              )}
              style={{
                display: 'flex',
                padding: '0 12px',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '4px',
                width: '85px',
                fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
              }}
            >
            </Button>
          </div>
        )}
        
        {/* File Info */}
        {message.hasFile && message.fileName && (
          <div className="flex items-center gap-2 mb-3">
            <File className="text-blue-500 h-4 w-4" />
            <span className="text-sm text-blue-700 truncate">{message.fileName}</span>
          </div>
        )}
        
        {/* Reasoning Section */}
        {hasReasoning && (
          <div className="mb-4">
            <button
              onClick={() => setShowReasoning(!showReasoning)}
              className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors p-2 rounded-lg hover:bg-gray-50"
            >
              <Brain className="h-4 w-4 text-gray-600" />
              <span>{showReasoning ? 'Hide' : 'Show'} Reasoning Process</span>
              {isStreaming && (
                <span className="text-xs text-gray-600 font-medium">thinking</span>
              )}
              {showReasoning ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            
            {showReasoning && (
              <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                {renderReasoningContent(reasoningContent)}
              </div>
            )}
          </div>
        )}
        
        {/* Message Content */}
        <MessageBodyRenderer
          message={message}
          isEditing={isEditing}
          isStreaming={isStreaming}
          editTextareaRef={editTextareaRef as React.RefObject<HTMLTextAreaElement>}
          editedContent={editedContent}
          setEditedContent={setEditedContent}
          handleKeyDown={handleKeyDown}
          onLinkSubmit={handleLinkSubmitInternal}
          loadingLinkId={loadingLinkId}
          setLoadingLinkId={setLoadingLinkId}
          setNotification={setNotification}
          isResearchResponseResult={isResearchResponseResult}
          onCopy={onCopy}
          isSpeaking={isSpeaking}
          isLoadingSpeech={isLoadingSpeech}
          handleSpeak={handleSpeak}
          isMobile={isMobile}
          onWriteTextComplete={onWriteTextComplete}
          onOpenNotes={onOpenNotes}
          onOpenFlashcards={onOpenFlashcards}
          onCVComplete={onCVComplete}
          onOpenCV={onOpenCV}
          onOpenPresentations={onOpenPresentations}
          onMobileTabChange={onMobileTabChange}
          autoAddSources={autoAddSources}
        />

        {/* Actions Block - show after assistant messages when not streaming */}
        {message.role === 'assistant' && !isStreaming && !isEditing && (
          <ActionsBlock onSendMessage={onSendMessage} />
        )}
      </div>
      
      {/* File Detail Modal */}
      {selectedFile && (
        <FileDetailModal 
          file={selectedFile} 
          onClose={() => setSelectedFile(null)}
          onSendMessage={handleSendMessage}
          onFileQuickAction={handleFileQuickAction}
        />
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Use fast-deep-equal for better performance and accuracy
  if (prevProps.message.id !== nextProps.message.id) return false;
  if (prevProps.message.role !== nextProps.message.role) return false;
  if (prevProps.message.content !== nextProps.message.content) return false;
  if (!equal(prevProps.message.metadata, nextProps.message.metadata)) return false;
  if (!equal(prevProps.cachedMetadata, nextProps.cachedMetadata)) return false;
  if (prevProps.onCopy !== nextProps.onCopy) return false;
  if (prevProps.onDelete !== nextProps.onDelete) return false;
  if (prevProps.onEdit !== nextProps.onEdit) return false;
  if (prevProps.onLinkSubmit !== nextProps.onLinkSubmit) return false;
  if (prevProps.onFileSelect !== nextProps.onFileSelect) return false;
  if (prevProps.isStreaming !== nextProps.isStreaming) return false;
  if (prevProps.onOpenNotes !== nextProps.onOpenNotes) return false;
  if (prevProps.onOpenFlashcards !== nextProps.onOpenFlashcards) return false;
  if (prevProps.onFlashCardComplete !== nextProps.onFlashCardComplete) return false;
  if (prevProps.onCVComplete !== nextProps.onCVComplete) return false;
  if (prevProps.onOpenCV !== nextProps.onOpenCV) return false;
  if (prevProps.onOpenPresentations !== nextProps.onOpenPresentations) return false;
  if (prevProps.autoAddSources !== nextProps.autoAddSources) return false;
  
  return true;
});
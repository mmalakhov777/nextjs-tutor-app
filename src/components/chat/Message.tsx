import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import React from 'react';
import Image from 'next/image';
import { Copy, ArrowRight, File, ChevronDown, ChevronRight, Download, Search, FileText, AlertCircle, Loader2, Trash2, Pencil, Share2, Check, Link, ExternalLink, Volume2, VolumeX, Users, X, Info, Plus, Settings, Wrench, Shield, UserCircle, Brain, Globe, Sparkles, BookOpen, Code, Lightbulb, ChevronDown as ChevronDownIcon, ChevronUp } from 'lucide-react';
import { Message as MessageType } from '@/types/chat';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import DeleteIcon from '@/components/icons/DeleteIcon';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { speakText, stopSpeaking } from '@/services/audioService';
import { GrokXLogo } from '@/components/icons/GrokXLogo';
import { TriageAgentLogo } from '@/components/icons/TriageAgentLogo';
import { ClaudeCreativeLogo } from '@/components/icons/ClaudeCreativeLogo';
import { DeepSeekLogo } from '@/components/icons/DeepSeekLogo';
import { MistralLogo } from '@/components/icons/MistralLogo';
import { PerplexityLogo } from '@/components/icons/PerplexityLogo';
import { FileDetailModal } from './FileDetailModal';
import { UploadedFile } from '@/types/chat';
import { MessageContent, MessageContentProps } from './MessageContent';
import FileAnnotations from './FileAnnotations';
import FileCitationBadges, { Citation } from './FileCitationBadges';
import AgentBadge from './AgentBadge';
import MessageActions from './MessageActions';
import CitationControls from './CitationControls';
import { getFileMetadataFromLocalStorage, saveFileMetadataToLocalStorage } from '@/utils/fileStorage';
import { getAgentDescription } from '@/data/agentDescriptions';

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

interface FileCitation {
  file_id: string;
  index: number;
  type: string;
  filename: string;
  raw_content?: string;
}

interface DebugState {
  fileContents: Record<string, string | null>;  
  isLoading: boolean;
  error: string | null;
}

interface MessageProps {
  message: MessageType & {
    toolName?: string;
    citations?: FileCitation[];
    toolAction?: 'call' | 'output' | 'annotations';
    sessionId?: string;
    metadata?: {
      agent_name?: string;
      event_type?: string;
      provider?: string;
    };
    currentAgent?: string;
    provider?: string;
  };
  onCopy: (content: string) => void;
  onDelete?: (message: MessageType) => void;
  onEdit?: (message: MessageType) => void;
  onLinkSubmit?: (url: string) => Promise<void>;
  onFileSelect?: (file: UploadedFile) => void;
  annotations?: MessageType & {
    toolAction: 'annotations';
    toolName?: string;
  };
  currentAgent?: string;
  cachedMetadata?: Record<string, any>; 
}

export const Message = React.memo(function Message({ message, onCopy, onDelete, onEdit, onLinkSubmit, onFileSelect, annotations: propAnnotations, currentAgent, cachedMetadata = {} }: MessageProps) {
  
  useEffect(() => {
    
  }, [message.id, propAnnotations]);

  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoadingEnhancedText, setIsLoadingEnhancedText] = useState(false);
  const [enhancedText, setEnhancedText] = useState<string | null>(null);
  const [hasCitationsIncluded, setHasCitationsIncluded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [fileContents, setFileContents] = useState<Record<string, string | null>>({});
  const [editedContent, setEditedContent] = useState(message.content);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [fileMetadata, setFileMetadata] = useState<Record<string, any>>({});
  const [isLoadingMetadata, setIsLoadingMetadata] = useState<Record<string, boolean>>({});
  const [citationStyle, setCitationStyle] = useState<string>("apa");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoadingSpeech, setIsLoadingSpeech] = useState(false);
  const [shouldFetchMetadata, setShouldFetchMetadata] = useState(false);
  const [syntheticAnnotations, setSyntheticAnnotations] = useState<any>(null);
  const [notification, setNotification] = useState<string | null>(null);
  
  const [hasStableFileAnnotations, setHasStableFileAnnotations] = useState(false);
  
  
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  
  
  const tooltipRef = useRef<HTMLDivElement>(null);
  
  
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null);
  
  
  const [loadingFileId, setLoadingFileId] = useState<string | null>(null);
  const [loadingLinkId, setLoadingLinkId] = useState<string | null>(null);
  
  
  const isStreaming = message.role === 'assistant' && message.content === '';
  
  
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
  
  const handleLinkSubmit = async (url: string) => {
    if (onLinkSubmit) {
      setLoadingLinkId(url);
      try {
        console.log("Message component submitting link:", url);
        await onLinkSubmit(url);
        console.log("Link submitted successfully in Message component");
        return Promise.resolve(); // Success
      } catch (error) {
        console.error("Error submitting link in Message component:", error);
        
        // Use a custom event to signal an error without blocking the promise chain
        const errorMessage = error instanceof Error ? error.message : String(error);
        try {
          // Create and dispatch event in a way that works in all browsers
          const errorEvent = document.createEvent('CustomEvent');
          errorEvent.initCustomEvent('link-submission-error', true, true, { 
            url, 
            error: errorMessage 
          });
          window.dispatchEvent(errorEvent);
          
          // Fallback - also try new CustomEvent syntax
          const modernEvent = new CustomEvent('link-submission-error', {
            detail: { url, error: errorMessage },
            bubbles: true,
            cancelable: true
          });
          window.dispatchEvent(modernEvent);
        } catch (eventError) {
          console.error("Error dispatching error event:", eventError);
        }
        
        // Return a successful promise to prevent blocking
        return Promise.resolve();
      } finally {
        setLoadingLinkId(null);
      }
    }
    
    // Always return a resolved promise
    return Promise.resolve();
  };
  
  
  const handleFileQuickAction = (file: UploadedFile, action: string, content: string) => {
    
    
  };
  
  
  const annotations = propAnnotations || syntheticAnnotations;
  
  
  const handleFileClick = async (fileId: string, filename: string) => {
    try {
      // Set loading state for this file
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
      
      if (!response.ok) {
        throw new Error(`Failed to fetch file details: ${response.status}`);
      }
      
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
      } catch (contentError) {
        
        
      }
      
      
      if (fileData.chatSessionId) {
        try {
          const metadataResponse = await fetch(`${backendUrl}/api/files?chat_session_id=${encodeURIComponent(fileData.chatSessionId)}`);
          if (metadataResponse.ok) {
            const allFiles = await metadataResponse.json();
            if (Array.isArray(allFiles)) {
              const enrichedFile = allFiles.find(f => f.id === fileId);
              if (enrichedFile) {
                
                Object.assign(fileData, enrichedFile);
              }
            }
          }
        } catch (metadataError) {
          
        }
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
      
      
      if (onFileSelect) {
        onFileSelect(file);
      } else {
        
        setSelectedFile(file);
      }
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
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  
  const extractFileIdsFromMetadata = (msg: MessageType & { metadata?: any }): string[] => {
    const fileIds: string[] = [];
    
    if (!msg.metadata) return fileIds;
    
    
    if (msg.metadata.citations && Array.isArray(msg.metadata.citations)) {
      msg.metadata.citations.forEach((citation: any) => {
        if (citation.file_id && !fileIds.includes(citation.file_id)) {
          fileIds.push(citation.file_id);
        }
      });
    }
    
    
    if (typeof msg.content === 'string' && 
        msg.content.includes('AnnotationFileCitation')) {
      const matches = msg.content.match(/file_id='([^']+)'/g) || [];
      
      matches.forEach(match => {
        const fileId = match.replace("file_id='", "").replace("'", "");
        if (fileId && !fileIds.includes(fileId)) {
          fileIds.push(fileId);
        }
      });
    }
    
    
    if (msg.metadata.has_citations && 
        typeof msg.content === 'string' && 
        msg.content.includes('(') && 
        msg.content.includes(')') && 
        (msg.content.includes('cited in') || msg.content.includes('et al') || 
         msg.content.includes('citation'))) {
      
      
      
      const worksCitedMatch = msg.content.match(/Works Cited:[\s\S]+/);
      if (worksCitedMatch) {
        
        
        setShouldFetchMetadata(true);
      }
    }
    
    
    return fileIds;
  };
  
  
  useEffect(() => {
    if (message.role === 'assistant' && message.metadata?.has_citations && !annotations) {
      const fileIds = extractFileIdsFromMetadata(message);
      
      
      
      if (fileIds.length > 0) {
        
        
        
      }
    }
  }, [message.id, message.metadata, message.role, message.content, annotations]);
  
  
  useEffect(() => {
    if (!propAnnotations && 
        message.role === 'assistant' && 
        message.metadata?.has_citations && 
        message.metadata?.citations && 
        Array.isArray(message.metadata.citations) && 
        message.metadata.citations.length > 0) {
      
      
      
      
      const citationStrings = message.metadata.citations.map((citation: any, index: number) => {
        return `AnnotationFileCitation(file_id='${citation.file_id}', index=${index}, type='file_citation', filename='${citation.filename || "document.pdf"}')`;
      });
      
      const annotationContent = `annotations=[ ${citationStrings.join(', ')} ]`;
      
      const synthetic = {
        role: 'tool' as MessageType['role'],
        content: annotationContent,
        toolAction: 'annotations' as const,
        toolName: 'file_citations',
        timestamp: message.timestamp
      };
      
      setSyntheticAnnotations(synthetic);
      
      
      
      
      
    }
  }, [message.metadata, propAnnotations, message.role, message.timestamp]);
  
  
  useEffect(() => {
    if (enhancedText) {
      
      setHasCitationsIncluded(true);
      
      
    }
  }, [enhancedText]);
  
  
  const fetchFileMetadata = useCallback(async (fileId: string) => {
    
    if (fileMetadata[fileId] || isLoadingMetadata[fileId]) return;
    
    
    if (cachedMetadata[fileId]) {
      
      setFileMetadata(prev => ({ 
        ...prev, 
        [fileId]: cachedMetadata[fileId]
      }));
      return;
    }
    
    
    setIsLoadingMetadata(prev => ({ ...prev, [fileId]: true }));
    
    try {
      
      
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/files/${fileId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch file metadata: ${response.status}`);
      }
      
      const data = await response.json();
      
      
      
      if (data.chatSessionId) {
        const fullResponse = await fetch(`${backendUrl}/api/files?chat_session_id=${encodeURIComponent(data.chatSessionId)}`);
        
        if (fullResponse.ok) {
          const fullData = await fullResponse.json();
          
          
          if (Array.isArray(fullData)) {
            const fileData = fullData.find(file => file.id === fileId);
            if (fileData && fileData.document) {
              
              setFileMetadata(prev => ({ 
                ...prev, 
                [fileId]: {
                  file_name: fileData.name,
                  doc_authors: fileData.document.authors || [],
                  doc_publication_year: fileData.document.publication_year,
                  doc_type: fileData.document.type
                }
              }));
              setIsLoadingMetadata(prev => ({ ...prev, [fileId]: false }));
              return;
            }
          }
        }
      }
      
      
      setFileMetadata(prev => ({ 
        ...prev, 
        [fileId]: {
          file_name: data.name || fileId
        }
      }));
    } catch (error) {
      
      
      setFileMetadata(prev => ({ 
        ...prev, 
        [fileId]: {
          file_name: fileId
        }
      }));
    } finally {
      setIsLoadingMetadata(prev => ({ ...prev, [fileId]: false }));
    }
  }, [fileMetadata, isLoadingMetadata, cachedMetadata]);

  

  
  useEffect(() => {
    if (shouldFetchMetadata && annotations) {
      
      const timeoutId = setTimeout(() => {
        
        
        const citations = parseCitations(annotations.content);
        
        if (citations.length > 0) {
          
          
        }
        
        
        setShouldFetchMetadata(false);
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [shouldFetchMetadata, annotations]);

  
  useEffect(() => {
    
    if (!isStreaming && message.role === 'assistant' && message.content !== '' && annotations) {
      const timeoutId = setTimeout(() => {
        
        
        
        
        
        
        
        
        
        
        
      }, 300);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isStreaming, message.content, message.role, annotations]);

  
  const ensureAnnotationsAvailable = useCallback(async () => {
    
    if (annotations || !message.metadata?.has_citations) return null;
    
    
    if (message.role === 'assistant' && 
        (message.metadata?.has_citations || message.content.includes('citation')) && 
        message.sessionId && 
        message.id) {
      
      
      
      try {
        const backendUrl = getBackendUrl();
        const toolResponse = await fetch(
          `${backendUrl}/api/chat-sessions/${message.sessionId}/messages?role=tool&toolAction=annotations`
        );
        
        if (!toolResponse.ok) {
          throw new Error(`Failed to fetch annotations: ${toolResponse.status}`);
        }
        
        const toolData = await toolResponse.json();
        
        
        let annotationContent = null;
        
        if (Array.isArray(toolData) && toolData.length > 0) {
          
          const sortedToolMessages = [...toolData].sort((a, b) => {
            const timeA = new Date(a.created_at).getTime();
            const timeB = new Date(b.created_at).getTime();
            
            
            const messageTime = message.timestamp?.getTime() || Date.now();
            
            
            return Math.abs(timeA - messageTime) - Math.abs(timeB - messageTime);
          });
          
          
          const closestToolMessage = sortedToolMessages[0];
          if (closestToolMessage && closestToolMessage.content) {
            annotationContent = closestToolMessage.content;
          }
        }
        
        if (annotationContent) {
          
          const fetchedAnnotations = {
            role: 'tool' as MessageType['role'],
            toolAction: 'annotations' as const,
            content: annotationContent,
            toolName: 'file_citations',
            timestamp: message.timestamp
          };
          
          
          setSyntheticAnnotations(fetchedAnnotations);
          
          
          
          
          
          return fetchedAnnotations;
        }
      } catch (error) {
        
      }
    }
    
    return null;
  }, [message.id, message.metadata, message.role, message.sessionId, message.timestamp, message.content, annotations]);

  
  useEffect(() => {
    
    if (message.role === 'assistant' && message.metadata?.has_citations && !annotations) {
      ensureAnnotationsAvailable();
    }
  }, [message.id, message.metadata, message.role, annotations, ensureAnnotationsAvailable]);

  
  useEffect(() => {
    if (
      message.role === 'assistant' && 
      message.metadata && 
      message.metadata.has_citations && 
      message.metadata.original_content
    ) {
      
      if (message.metadata.original_content !== message.content) {
        
        
        
        
        
        
        let enhancedContent = message.content;
        
        
        
        const isPageReload = window.performance && 
          (window.performance.navigation?.type === 1 || 
           window.performance.getEntriesByType('navigation').some(
             (entry: any) => entry.type === 'reload'
           ));
        
        if (isPageReload) {
          
          enhancedContent = enhancedContent.trim() + '\u200B';
          
        }
        
        setEnhancedText(enhancedContent);
        setHasCitationsIncluded(true);
        setCitationStyle(message.metadata.citation_style || 'apa');
        
        
        setTimeout(() => {
          
          const messageElement = document.getElementById(`message-${message.id}`);
          if (messageElement) {
            messageElement.classList.add('preserve-whitespace');
            const paragraphs = messageElement.querySelectorAll('p');
            paragraphs.forEach(p => {
              p.classList.add('whitespace-pre-wrap');
              
              
              if (p.innerHTML.includes('&nbsp;&nbsp;') || p.innerHTML.includes('\u00A0\u00A0')) {
                p.classList.add('has-doubled-spaces');
              }
            });
            
          }
        }, 100);
        
        
        if (!annotations && message.content.includes('citation')) {
          
          
          
          
          
          
          
          
          
          
          
          
          
          
          
          
          
          
          
          
          
          
        }
      }
    }
  }, [message.id, message.metadata, message.content, message.role, annotations]);

  
  useEffect(() => {
    
    const isPageReload = window.performance && 
      window.performance.navigation && 
      window.performance.navigation.type === 1;
    
    if (isPageReload && 
        message.role === 'assistant' && 
        message.metadata?.has_citations && 
        enhancedText) {
      
      
      
      setHasCitationsIncluded(true);
      
      
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
          const container = document.querySelector('.message-content-container');
          if (container) {
            container.classList.add('preserve-whitespace');
          }
        }, 200);
      });
    }
  }, [message.role, message.metadata, enhancedText]);

  
  const parseCitations = (content: string): Citation[] => {
    try {
      
      if (content.startsWith('annotations=')) {
        
        
        const contentWithoutPrefix = content.replace(/^annotations=\s*\[\s*|\s*\]\s*$/g, '');
        
        const matches = contentWithoutPrefix.match(/AnnotationFileCitation\(([^)]+)\)/g);
        
        if (matches) {
          
          return matches.map(match => {
            
            const paramsStr = match.slice(match.indexOf('(') + 1, match.lastIndexOf(')'));
            
            
            const parts = paramsStr.match(/([^,]+='[^']*'|[^,]+=[^,]+)/g) || [];
            
            const obj: Record<string, string> = {};
            parts.forEach(part => {
              const [key, value] = part.trim().split('=');
              
              obj[key] = value.replace(/^'|'$/g, '').replace(/\\'/g, "'");
            });

            return {
              file_id: obj.file_id,
              index: parseInt(obj.index),
              type: obj.type,
              filename: obj.filename
            };
          });
        }
      }
      
      
      if (content.includes('AnnotationFileCitation')) {
        const matches = content.match(/AnnotationFileCitation\(([^)]+)\)/g);
        if (matches) {
          return matches.map(match => {
            
            const paramsStr = match.slice(match.indexOf('(') + 1, match.lastIndexOf(')'));
            
            
            const parts = paramsStr.match(/([^,]+='[^']*'|[^,]+=[^,]+)/g) || [];
            
            const obj: Record<string, string> = {};
            parts.forEach(part => {
              const [key, value] = part.trim().split('=');
              
              obj[key] = value.replace(/^'|'$/g, '').replace(/\\'/g, "'");
            });

            return {
              file_id: obj.file_id,
              index: parseInt(obj.index),
              type: obj.type,
              filename: obj.filename
            };
          });
        }
      }
      
      
      try {
        const contentObj = JSON.parse(content);
        if (Array.isArray(contentObj.annotations)) {
          return contentObj.annotations
            .filter((ann: FileAnnotation) => ann.type === 'file_citation')
            .map((ann: FileAnnotation) => ({
              file_id: ann.file_citation.file_id,
              index: ann.file_citation.index,
              type: 'file_citation',
              filename: ann.file_citation.filename
            }));
        }
      } catch (jsonError) {
        
      }
    } catch (e) {
      
      
    }
    return [];
  };

  
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

  
  const handleCopyWithCitations = async (style: string = citationStyle) => {
    if (!annotations) return;
    
    try {
      setIsLoadingEnhancedText(true);
      
      
      const citations = parseCitations(annotations.content);
      
      
      if (hasCitationsIncluded) {
        setHasCitationsIncluded(false);
      }
      
      
      const originalParagraphs = message.content.split(/\n\s*\n/);
      
      
      const requestBody = {
        message_content: message.content,
        citations: citations.map(citation => ({
          file_id: citation.file_id,
          index: citation.index,
          filename: citation.filename
        })),
        citation_style: style,
        preserve_formatting: true 
      };
      
      
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/citations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      
      const data = await response.json();
       
      
      if (!data.enhanced_message) {
        throw new Error('No enhanced text received from server');
      }

      
      const enhancedMessage = data.enhanced_message;
      
      // Temporary log to show exactly what's being stored
      console.log('DEBUG - Storing enhanced message in database:');
      console.log('Enhanced HTML content being stored:', enhancedMessage);
      
      setEnhancedText(enhancedMessage);
      setHasCitationsIncluded(true);
      
      
      if (message.id && message.sessionId) {
        try {
          
          
          
          const enhancedMetadata = {
            ...message.metadata || {},
            citation_style: style,
            has_citations: true,
            enhanced_at: new Date().toISOString(),
            original_content: message.content,
            citations: citations.map(c => ({
              file_id: c.file_id,
              index: c.index,
              filename: c.filename
            }))
          };
          
          console.log('DEBUG - Message update payload:');
          console.log({
            content: enhancedMessage,
            metadata: enhancedMetadata
          });
          
          const updateResponse = await fetch(`${backendUrl}/api/chat-sessions/${message.sessionId}/messages/${message.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              content: enhancedMessage,
              metadata: enhancedMetadata
            }),
          });
          
          if (!updateResponse.ok) {
            throw new Error(`Database update failed with status ${updateResponse.status}`);
          }
          
          const updateResult = await updateResponse.json();
          
          
        } catch (dbError) {
          
          
        }
      } else {
         
      }
    } catch (error) {
      
      alert('Failed to process citations. Please try again.');
    } finally {
      setIsLoadingEnhancedText(false);
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
    if (onEdit && editedContent !== message.content) {
      onEdit({ ...message, content: editedContent });
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedContent(message.content);
  };

  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
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
      
      
      const textToSpeak = enhancedText || message.content;
      
      
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

  
  const getAgentIcon = (agentName: string) => {
    switch(agentName) {
      case "Triage Agent":
      case "General Assistant":
      case "Deep Thinker":
        return <TriageAgentLogo className="h-4 w-4" />;
      case "Grok X":
        return <GrokXLogo className="h-4 w-4" />;
      case "Mistral Europe":
        return <MistralLogo className="h-4 w-4" />;
      case "Claude Creative":
        return <ClaudeCreativeLogo className="h-4 w-4" />;
      case "Deep Seek":
        return <DeepSeekLogo className="h-4 w-4" />;
      case "Perplexity":
        return <PerplexityLogo className="h-4 w-4" />;
      default:
        return <UserCircle className="h-4 w-4" />;
    }
  };

  
  const getAgentCircleColor = (agentName: string) => {
    switch(agentName) {
      case "Triage Agent":
      case "General Assistant":
        return "bg-emerald-500"; 
      case "Claude Creative":
        return "rounded-[1000px] border border-[#E8E8E5] bg-[#D77655]"; 
      case "Deep Seek":
        return "rounded-[1000px] border border-[#E8E8E5] bg-[#4D6BFE]"; 
      case "Mistral Europe":
        return "rounded-[1000px] border border-[#E8E8E5] bg-[#FA5310]"; 
      case "Perplexity":
        return "rounded-[1000px] border border-[#E8E8E5] bg-[#1F1F1F]"; 
      case "Deep Thinker":
        return "rounded-[1000px] border border-[#E8E8E5] bg-black"; 
      case "Grok X":
        return "bg-black"; 
      default:
        return "bg-white border border-slate-200";
    }
  };

  
  const getIconTextColor = (agentName: string) => {
    switch(agentName) {
      case "Triage Agent":
      case "General Assistant":
      case "Claude Creative":
      case "Grok X":
      case "Deep Seek":
      case "Mistral Europe":
      case "Perplexity":
      case "Deep Thinker":
        return "text-white"; 
      default:
        return "text-slate-800"; 
    }
  };

  
  const getDisplayAgentName = (agentName: string) => {
    
    if (agentName === "Triage Agent") {
      return "General Assistant";
    }
    return agentName;
  };

  
  useEffect(() => {
    if (propAnnotations || syntheticAnnotations || (message.metadata?.has_citations && message.citations && message.citations.length > 0)) {
      setHasStableFileAnnotations(true);
    }
  }, [propAnnotations, syntheticAnnotations, message.metadata?.has_citations, message.citations]);

  
  // Add a comprehensive helper function for research response detection
  const isResearchResponse = useCallback((message: MessageType & any): boolean => {
    // Check for explicit Research agent_name or agentName
    if (message.metadata?.agent_name === 'Research' || 
        message.metadata?.agent_name === 'Research Agent' ||
        message.agentName === 'Research' || 
        message.agentName === 'Research Agent') {
      return true;
    }
    
    // Check for provider-based detection (Perplexity, Bing, etc.)
    if (message.provider === 'Perplexity' || 
        message.metadata?.provider === 'Perplexity') {
      return true;
    }
    
    // Check for web citations
    if (message.citations && 
        Array.isArray(message.citations) && 
        message.citations.some((citation: any) => 
          citation.startsWith('http') || 
          citation.includes('www.')
        )) {
      return true;
    }
    
    // Check for URL annotations
    if (message.annotations && 
        Array.isArray(message.annotations) && 
        message.annotations.some((annotation: any) => 
          annotation.type === 'url_citation' || 
          (annotation.url_citation && annotation.url_citation.url)
        )) {
      return true;
    }
    
    // Check for content that appears to be a research response
    if (typeof message.content === 'string' && 
        (message.content.includes('## Top News Headlines') || 
         (message.content.includes('[') && message.content.includes(']') && 
          message.content.includes('http')))) {
      return true;
    }
    
    return false;
  }, []);

  useEffect(() => {
    // Debug logs for research responses
    if (isResearchResponse(message)) {
      console.log('DEBUG - Research Response Detected:', {
        messageId: message.id,
        agentName: message.agentName,
        metadataAgentName: message.metadata?.agent_name,
        provider: message.provider || message.metadata?.provider
      });
    }
  }, [message, isResearchResponse]);

  
  // Add isMobile state
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkIfMobile = () => setIsMobile(typeof window !== 'undefined' && window.innerWidth < 768);
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  
  if (message.role === 'system' && message.agentName) {
    return (
      <div className="flex items-center gap-2 py-1 px-3 my-2 rounded-md text-gray-200 text-xs font-mono max-w-[90%] shadow-md">
        <span className="text-gray-400">[SYSTEM]</span>
        <ArrowRight className="text-gray-400 h-3 w-3" />
        <span className="text-emerald-400">Agent: {message.content}</span>
      </div>
    );
  }
  
  
  if (message.role === 'tool') {
    let icon = '🔧';
    let label = 'Tool Call';
    let bgColor = 'border-gray-100 text-gray-600';
    let isCollapsible = true;
    
    if (message.toolAction === 'output') {
      icon = '📊';
      label = 'Tool Result';
      bgColor = 'border-gray-100 text-gray-600';
    } else if (message.toolAction === 'annotations') {
      icon = '📑';
      label = 'Annotations';
      bgColor = 'border-yellow-200 text-yellow-800';
      isCollapsible = false;
    }

    
    if (message.toolName) {
      label = `${label}: ${message.toolName}`;
    }

    if (isCollapsible) {
      return (
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className={`group text-left mb-1 inline-flex flex-col ${isCollapsible ? 'cursor-pointer' : ''}`}
        >
          <div className={cn(
            "inline-flex items-center gap-2 py-0.5 px-2 rounded text-xs font-medium",
            "border border-gray-100/50 text-gray-500",
            "hover:border-gray-200/50 transition-all duration-200"
          )}>
            <span>{icon}</span>
            <span className="truncate max-w-[300px]">{label}</span>
            <ChevronRight className="h-3 w-3 group-hover:text-gray-600" />
          </div>
          
          {isExpanded && (
            <Card className="mt-1 w-auto max-w-[85%] border-gray-100">
              <CardContent className="py-2 px-3">
                <pre className="whitespace-pre-wrap font-mono text-xs overflow-x-auto rounded p-2">
                  {typeof message.content === 'string' ? message.content : JSON.stringify(message.content, null, 2)}
                </pre>
                {message.timestamp && (
                  <div className="text-xs mt-2 text-gray-500">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </button>
      );
    }

    
    if (message.toolAction === 'annotations') {
      const citations = parseCitations(message.content);
      const uniqueFileIds = Array.from(new Set(citations.map(c => c.file_id)));
      const uniqueFilenames = Array.from(new Set(citations.map(c => c.filename)));

      return (
        <div className="flex items-center gap-2 py-1 px-2 my-1 border border-yellow-100 rounded text-xs max-w-[85%] w-auto">
          <File className="h-3 w-3 text-yellow-600" />
          <span className="text-yellow-800">{uniqueFilenames.join(', ')}</span>
        </div>
      );
    }

    
    return (
      <Card className={`inline-block max-w-[85%] w-auto mb-3 ${bgColor}`}>
        <CardContent className="py-2 px-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-yellow-600">{icon}</span>
              <span className="font-medium text-sm">{label}</span>
            </div>
            {message.timestamp && (
              <div className="text-xs text-gray-500">
                {new Date(message.timestamp).toLocaleTimeString()}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-yellow-100 overflow-hidden">
            
            <div className="px-3 py-2 border-b border-yellow-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <File className="h-4 w-4 text-yellow-600" />
                  <span className="font-medium text-sm text-yellow-800">
                    {message.fileName || "Referenced Document"}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-yellow-700 hover:text-yellow-800"
                  onClick={() => {
                    
                    
                  }}
                >
                  View in Document
                </Button>
              </div>
            </div>

            
            <div className="p-3">
              <div className="font-mono text-sm rounded p-2 border border-yellow-50">
                {typeof message.content === 'string' ? message.content : JSON.stringify(message.content, null, 2)}
              </div>
              
              
              <div className="mt-2 text-xs text-gray-500">
                <span className="font-medium">Context:</span> Showing verified citation from document. Full context view coming soon.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
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
        
        
        const actionMatch = content.match(/Analyze this document: "[^"]+"\.?\s*([^\.]+)/);
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
    
    if (typeof message.content === 'string' && isFileQuickAction(message.content)) {
      const actionData = parseFileQuickAction(message.content);
      if (actionData) {
        return (
          <div className="inline-block max-w-[85%] w-auto mb-3 py-3 px-4 relative group"
            style={{
              borderRadius: '16px 16px 0px 16px',
              border: '2px solid #FF9500', 
              background: 'rgba(255, 149, 0, 0.05)', 
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-[#FF9500]" />
              <span className="font-medium text-sm">{actionData.filename}</span>
            </div>
            <div className="text-sm flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-[#FF9500]" />
              <span><span className="font-medium">Action:</span> {actionData.action}</span>
            </div>
          </div>
        );
      }
    }
    
    
    if (typeof message.content === 'string' && message.content.includes('Document content:')) {
      
      try {
        
        
        
        let fileActionMessage = false;
        let filename = "";
        let action = "";

        
        const analyzeMatch = message.content.match(/Analyze this document: "([^"]+)"\.?\s*([^\.]+)/);
        if (analyzeMatch) {
          fileActionMessage = true;
          filename = analyzeMatch[1] || "document";
          action = analyzeMatch[2]?.trim() || "Analyze";
        } 
        
        else {
          
          const titleMatch = message.content.match(/^([^|\.]+)(\s*\|\s*[^\.]+)?\s*Action:\s*(.+?)(?=\s*Document content:)/s);
          if (titleMatch) {
            fileActionMessage = true;
            filename = titleMatch[1]?.trim() || "document";
            action = titleMatch[3]?.trim() || "Analyze";
          }
        }

        
        if (fileActionMessage) {
          return (
            <div className="inline-block max-w-[85%] w-auto mb-3 py-3 px-4 relative group"
              style={{
                borderRadius: '16px 16px 0px 16px',
                border: '2px solid #FF9500', 
                background: 'rgba(255, 149, 0, 0.05)', 
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-[#FF9500]" />
                <span className="font-medium text-sm">{filename}</span>
              </div>
              <div className="text-sm flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-[#FF9500]" />
                <span><span className="font-medium">Action:</span> {action}</span>
              </div>
            </div>
          );
        }

        
        
        const contentParts = message.content.split('Document content:');
        const displayContent = contentParts[0].trim();
        
        return (
          <div className="inline-block max-w-[85%] w-auto mb-3 py-3 px-4 relative group"
            style={{
              borderRadius: '16px 16px 0px 16px',
              border: '1px solid var(--Monochrome-Light, #E8E8E5)',
              background: 'var(--Monochrome-White, #FFF)'
            }}
          >
            <div>{displayContent}</div>
          </div>
        );
      } catch (e) {
        
        
        const contentParts = message.content.split('Document content:');
        const displayContent = contentParts[0].trim();
        
        return (
          <div className="inline-block max-w-[85%] w-auto mb-3 py-3 px-4 relative group"
            style={{
              borderRadius: '16px 16px 0px 16px',
              border: '1px solid var(--Monochrome-Light, #E8E8E5)',
              background: 'var(--Monochrome-White, #FFF)'
            }}
          >
            <div>{displayContent}</div>
          </div>
        );
      }
    }
    
    
    return (
      <div className="inline-block max-w-[85%] w-auto mb-3 py-3 px-4 relative group"
        style={{
          borderRadius: '16px 16px 0px 16px',
          border: '1px solid var(--Monochrome-Light, #E8E8E5)',
          background: 'var(--Monochrome-White, #FFF)'
        }}
      >
        <div>{message.content}</div>
      </div>
    );
  }

  
  if (message.role === 'error') {
    return (
      <div className="inline-block max-w-[85%] w-auto mb-3 py-3 px-4 rounded-[16px] text-red-700"
        style={{
          background: 'var(--Monochrome-White, #FFF)'
        }}
      >
        <div>{message.content}</div>
      </div>
    );
  }

  
  return (
    <div className="inline-block w-full mb-3 py-3 px-4 relative group"
      style={{
        borderRadius: '16px',
        background: 'var(--Monochrome-White, #FFF)'
      }}
      id={`message-${message.id}`}
    >
      
      {notification && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-80 text-white px-4 py-2 rounded shadow-lg z-[60] text-sm">
          {notification}
        </div>
      )}
      
      <div className="flex items-center gap-2 mb-2">
        {isEditing && (
          <div className="flex items-center gap-2">
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
              disabled={isLoadingEnhancedText}
            >
              <span className="text-xs font-medium uppercase text-black" style={{ color: 'black' }}>{citationStyle}</span>
              <ChevronDown className="h-3 w-3 flex-shrink-0 text-black" style={{ color: 'black' }} />
            </Button>
          </div>
        )}
        <div className="flex-grow"></div>
      </div>
      
      {message.hasFile && message.fileName && (
        <div className="flex items-center gap-2 mb-2">
          <File className="text-blue-500 h-4 w-4" />
          <span className="text-sm text-blue-700 truncate">{message.fileName}</span>
        </div>
      )}
      
      <div>
        {message.role === 'assistant' ? (
          <>
            {isLoadingEnhancedText ? (
              <div className="space-y-2">
                {Array(5).fill(0).map((_, i) => {
                    
                    const width = 60 + Math.floor(Math.random() * 40);
                    return (
                      <div 
                        key={i} 
                        className="h-4 bg-slate-100 rounded animate-pulse"
                        style={{ width: `${width}%` }}
                      />
                    );
                })}
              </div>
            ) : isEditing ? (
              <div className="relative">
                <textarea
                  ref={editTextareaRef}
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full min-h-[100px] p-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y font-mono text-sm"
                  placeholder="Edit your message..."
                />
                <div className="absolute bottom-2 right-2 text-xs text-slate-400">
                  Press ⌘/Ctrl + Enter to save, Esc to cancel
                </div>
              </div>
            ) : isStreaming ? (
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="h-2 w-2 rounded-full bg-blue-400 animate-pulse delay-0"></div>
                  <div className="h-2 w-2 rounded-full bg-blue-400 animate-pulse delay-150"></div>
                  <div className="h-2 w-2 rounded-full bg-blue-400 animate-pulse delay-300"></div>
                </div>
                <span className="text-sm text-slate-500">Generating response...</span>
              </div>
            ) : (
              <>
                
                {enhancedText && (
                  <div className="mb-3 text-xs flex items-center gap-2">
                    <Badge 
                      variant="outline" 
                      className="bg-blue-50 text-blue-700 border-blue-200 py-1 px-2 rounded-md"
                    >
                      <BookOpen className="h-3 w-3 mr-1" />
                      <span>Citations included</span>
                    </Badge>
                    <span className="text-slate-500">• {citationStyle.toUpperCase()} style</span>
                  </div>
                )}
                <div className={`message-content ${enhancedText ? 'enhanced-content preserve-whitespace' : ''}`}>
                  <MessageContent
                    content={enhancedText || message.content}
                    messageId={message.id}
                    onLinkSubmit={handleLinkSubmit}
                    hasFileAnnotations={hasStableFileAnnotations}
                    loadingLinkId={loadingLinkId}
                    isStreaming={isStreaming}
                    isResearchResponse={isResearchResponse(message)}
                  />
                </div>
              </>
            )}
            
            
            {!isEditing && !isLoadingEnhancedText && !isStreaming && (
              <div className="flex items-center gap-2 mt-3 justify-between w-full relative">
                {/* Left: Research label on mobile */}
                {isMobile && message.role === 'assistant' && isResearchResponse(message) && (
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
                      marginRight: 'auto',
                    }}
                  >
                    Research
                  </div>
                )}
                {/* Center: File citations, etc. (if any) */}
                <div className="flex items-center gap-2" style={{ flex: 1 }}>
                  {message.role === 'assistant' && annotations && 
                    parseCitations(annotations.content).length > 0 && (
                      <div className="flex items-center gap-2 px-3 border border-gray-200 rounded-[20px]">
                        <div className="flex-grow">
                          <FileCitationBadges
                            citations={parseCitations(annotations.content)}
                            fileMetadata={fileMetadata}
                            isLoadingMetadata={isLoadingMetadata}
                            loadingFileId={loadingFileId}
                            onFileClick={handleFileClick}
                          />
                        </div>
                        <div className="flex-shrink-0" style={{ maxWidth: '200px' }}>
                          <CitationControls
                            citationStyle={citationStyle}
                            setCitationStyle={setCitationStyle}
                            isLoadingEnhancedText={isLoadingEnhancedText}
                            hasCitationsIncluded={hasCitationsIncluded}
                            handleCopyCitation={() => handleCopyWithCitations(citationStyle)}
                          />
                        </div>
                      </div>
                    )}
                </div>
                {/* Right: All actions and agent badge (desktop: also Research label if needed) */}
                <div className="flex items-center gap-2" style={{ marginLeft: 'auto' }}>
                  {message.role === 'assistant' &&
                    (!isMobile && isResearchResponse(message) ? (
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
                    ) : !isResearchResponse(message) ? (
                      <AgentBadge
                        agentName={message.metadata?.agent_name || message.agentName || currentAgent || 'Assistant'}
                        isStreaming={isStreaming}
                      />
                    ) : null)}
                  <MessageActions
                    message={message}
                    enhancedText={enhancedText}
                    onCopy={onCopy}
                    onDelete={onDelete}
                    isSpeaking={isSpeaking}
                    isLoadingSpeech={isLoadingSpeech}
                    handleSpeak={handleSpeak}
                  />
                </div>
              </div>
            )}
          </>
        ) : (
          <div>{message.content}</div>
        )}
      </div>
      
      
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
  
  
  const parseCitationsFromContent = (content?: string): { file_id: string }[] => {
    if (!content) return [];
    try {
      
      const matches = content.match(/file_id='([^']+)'/g) || [];
      return matches.map(match => {
        const fileId = match.replace(/file_id='|'/g, '');
        return { file_id: fileId };
      });
    } catch (e) {
      
      return [];
    }
  };

  
  const prevCitations = prevProps.annotations ? 
    parseCitationsFromContent(prevProps.annotations.content) : [];
  const nextCitations = nextProps.annotations ? 
    parseCitationsFromContent(nextProps.annotations.content) : [];
  
  
  for (const citation of prevCitations) {
    const fileId = citation.file_id;
    if (
      (!prevProps.cachedMetadata || !prevProps.cachedMetadata[fileId]) && 
      (nextProps.cachedMetadata && nextProps.cachedMetadata[fileId])
    ) {
      
      return false;
    }
  }
  
  
  return prevProps.message === nextProps.message && 
         prevProps.onCopy === nextProps.onCopy && 
         prevProps.annotations === nextProps.annotations && 
         prevProps.currentAgent === nextProps.currentAgent;
});
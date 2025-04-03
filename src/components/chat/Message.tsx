import { useRef, useEffect, useState } from 'react';
import React from 'react';
import Image from 'next/image';
import { Copy, ArrowRight, File, ChevronDown, ChevronRight, Download, Search, FileText, AlertCircle, Loader2, Trash2, Pencil, Share2, Check, Link, ExternalLink, Volume2, VolumeX, Users, X, Info, Plus, Settings, Wrench, Shield, UserCircle, Brain, Globe, Sparkles, BookOpen, Code, Lightbulb, ChevronDown as ChevronDownIcon, ChevronUp } from 'lucide-react';
import { Message as MessageType } from '@/types/chat';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import DeleteIcon from '@/components/icons/DeleteIcon';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import rehypeHighlight from 'rehype-highlight';
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

// Add a helper function to get the backend URL at the top of the file
const getBackendUrl = () => {
  return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5002';
};

// Favicon component that displays a website's favicon
const Favicon = ({ domain }: { domain: string }) => {
  const [faviconSrc, setFaviconSrc] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [attemptedSources, setAttemptedSources] = useState<string[]>([]);
  
  // Only run this effect when domain changes or on first mount
  useEffect(() => {
    // Reset states when domain changes
    setError(false);
    setAttemptedSources([]);
    
    if (!domain) {
      setError(true);
      return;
    }
    
    // Start with Google's service which is most reliable
    const googleFaviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    setFaviconSrc(googleFaviconUrl);
    setAttemptedSources(['google']);
  }, [domain]);
  
  const handleError = () => {
    // Only proceed if we haven't tried all sources yet
    if (!faviconSrc) return;
    
    // Try DuckDuckGo if Google fails
    if (!attemptedSources.includes('duckduckgo')) {
      const duckduckgoUrl = `https://icons.duckduckgo.com/ip3/${domain}.ico`;
      setFaviconSrc(duckduckgoUrl);
      setAttemptedSources(prev => [...prev, 'duckduckgo']);
    }
    // Try direct favicon if DuckDuckGo fails
    else if (!attemptedSources.includes('direct')) {
      const directUrl = `https://${domain}/favicon.ico`;
      setFaviconSrc(directUrl);
      setAttemptedSources(prev => [...prev, 'direct']);
    }
    // If all fail, show the fallback icon
    else {
      setError(true);
    }
  };
  
  return (
    <div 
      className="w-8 h-8 flex items-center justify-center rounded-full flex-shrink-0"
      style={{ 
        background: 'var(--superlight)',
        overflow: 'hidden'
      }}
    >
      {error || !faviconSrc ? (
        <ExternalLink className="h-4 w-4 text-blue-500" />
      ) : (
        <div className="flex items-center justify-center w-full h-full">
          <img 
            src={faviconSrc}
            alt=""
            width={20}
            height={20}
            onError={handleError}
            className="object-contain max-w-[16px] max-h-[16px]"
          />
        </div>
      )}
    </div>
  );
};

interface MessageContentProps {
  content: string;
}

const MessageContent = ({ content }: MessageContentProps) => {
  // Function to extract URLs from text with their surrounding context
  const extractLinks = (text: string) => {
    // Regex to match URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    
    // Find all URLs in the text
    const urls = text.match(urlRegex) || [];
    
    // If no URLs, return the original content
    if (urls.length === 0) return { text, links: [] };
    
    // Extract URLs with context
    const links = urls.map(url => {
      // Clean up the URL if it has trailing punctuation
      const cleanUrl = url.replace(/[.,;:!?)]+$/, '');
      
      // Replace utm_source=openai with utm_source=mystylus.com if present
      let processedUrl = cleanUrl;
      try {
        const urlObj = new URL(cleanUrl);
        if (urlObj.searchParams.has('utm_source') && urlObj.searchParams.get('utm_source') === 'openai') {
          urlObj.searchParams.set('utm_source', 'mystylus.com');
          processedUrl = urlObj.toString();
        }
      } catch (e) {
        // If URL parsing fails, just use the original URL
        processedUrl = cleanUrl;
      }
      
      // Get the sentence containing the URL or nearby context
      const sentences = text.split(/(?<=[.!?])\s+/);
      const sentenceWithUrl = sentences.find(s => s.includes(cleanUrl)) || '';
      
      // Try to extract a title-like text before the URL
      const beforeUrl = sentenceWithUrl.split(cleanUrl)[0].trim();
      
      // Look for text in quotes, between brackets, or take the last 5-7 words
      let title = '';
      const quoteMatch = beforeUrl.match(/['"]([^'"]+)['"]\s*$/);
      const bracketMatch = beforeUrl.match(/\[([^\]]+)\]\s*$/);
      
      if (quoteMatch) {
        title = quoteMatch[1];
      } else if (bracketMatch) {
        title = bracketMatch[1];
      } else {
        // Get domain name as fallback title
        try {
          const urlObj = new URL(processedUrl);
          title = urlObj.hostname.replace(/^www\./, '');
        } catch (e) {
          title = processedUrl;
        }
      }
      
      // Get format/extension
      const extension = (() => {
        try {
          // Extract extension from pathname
          const urlObj = new URL(processedUrl);
          const path = urlObj.pathname;
          const lastDotIndex = path.lastIndexOf('.');
          if (lastDotIndex !== -1 && lastDotIndex < path.length - 1) {
            return path.substring(lastDotIndex + 1);
          }
          return '';
        } catch (e) {
          return '';
        }
      })();
      
      return {
        url: processedUrl,
        title: title || 'Link',
        context: sentenceWithUrl,
        domain: (() => {
          try {
            const urlObj = new URL(processedUrl);
            return urlObj.hostname.replace(/^www\./, '');
          } catch (e) {
            return '';
          }
        })(),
        extension
      };
    });
    
    // Remove duplicate links
    const uniqueLinks = links.filter((link, index, self) => 
      index === self.findIndex(l => l.url === link.url)
    );
    
    return { text, links: uniqueLinks };
  };
  
  const { text, links } = extractLinks(content);
  
  // Identify URLs in the content that should be rendered as cards
  // Include both original and processed URLs to handle both cases
  const urlsToRenderAsCards = links.flatMap(link => {
    // Check if the URL was modified (has utm_source=mystylus.com)
    try {
      const urlObj = new URL(link.url);
      const hasUtmSourceMystylus = urlObj.searchParams.has('utm_source') && 
                                  urlObj.searchParams.get('utm_source') === 'mystylus.com';
      
      // If it has mystylus.com, we need to also check for the original openai version
      if (hasUtmSourceMystylus) {
        const originalUrlObj = new URL(link.url);
        originalUrlObj.searchParams.set('utm_source', 'openai');
        return [link.url, originalUrlObj.toString()];
      }
    } catch (e) {}
    
    // Default case, just return the processed URL
    return [link.url];
  });
  
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[
          rehypeKatex,
          rehypeRaw,
          rehypeSanitize,
          [rehypeHighlight, { detect: true, ignoreMissing: true }]
        ]}
        components={{
          p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,
          h1: ({ children }) => <h1 className="text-2xl font-bold mb-4">{children}</h1>,
          h2: ({ children }) => <h2 className="text-xl font-bold mb-3">{children}</h2>,
          h3: ({ children }) => <h3 className="text-lg font-bold mb-2">{children}</h3>,
          ul: ({ children }) => <ul className="list-disc pl-6 mb-4 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-6 mb-4 space-y-1">{children}</ol>,
          li: ({ children }) => <li className="pl-1">{children}</li>,
          code: ({ children, className, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = !match;
            return isInline ? (
              <code className="px-1.5 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-sm" {...props}>
                {children}
              </code>
            ) : (
              <pre className={cn(
                'p-4 rounded-lg bg-slate-900 overflow-x-auto',
                match && match[1] ? `language-${match[1]}` : ''
              )}>
                <code className={className} {...props}>
                  {children}
                </code>
              </pre>
            );
          },
          table: ({ children }) => (
            <div className="overflow-x-auto mb-4">
              <table className="min-w-full divide-y divide-gray-200">
                {children}
              </table>
            </div>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-slate-300 dark:border-slate-700 pl-4 italic mb-4">
              {children}
            </blockquote>
          ),
          a: ({ node, href, children, ...props }) => {
            if (!href) return <a {...props}>{children}</a>;
            
            // Modify utm_source=openai to utm_source=mystylus.com if present
            let processedHref = href;
            try {
              const urlObj = new URL(href);
              if (urlObj.searchParams.has('utm_source') && urlObj.searchParams.get('utm_source') === 'openai') {
                urlObj.searchParams.set('utm_source', 'mystylus.com');
                processedHref = urlObj.toString();
              }
            } catch (e) {
              // If URL parsing fails, just use the original href
              processedHref = href;
            }
            
            // If this is a URL we want to render as a card, just render a simple link
            // We'll render the card separately outside the markdown content
            if (urlsToRenderAsCards.includes(href)) {
              return (
                <a href={processedHref} target="_blank" rel="noopener noreferrer" {...props}>
                  {children}
                </a>
              );
            }
            
            // Regular link rendering
            return (
              <a href={processedHref} target="_blank" rel="noopener noreferrer" {...props}>
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
      
      {/* Display all links as cards outside the markdown content */}
      {links.length > 0 && (
        <div className="my-3">
          <div className="mb-2 text-xs text-gray-500 flex items-center">
            <ExternalLink className="h-3.5 w-3.5 mr-1.5 text-blue-500" />
            <span>Links</span>
          </div>
          <div className="flex overflow-x-auto pb-2 hide-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <style jsx global>{`
              .hide-scrollbar::-webkit-scrollbar {
                display: none;
              }
            `}</style>
            <div className="flex gap-3">
              {links.map((link, index) => (
                <a 
                  key={index} 
                  href={link.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="no-underline block flex-shrink-0"
                >
                  <div 
                    className="flex p-3 items-start gap-3 relative group"
                    style={{
                      borderRadius: '16px',
                      border: '1px solid var(--superlight)',
                      background: 'var(--ultralight)',
                      width: '160px',
                      minWidth: '160px',
                      maxWidth: '160px'
                    }}
                  >
                    <Favicon domain={link.domain} />
                    <div className="flex flex-col flex-grow min-w-0 overflow-hidden">
                      <div className="flex items-start w-full">
                        <span className="truncate text-sm font-medium text-foreground">
                          {link.title.length > 15 
                            ? link.title.substring(0, 15) + '...' 
                            : link.title}
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="text-xs text-slate-700">
                          {link.domain || 'link'}
                        </span>
                        
                        {/* Format label */}
                        {link.extension && (
                          <span className="text-xs text-muted-foreground">
                            {link.extension.toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Add new interface for citations
interface Citation {
  file_id: string;
  index: number;
  type: string;
  filename: string;
}

// Add interface for annotation object
interface FileAnnotation {
  type: string;
  file_citation: {
    file_id: string;
    index: number;
    filename: string;
  };
}

// Add FileCitation interface
interface FileCitation {
  file_id: string;
  index: number;
  type: string;
  filename: string;
  raw_content?: string;
}

interface DebugState {
  fileContents: Record<string, string | null>;  // Map of fileId to content
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
    };
    currentAgent?: string;
  };
  onCopy: (content: string) => void;
  onDelete?: (message: MessageType) => void;
  onEdit?: (message: MessageType) => void;
  annotations?: MessageType & {
    toolAction: 'annotations';
    toolName?: string;
  };
  currentAgent?: string;
}

export function Message({ message, onCopy, onDelete, onEdit, annotations, currentAgent }: MessageProps) {
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
  
  // Determine if this message is in a loading/streaming state
  const isStreaming = message.role === 'assistant' && message.content === '';

  // Function to parse citations from content
  const parseCitations = (content: string): Citation[] => {
    try {
      // Handle the specific format from your example
      if (content.includes('AnnotationFileCitation')) {
        const matches = content.match(/AnnotationFileCitation\(([^)]+)\)/g);
        if (matches) {
          return matches.map(match => {
            // Extract the content inside the parentheses
            const paramsStr = match.slice(match.indexOf('(') + 1, match.lastIndexOf(')'));
            
            // Split by comma but handle quoted values
            const parts = paramsStr.match(/([^,]+='[^']*'|[^,]+=[^,]+)/g) || [];
            
            const obj: Record<string, string> = {};
            parts.forEach(part => {
              const [key, value] = part.trim().split('=');
              // Remove quotes and handle special characters
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
      
      // Try parsing as JSON if not in the above format
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
    } catch (e) {
      // Silent error handling
    }
    return [];
  };

  // Function to fetch file metadata
  const fetchFileMetadata = async (fileId: string) => {
    if (fileMetadata[fileId] || isLoadingMetadata[fileId]) return;
    
    setIsLoadingMetadata(prev => ({ ...prev, [fileId]: true }));
    
    try {
      console.log("Fetching metadata for file:", fileId);
      // First, get the basic file info
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/files/${fileId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch file metadata: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Received basic metadata:", data);
      
      // Use chat_session_id to get full metadata
      if (data.chatSessionId) {
        const fullResponse = await fetch(`${backendUrl}/api/files?chat_session_id=${encodeURIComponent(data.chatSessionId)}`);
        
        if (fullResponse.ok) {
          const fullData = await fullResponse.json();
          console.log("Received full metadata:", fullData);
          
          if (Array.isArray(fullData)) {
            const fileData = fullData.find(file => file.id === fileId);
            if (fileData && fileData.document) {
              // We have full data with document metadata
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
      
      // Fallback to basic data if full data fetch fails
      setFileMetadata(prev => ({ 
        ...prev, 
        [fileId]: {
          file_name: data.name || fileId
        }
      }));
    } catch (error) {
      console.error("Error fetching file metadata:", error);
      // Fallback to file ID as name to prevent eternal loading state
      setFileMetadata(prev => ({ 
        ...prev, 
        [fileId]: {
          file_name: fileId
        }
      }));
    } finally {
      setIsLoadingMetadata(prev => ({ ...prev, [fileId]: false }));
    }
  };

  // Watch for when streaming ends and set shouldFetchMetadata flag
  useEffect(() => {
    if (!isStreaming && message.role === 'assistant' && message.content !== '' && annotations) {
      setShouldFetchMetadata(true);
    }
  }, [isStreaming, message.content, message.role, annotations]);

  // Add useEffect to fetch metadata for citations when shouldFetchMetadata is true
  useEffect(() => {
    if (shouldFetchMetadata && annotations && annotations.content) {
      const citations = parseCitations(annotations.content);
      // Create a Map to store unique citations by file_id
      const uniqueCitations = new Map();
      citations.forEach(citation => {
        if (!uniqueCitations.has(citation.file_id)) {
          uniqueCitations.set(citation.file_id, citation);
        }
      });
      
      // Fetch metadata for all unique citations
      Array.from(uniqueCitations.values()).forEach(citation => {
        fetchFileMetadata(citation.file_id);
      });
      
      // Reset the flag to prevent refetching
      setShouldFetchMetadata(false);
    }
  }, [shouldFetchMetadata, annotations, fileMetadata, isLoadingMetadata]);

  // Function to fetch file content
  const handleFetchFileContent = async (fileId: string) => {
    // If we already have the content, don't fetch again
    if (fileContents[fileId]) return;

    try {
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/files/${fileId}/content`);
      const text = await response.text();
      
      try {
        // Try to parse as JSON
        const data = JSON.parse(text);
      const content = typeof data.content === 'string' ? data.content : 
                     typeof data === 'string' ? data : 
                     JSON.stringify(data);
        setFileContents(prev => ({ ...prev, [fileId]: content }));
      } catch (parseError) {
        // If parsing fails, assume the response is raw text content
        setFileContents(prev => ({ ...prev, [fileId]: text }));
      }
    } catch (error) {
      setFileContents(prev => ({ ...prev, [fileId]: null }));
    }
  };

  // Helper for copying content with citations
  const handleCopyWithCitations = async (style: string = citationStyle) => {
    if (!annotations) return;
    
    try {
      setIsLoadingEnhancedText(true);
      
      // Parse citations from annotations
      const citations = parseCitations(annotations.content);
      
      // If we're changing the format, temporarily reset the included state
      if (hasCitationsIncluded) {
        setHasCitationsIncluded(false);
      }
      
      // Prepare the request body
      const requestBody = {
        message_content: message.content,
        citations: citations.map(citation => ({
          file_id: citation.file_id,
          index: citation.index,
          filename: citation.filename
        })),
        citation_style: style // Add citation style to the request
      };
      
      // Call the citation API
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
      
      // Get the data from the response
      const data = await response.json();
      
      if (!data.enhanced_message) {
        throw new Error('No enhanced text received from server');
      }

      // Save the enhanced text to the database
      if (message.id && message.sessionId) {
        await fetch(`${backendUrl}/api/chat-sessions/${message.sessionId}/messages/${message.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: data.enhanced_message,
            metadata: {
              ...message.metadata,
              citation_style: style
            }
          }),
        });
      }
      
      // Copy the enhanced text
      onCopy(data.enhanced_message);
      
      // Update the displayed text
      setEnhancedText(data.enhanced_message);
      // Mark citations as included
      setHasCitationsIncluded(true);
    } catch (error) {
      // Alert user of error
      alert('Failed to process citations. Please try again.');
    } finally {
      setIsLoadingEnhancedText(false);
    }
  };

  // Function to handle edit mode
  const handleStartEdit = () => {
    setIsEditing(true);
    setEditedContent(message.content);
    // Focus the textarea in the next tick after it's rendered
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

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  // Function to handle text-to-speech
  const handleSpeak = async () => {
    if (isSpeaking || isLoadingSpeech) {
      // If already speaking or loading, stop the playback
      stopSpeaking();
      setIsSpeaking(false);
      setIsLoadingSpeech(false);
      return;
    }
    
    if (message.role !== 'assistant') {
      return; // Only speak assistant messages
    }
    
    try {
      setIsLoadingSpeech(true);
      setIsSpeaking(true);
      
      // Use the enhanced text if available, otherwise use the original content
      const textToSpeak = enhancedText || message.content;
      
      // Speak the text
      await speakText(textToSpeak);
      
      setIsSpeaking(false);
    } catch (error) {
      console.error('Error speaking text:', error);
      setIsSpeaking(false);
    } finally {
      setIsLoadingSpeech(false);
    }
  };

  // Stop audio when component unmounts
  useEffect(() => {
    return () => {
      if (isSpeaking) {
        stopSpeaking();
      }
    };
  }, [isSpeaking]);

  // Helper function to get agent icon
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

  // Helper function to get agent background color
  const getAgentCircleColor = (agentName: string) => {
    switch(agentName) {
      case "Triage Agent":
      case "General Assistant":
        return "bg-emerald-500"; // Green color for both Triage and General Assistant
      case "Claude Creative":
        return "rounded-[1000px] border border-[#E8E8E5] bg-[#D77655]"; // Specific Claude Creative styling
      case "Deep Seek":
        return "rounded-[1000px] border border-[#E8E8E5] bg-[#4D6BFE]"; // Specific Deep Seek styling
      case "Mistral Europe":
        return "rounded-[1000px] border border-[#E8E8E5] bg-[#FA5310]"; // Specific Mistral Europe styling
      case "Perplexity":
        return "rounded-[1000px] border border-[#E8E8E5] bg-[#1F1F1F]"; // Specific Perplexity styling
      case "Deep Thinker":
        return "rounded-[1000px] border border-[#E8E8E5] bg-black"; // Deep Thinker styling with pure black
      case "Grok X":
        return "bg-black"; // Black color for the third icon
      default:
        return "bg-white border border-slate-200";
    }
  };

  // Get icon color based on agent background color
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
        return "text-white"; // White text for dark backgrounds
      default:
        return "text-slate-800"; // Dark text for light backgrounds
    }
  };

  // Render system message for agent transitions differently
  if (message.role === 'system' && message.agentName) {
    return (
      <div className="flex items-center gap-2 py-1 px-3 my-2 rounded-md text-gray-200 text-xs font-mono max-w-[90%] shadow-md">
        <span className="text-gray-400">[SYSTEM]</span>
        <ArrowRight className="text-gray-400 h-3 w-3" />
        <span className="text-emerald-400">Agent: {message.content}</span>
      </div>
    );
  }
  
  // Render tool messages differently
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

    // Add tool name to label if available
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

    // For non-collapsible messages (annotations)
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

    // For non-collapsible messages (annotations)
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
            {/* File Info Header */}
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
                    // TODO: Implement document viewer when available
                    console.log('View in document clicked');
                  }}
                >
                  View in Document
                </Button>
              </div>
            </div>

            {/* Citation Content */}
            <div className="p-3">
              <div className="font-mono text-sm rounded p-2 border border-yellow-50">
                {typeof message.content === 'string' ? message.content : JSON.stringify(message.content, null, 2)}
              </div>
              
              {/* Context Preview - if available */}
              <div className="mt-2 text-xs text-gray-500">
                <span className="font-medium">Context:</span> Showing verified citation from document. Full context view coming soon.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // User message
  if (message.role === 'user') {
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

  // Error message
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

  // Assistant message (default)
  return (
    <div className="inline-block w-full mb-3 py-3 px-4 relative group"
      style={{
        borderRadius: '16px',
        background: 'var(--Monochrome-White, #FFF)'
      }}
    >
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
                    // Randomize widths between 60% and 100%
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
              <MessageContent content={enhancedText || message.content} />
            )}
            
            {/* Action buttons below message content */}
            {!isEditing && !isLoadingEnhancedText && !isStreaming && (
              <div className="flex items-center gap-2 mt-3 justify-between">
                {/* Include Citations button */}
                <div>
                  {message.role === 'assistant' && annotations && 
                    parseCitations(annotations.content).length > 0 && (
                      <div className="inline-flex">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
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
                          </DropdownMenuTrigger>
                          <DropdownMenuContent 
                            align="start" 
                            className="w-48 focus:ring-0 focus:outline-none"
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
                            <DropdownMenuLabel className="text-gray-400 text-xs w-full">
                              Select Citation Format
                            </DropdownMenuLabel>
                            <div className="py-1 w-full">
                              <DropdownMenuItem 
                                onClick={() => { 
                                  setCitationStyle("apa"); 
                                }}
                                className="w-full px-4 py-2 text-left focus:bg-transparent focus:outline-none"
                                style={{
                                  color: 'var(--Monochrome-White, #FFF)',
                                  borderRadius: '8px',
                                  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                                  fontSize: '14px',
                                  fontStyle: 'normal',
                                  fontWeight: 400,
                                  lineHeight: '20px'
                                }}
                                title="American Psychological Association style"
                              >
                                <div className="flex items-center justify-between w-full">
                                  <span>APA Style</span>
                                  {citationStyle === "apa" && (
                                    <Check className="h-3.5 w-3.5 text-blue-500" />
                                  )}
                                </div>
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => { 
                                  setCitationStyle("mla"); 
                                }}
                                className="w-full px-4 py-2 text-left focus:bg-transparent focus:outline-none"
                                style={{
                                  color: 'var(--Monochrome-White, #FFF)',
                                  borderRadius: '8px',
                                  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                                  fontSize: '14px',
                                  fontStyle: 'normal',
                                  fontWeight: 400,
                                  lineHeight: '20px'
                                }}
                                title="Modern Language Association style"
                              >
                                <div className="flex items-center justify-between w-full">
                                  <span>MLA Style</span>
                                  {citationStyle === "mla" && (
                                    <Check className="h-3.5 w-3.5 text-blue-500" />
                                  )}
                                </div>
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => { 
                                  setCitationStyle("chicago"); 
                                }}
                                className="w-full px-4 py-2 text-left focus:bg-transparent focus:outline-none"
                                style={{
                                  color: 'var(--Monochrome-White, #FFF)',
                                  borderRadius: '8px',
                                  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                                  fontSize: '14px',
                                  fontStyle: 'normal',
                                  fontWeight: 400,
                                  lineHeight: '20px'
                                }}
                                title="Chicago Manual of Style"
                              >
                                <div className="flex items-center justify-between w-full">
                                  <span>Chicago Style</span>
                                  {citationStyle === "chicago" && (
                                    <Check className="h-3.5 w-3.5 text-blue-500" />
                                  )}
                                </div>
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => { 
                                  setCitationStyle("ieee"); 
                                }}
                                className="w-full px-4 py-2 text-left focus:bg-transparent focus:outline-none"
                                style={{
                                  color: 'var(--Monochrome-White, #FFF)',
                                  borderRadius: '8px',
                                  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                                  fontSize: '14px',
                                  fontStyle: 'normal',
                                  fontWeight: 400,
                                  lineHeight: '20px'
                                }}
                                title="Institute of Electrical and Electronics Engineers style"
                              >
                                <div className="flex items-center justify-between w-full">
                                  <span>IEEE Style</span>
                                  {citationStyle === "ieee" && (
                                    <Check className="h-3.5 w-3.5 text-blue-500" />
                                  )}
                                </div>
                              </DropdownMenuItem>
                            </div>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        
                        <Button 
                          onClick={isLoadingEnhancedText ? undefined : () => {
                            handleCopyWithCitations(citationStyle);
                          }}
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "text-slate-500 hover:bg-gray-100 rounded-md cursor-pointer transition-colors",
                            !message.content && "opacity-50 cursor-not-allowed"
                          )}
                          style={{
                            display: 'flex',
                            padding: '8px',
                            alignItems: 'center',
                            gap: '4px',
                            height: '36px'
                          }}
                          disabled={isLoadingEnhancedText}
                          title={hasCitationsIncluded ? "Update citations with selected format" : "Include citations with selected format"}
                        >
                          {isLoadingEnhancedText ? (
                            <div className="flex items-center gap-1">
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              <span className="text-xs">Including...</span>
                            </div>
                            ) : (
                              <span className="text-xs text-black" style={{ color: 'black' }}>
                                {hasCitationsIncluded 
                                  ? "Update Citations" 
                                  : "Include Citations"}
                              </span>
                          )}
                        </Button>
                        </div>
                      )}
                </div>
                
                {/* Other buttons - remain on the right side */}
                <div className="flex items-center gap-2">
                  {message.role === 'assistant' && (
                    <div 
                      className={`flex items-center justify-center w-6 h-6 rounded-full ${getAgentCircleColor(message.metadata?.agent_name || message.agentName || currentAgent || 'Assistant')} ${getIconTextColor(message.metadata?.agent_name || message.agentName || currentAgent || 'Assistant')}`}
                      title={(() => {
                        // For empty content (loading state)
                        if (message.content === '') {
                          return currentAgent || 'Assistant';
                        }
                        
                        // For messages with content, prioritize metadata agent name
                        return message.metadata?.agent_name || message.agentName || currentAgent || 'Assistant';
                      })()}
                    >
                      {(() => {
                        // For empty content (loading state)
                        if (message.content === '') {
                          return getAgentIcon(currentAgent || 'Assistant');
                        }
                        
                        // For messages with content, prioritize metadata agent name
                        const displayName = message.metadata?.agent_name || message.agentName || currentAgent || 'Assistant';
                        return getAgentIcon(displayName);
                      })()}
                      {isStreaming && (
                        <Loader2 className="h-3 w-3 animate-spin absolute top-0 right-0 -mt-1 -mr-1" />
                      )}
                    </div>
                  )}

                  {/* TTS button (only for assistant messages) - moved to here */}
                  {message.role === 'assistant' && !message.toolAction && (
                    <Button
                      onClick={handleSpeak}
                      disabled={!message.content}
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "text-slate-500 hover:bg-gray-100 rounded-md cursor-pointer transition-colors",
                        !message.content && "opacity-50 cursor-not-allowed"
                      )}
                      style={{
                        display: 'flex',
                        padding: '8px',
                        alignItems: 'center',
                        gap: '4px',
                        height: '36px'
                      }}
                      title={(isSpeaking || isLoadingSpeech) ? "Stop playing audio" : "Play as speech"}
                    >
                      {isLoadingSpeech ? (
                        <div className="flex items-center gap-1">
                          <Loader2 className="h-4 w-4 animate-spin text-black" />
                        </div>
                      ) : isSpeaking ? (
                        <div className="flex items-center gap-1">
                          <VolumeX className="h-4 w-4 text-blue-500" />
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Volume2 className="h-4 w-4 text-black" />
                        </div>
                      )}
                    </Button>
                  )}
                
                <Button 
                  onClick={() => onCopy(enhancedText || message.content)}
                  variant="ghost"
                  size="sm"
                    className={cn(
                      "text-slate-500 hover:bg-gray-100 rounded-md cursor-pointer transition-colors",
                      !message.content && "opacity-50 cursor-not-allowed"
                    )}
                    style={{
                      display: 'flex',
                      padding: '8px',
                      alignItems: 'center',
                      gap: '4px',
                      height: '36px'
                    }}
                  title="Copy to clipboard"
                >
                  <Copy className="h-3.5 w-3.5 text-black" style={{ color: 'black' }} />
                </Button>
                  
                <Button 
                  onClick={() => {
                    // Basic share functionality
                    if (navigator.share) {
                      navigator.share({
                        title: 'Shared message',
                        text: enhancedText || message.content,
                      }).catch(console.error);
                    } else {
                      // Fallback to copy
                      onCopy(enhancedText || message.content);
                      alert('Content copied to clipboard!');
                    }
                  }}
                  variant="ghost"
                  size="sm"
                    className={cn(
                      "text-slate-500 hover:bg-gray-100 rounded-md cursor-pointer transition-colors",
                      !message.content && "opacity-50 cursor-not-allowed"
                    )}
                    style={{
                      display: 'flex',
                      padding: '8px',
                      alignItems: 'center',
                      gap: '4px',
                      height: '36px'
                    }}
                  title="Share this message"
                >
                  <Share2 className="h-3.5 w-3.5 text-black" style={{ color: 'black' }} />
                </Button>
                  
                  {/* Delete button in the action bar */}
                  {onDelete && (
                          <Button
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this message?')) {
                          onDelete(message);
                        }
                      }}
                            variant="ghost"
                            size="sm"
                      className={cn(
                        "text-slate-500 hover:bg-gray-100 rounded-md cursor-pointer transition-colors",
                        !message.content && "opacity-50 cursor-not-allowed"
                      )}
                      style={{
                        display: 'flex',
                        padding: '8px',
                        alignItems: 'center',
                        gap: '4px',
                        height: '36px'
                      }}
                      title="Delete message"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-black" style={{ color: 'black' }} />
                          </Button>
                  )}
                        </div>
                          </div>
                        )}

            {/* Display annotations if passed as prop */}
            {annotations && !isStreaming && (
              <div className="my-3">
                <div className="flex overflow-x-auto gap-3 w-full pb-2 hide-scrollbar">
                  <style jsx global>{`
                    .hide-scrollbar::-webkit-scrollbar {
                      display: none;
                    }
                    .hide-scrollbar {
                      -ms-overflow-style: none;
                      scrollbar-width: none;
                    }
                  `}</style>
                {(() => {
                  const citations = parseCitations(annotations.content);
                  // Create a Map to store unique citations by file_id
                  const uniqueCitations = new Map();
                  citations.forEach(citation => {
                    if (!uniqueCitations.has(citation.file_id)) {
                      uniqueCitations.set(citation.file_id, citation);
                    }
                  });
                  
                  return Array.from(uniqueCitations.values()).map((citation, index) => {
                    // We'll rely on the useEffect to fetch metadata only when streaming ends
                    const metadata = fileMetadata[citation.file_id];
                    const isLoading = isLoadingMetadata[citation.file_id];
                    
                    return (
                      <div 
                        key={`${citation.file_id}-${index}`}
                        className="flex p-4 items-start gap-3 relative group flex-shrink-0"
                        style={{
                          borderRadius: '16px',
                          border: '1px solid var(--superlight)',
                          background: 'var(--ultralight)',
                          width: '160px',
                          minWidth: '160px',
                          maxWidth: '160px'
                        }}
                      >
                        <div className="flex flex-col flex-grow min-w-0 overflow-hidden">
                          <div className="flex items-start w-full">
                            <span className="truncate text-sm font-medium text-foreground">
                              {(metadata?.file_name || citation.filename).length > 15 
                                ? (metadata?.file_name || citation.filename).substring(0, 15) + '...' 
                                : (metadata?.file_name || citation.filename)}
                            </span>
                          </div>
                          
                          {isLoading ? (
                            <div className="flex items-center gap-2 flex-wrap mt-2">
                              <div className="h-3 bg-slate-100 rounded animate-pulse w-24"></div>
                              <div className="h-3 bg-slate-100 rounded animate-pulse w-16"></div>
                              <div className="h-3 bg-slate-100 rounded animate-pulse w-12"></div>
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {/* Authors - keep at the top */}
                              {metadata?.doc_authors && metadata.doc_authors.length > 0 && (
                                <span className="text-xs text-slate-700 flex items-center">
                                  {Array.isArray(metadata.doc_authors) 
                                    ? metadata.doc_authors.slice(0, 1).map((author: string) => author).join(', ')
                                    : metadata.doc_authors}
                                  {Array.isArray(metadata.doc_authors) && metadata.doc_authors.length > 1 && (
                                    <span className="ml-1 inline-flex items-center justify-center text-slate-800 text-[10px]"
                                      style={{
                                        borderRadius: '1000px',
                                        background: 'var(--Monochrome-Light, #E8E8E5)',
                                        display: 'flex',
                                        width: '18px',
                                        height: '18px',
                                        padding: '2px 4px 2px 2px',
                                        flexDirection: 'column',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        gap: '10px'
                                      }}>
                                      +{metadata.doc_authors.length - 1}
                                    </span>
                                  )}
                                </span>
                              )}
                              
                              {/* File format - should be first in the bottom row */}
                              {(metadata?.file_name || citation.filename).split('.').length > 1 && (
                                <span className="text-xs text-muted-foreground">
                                  {(metadata?.file_name || citation.filename).split('.').pop()?.toUpperCase()}
                                </span>
                              )}
                              
                              {/* Dot divider */}
                              {(metadata?.file_name || citation.filename).split('.').length > 1 && 
                               metadata?.doc_type && (
                                <span className="text-xs text-slate-400">•</span>
                              )}
                              
                              {/* Document type - should be second */}
                              {metadata?.doc_type && (
                                <span className="text-xs text-muted-foreground">
                                  {metadata.doc_type}
                                </span>
                              )}
                              
                              {/* Dot divider */}
                              {metadata?.doc_type && metadata?.doc_publication_year && (
                                <span className="text-xs text-slate-400">•</span>
                              )}
                              
                              {/* Year - should be third */}
                              {metadata?.doc_publication_year && (
                                <span className="text-xs text-muted-foreground">
                                  {metadata.doc_publication_year}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
                </div>
              </div>
            )}
          </>
        ) : (
          <div>{message.content}</div>
        )}
      </div>
    </div>
  );
}
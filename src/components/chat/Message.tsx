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
import { FileDetailModal } from './FileDetailModal';
import { UploadedFile } from '@/types/chat';

// Add a helper function to get the backend URL at the top of the file
const getBackendUrl = () => {
  return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5002';
};

// Favicon component that displays a website's favicon
const Favicon = React.memo(({ domain }: { domain: string }) => {
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
}, (prevProps, nextProps) => prevProps.domain === nextProps.domain);

interface MessageContentProps {
  content: string;
  messageId?: string;
  onLinkSubmit?: (url: string) => Promise<void>;
}

// Add a global style component at the top of the file to avoid nesting issues
const GlobalStyles = () => (
  <style jsx global>{`
    .preserve-whitespace p, 
    .whitespace-pre-wrap,
    .message-content-container p {
      white-space: pre-wrap !important;
    }
    .hide-scrollbar::-webkit-scrollbar {
      display: none;
    }
    /* Preserve multiple spaces by preventing browser collapsing */
    .message-content-container pre {
      white-space: pre !important;
      overflow-x: auto;
    }
    /* Style for properly preserving multiple spaces in paragraphs */
    .message-content-container p {
      white-space: pre-wrap !important;
      word-break: break-word;
    }
    /* Ensure line breaks are properly handled */
    .message-content-container br {
      display: block;
      content: "";
      margin-top: 0.75em;
    }
    /* Give double-spaced content proper spacing */
    .message-content-container .double-spaced {
      margin-top: 1.5em;
    }
    /* Style for paragraphs with double spaces */
    .message-content-container p.has-doubled-spaces {
      letter-spacing: 0.01em;
      line-height: 1.6;
    }
    /* Style for preserving indentation */
    .message-content-container .indented {
      padding-left: 2em;
    }
    /* Force non-breaking spaces to render properly */
    .message-content-container .nbsp {
      white-space: pre !important;
      display: inline;
    }
    /* Critical styling for multi-space spans */
    .message-content-container .multi-space {
      white-space: pre !important;
      letter-spacing: normal !important;
      display: inline-block !important;
      font-family: inherit !important;
    }
    /* Ensure all spaces are fully preserved */
    .message-content-container.preserve-all-spaces {
      white-space: pre-wrap !important;
      word-wrap: break-word !important;
      font-variant-ligatures: none !important;
    }
    /* Additional spacing for specific scenarios */
    .message-content-container p + p {
      margin-top: 1em;
    }
    /* Make all links bold and black */
    .message-content-container a {
      font-weight: bold !important;
      color: #000 !important;
      text-decoration: none !important;
    }
    /* Add hover effect for links */
    .message-content-container a:hover {
      text-decoration: underline !important;
    }
    /* Dark mode support */
    .dark .message-content-container a {
      color: #fff !important;
    }
  `}</style>
);

interface LinkState {
  status: 'idle' | 'loading' | 'added' | 'error';
  message?: string;
}

const MessageContent = React.memo(({ content, messageId, onLinkSubmit }: MessageContentProps) => {
  // Function to extract URLs from text with their surrounding context
  const extractLinks = React.useMemo(() => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = content.match(urlRegex) || [];
    
    if (urls.length === 0) return { text: content, links: [] };
    
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
      const sentences = content.split(/(?<=[.!?])\s+/);
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
    
    return { text: content, links: uniqueLinks };
  }, [content]);
  
  const { text, links } = extractLinks;
  const [linkStates, setLinkStates] = useState<Record<string, LinkState>>({});
  const [addedTooltipVisible, setAddedTooltipVisible] = useState<Record<string, boolean>>({}); // State for added tooltips
  const addedTooltipRefs = useRef<Record<string, HTMLDivElement | null>>({}); // Refs for added tooltips

  // Close added tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      Object.keys(addedTooltipRefs.current).forEach(url => {
        if (addedTooltipRefs.current[url] && !addedTooltipRefs.current[url]!.contains(event.target as Node)) {
          setAddedTooltipVisible(prev => ({ ...prev, [url]: false }));
        }
      });
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Function to handle link submission with loading state
  const handleLinkSubmitWithLoading = async (url: string) => {
    setLinkStates(prev => ({ ...prev, [url]: { status: 'loading' } }));
    try {
      await onLinkSubmit!(url); // Use non-null assertion as it's checked before calling
      setLinkStates(prev => ({ ...prev, [url]: { status: 'added', message: 'Link added successfully' } }));
      // Show success notification
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-80 text-white px-4 py-2 rounded shadow-lg z-50 text-sm';
      notification.textContent = 'Link added successfully';
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 2000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add link';
      setLinkStates(prev => ({ ...prev, [url]: { status: 'error', message: errorMessage } }));
      // Show error notification
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-80 text-white px-4 py-2 rounded shadow-lg z-50 text-sm';
      notification.textContent = errorMessage;
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 2000);
      // Optionally reset to idle after a delay on error
      // setTimeout(() => setLinkStates(prev => ({ ...prev, [url]: { status: 'idle' } })), 3000);
    }
  };
  
  // Function to preserve multiple spaces and proper formatting
  const preserveWhitespace = (content: string) => {
    if (!content) return '';
    
    // First handle multiple consecutive line breaks to preserve paragraph spacing
    let processedContent = content.replace(/\n{2,}/g, match => {
      return '\n<br/>\n';
    });
    
    // Convert all instances of two or more spaces to line breaks
    // This is the critical fix - replace double spaces with <br/> tags
    processedContent = processedContent.replace(/( {2,})/g, '<br/>');
    
    // Replace single linebreaks with <br> tags for markdown conversion
    return processedContent.replace(/\n/g, '<br/>');
  };
  
  // Function to toggle added tooltip visibility
  const toggleAddedTooltip = (url: string) => {
    setAddedTooltipVisible(prev => ({ ...prev, [url]: !prev[url] }));
  };
  
  return (
    <div 
      id={messageId ? `message-${messageId}` : undefined} 
      className="prose prose-sm dark:prose-invert max-w-none message-content-container preserve-all-breaks"
    >
      <GlobalStyles />
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[
          rehypeKatex,
          rehypeRaw,
          rehypeSanitize,
          [rehypeHighlight, { detect: true, ignoreMissing: true }]
        ]}
        components={{
          // Updated paragraph handling to preserve whitespace
          p: ({ children }) => {
            // Always render with whitespace preservation now
            return (
              <p className="mb-4 last:mb-0 whitespace-pre-wrap break-words preserve-breaks">{children}</p>
            );
          },
          h1: ({ children }) => <h1 className="text-2xl font-bold mb-4">{children}</h1>,
          h2: ({ children }) => <h2 className="text-xl font-bold mb-3">{children}</h2>,
          h3: ({ children }) => <h3 className="text-lg font-bold mb-2">{children}</h3>,
          ul: ({ children }) => <ul className="list-disc pl-6 mb-4 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-6 mb-4 space-y-1">{children}</ol>,
          li: ({ children }) => <li className="pl-1">{children}</li>,
          pre: ({ children }) => (
            <pre className="text-sm p-4 rounded bg-secondary overflow-auto mb-4">
              {children}
            </pre>
          ),
          code: ({ node, className, children, ...props }) => {
            // If has language class, it's a code block (already handled by pre)
            if (className?.startsWith('language-')) {
              return (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            }
            
            // It's an inline code element
            return (
              <code className="px-1 py-0.5 text-sm bg-muted rounded" {...props}>
                {children}
              </code>
            );
          },
          // Improved table with proper overflow handling
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
            
            // Regular link rendering - now with bold black text styling
            return (
              <a 
                href={processedHref} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="font-bold text-black dark:text-white hover:underline" 
                {...props}
              >
                {children}
              </a>
            );
          },
          // Handle line breaks properly
          br: () => <br className="line-break" />,
        }}
      >
        {preserveWhitespace(content)}
      </ReactMarkdown>
      
      {/* Display all links as cards outside the markdown content */}
      {links.length > 0 && (
        <div className="my-3 relative">
          {/* Restore horizontal scrolling but ensure tooltips are visible */}
          <div className="flex overflow-x-auto pb-2 hide-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <div className="flex gap-3">
              {links.map((link, index) => {
                const currentState = linkStates[link.url] || { status: 'idle' };
                const isAddedTooltipCurrentlyVisible = addedTooltipVisible[link.url] || false;
                
                return (
                  <div key={`link-card-${link.url}`} className="relative group">
                    <a 
                      href={link.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="no-underline block flex-shrink-0"
                      onClick={(e) => {
                        e.preventDefault();
                        window.open(link.url, '_blank', 'noopener,noreferrer');
                      }}
                    >
                      <div 
                        className="flex p-3 items-start gap-3 relative"
                        style={{
                          borderRadius: '16px',
                          border: '1px solid var(--superlight)',
                          background: 'var(--ultralight)',
                          width: '160px',
                          minWidth: '160px',
                          maxWidth: '160px'
                        }}
                      >
                        <Favicon domain={link.domain} key={`favicon-${link.domain}`} />
                        <div className="flex flex-col flex-grow min-w-0 overflow-hidden">
                          <div className="flex items-start w-full">
                            <span className="truncate text-sm font-medium text-foreground">
                              {link.domain || 'link'}
                            </span>
                          </div>
                          
                          <div className="flex flex-wrap gap-2 mt-2">
                            <span className="text-xs text-muted-foreground">
                              webpage
                            </span>
                          </div>
                        </div>
                      </div>
                    </a>
                    {onLinkSubmit && currentState.status !== 'added' && ( // Don't show button if already added
                      <Button
                        onClick={() => handleLinkSubmitWithLoading(link.url)}
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 hover:bg-white",
                          currentState.status === 'loading' && "opacity-100 cursor-not-allowed",
                          currentState.status === 'error' && "opacity-100"
                        )}
                        title={
                          currentState.status === 'loading' ? "Adding..." :
                          currentState.status === 'error' ? `Error: ${currentState.message}` :
                          "Add to files"
                        }
                        disabled={currentState.status === 'loading'}
                      >
                        {currentState.status === 'loading' && <Loader2 className="h-3 w-3 text-blue-500 animate-spin" />}
                        {currentState.status === 'error' && <AlertCircle className="h-3 w-3 text-red-500" />}
                        {currentState.status === 'idle' && <Plus className="h-3 w-3 text-blue-500" />}
                      </Button>
                    )}
                    {/* Show checkmark if added - make it clickable */}
                    {currentState.status === 'added' && (
                      <div 
                        ref={(el) => { addedTooltipRefs.current[link.url] = el; }}
                        className="absolute top-1 right-1 cursor-pointer"
                        onClick={() => toggleAddedTooltip(link.url)}
                      >
                        <div className="h-6 w-6 flex items-center justify-center rounded-full bg-green-100 hover:bg-green-200 transition-colors">
                          <Check className="h-3 w-3 text-green-600" />
                        </div>
                        {/* Added Tooltip with fixed positioning */}
                        {isAddedTooltipCurrentlyVisible && (
                          <div 
                            className="fixed transform -translate-x-1/2 transition-opacity duration-200" 
                            style={{ 
                              zIndex: 9999,
                              width: '200px',
                              // Position will be calculated and set by useEffect
                              left: '50%',
                              bottom: '30px' // Default fallback
                            }}
                            ref={(el) => {
                              if (el && addedTooltipRefs.current[link.url]) {
                                // Calculate position relative to the checkmark icon
                                const rect = addedTooltipRefs.current[link.url]!.getBoundingClientRect();
                                el.style.left = `${rect.left + rect.width/2}px`;
                                el.style.bottom = `${window.innerHeight - rect.top + 10}px`;
                              }
                            }}
                          >
                            <div className="relative">
                              {/* Arrow */}
                              <div className="w-2 h-2 bg-[#232323] transform rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2" style={{ zIndex: 101 }}></div>

                              {/* Tooltip content */}
                              <div
                                style={{
                                  zIndex: 100, // Ensure tooltip is above other elements
                                  display: "flex",
                                  padding: "8px 12px",
                                  flexDirection: "column",
                                  alignItems: "center",
                                  borderRadius: "12px",
                                  background: "var(--Monochrome-Black, #232323)",
                                  boxShadow: "0px 0px 20px 0px rgba(203, 203, 203, 0.20)",
                                  position: "relative",
                                  textAlign: "center"
                                }}
                              >
                                <div
                                  className="w-full"
                                  style={{
                                    color: "var(--Monochrome-White, #FFF)",
                                    fontSize: "12px",
                                    fontStyle: "normal",
                                    fontWeight: "400",
                                    lineHeight: "16px"
                                  }}
                                >
                                  File added to chat context. Manage in File Sidebar.
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if these props change
  return (
    prevProps.content === nextProps.content &&
    prevProps.messageId === nextProps.messageId &&
    // For onLinkSubmit, we only care if it goes from being defined to undefined or vice versa
    (!!prevProps.onLinkSubmit === !!nextProps.onLinkSubmit)
  );
});

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
  onLinkSubmit?: (url: string) => Promise<void>;
  onFileSelect?: (file: UploadedFile) => void;
  annotations?: MessageType & {
    toolAction: 'annotations';
    toolName?: string;
  };
  currentAgent?: string;
}

export function Message({ message, onCopy, onDelete, onEdit, onLinkSubmit, onFileSelect, annotations: propAnnotations, currentAgent }: MessageProps) {
  // Add console.log to check if annotations are being received
  useEffect(() => {
    if (propAnnotations) {
      console.log("Message received annotations:", {
        message_id: message.id,
        has_annotations: !!propAnnotations,
        annotation_content: propAnnotations.content ? propAnnotations.content.substring(0, 50) + '...' : 'No content'
      });
    }
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
  
  // Add new state for tooltip visibility
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  
  // New ref for handling clicks outside the tooltip
  const tooltipRef = useRef<HTMLDivElement>(null);
  
  // Render the file detail modal when a file is selected
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null);
  
  // Function to handle sending messages from file detail modal
  const handleSendMessage = (message: string) => {
    // If we have onLinkSubmit, we can use it to handle the content
    if (onLinkSubmit && message.startsWith('http')) {
      // Send as link if it's a URL
      onLinkSubmit(message).catch(console.error);
    }
  };
  
  // Function to handle file quick actions from file detail modal
  const handleFileQuickAction = (file: UploadedFile, action: string, content: string) => {
    // We don't have specific handlers for file quick actions in Message component yet
    console.log("File quick action triggered:", { file, action, content });
  };
  
  // Use both prop annotations and synthetic annotations
  const annotations = propAnnotations || syntheticAnnotations;
  
  // Track which file card is currently loading
  const [loadingFileId, setLoadingFileId] = useState<string | null>(null);
  
  // Function to handle file click and get full file details
  const handleFileClick = async (fileId: string, filename: string) => {
    try {
      // Set loading state for this specific file card
      setLoadingFileId(fileId);
      
      const backendUrl = getBackendUrl();
      // First, get the basic file info
      const response = await fetch(`${backendUrl}/api/files/${fileId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch file details: ${response.status}`);
      }
      
      const fileData = await response.json();
      
      // Then, try to get the file content if available
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
        console.warn("Could not load file content:", contentError);
        // Continue with the file data we have
      }
      
      // Try to fetch additional metadata if chatSessionId is available
      if (fileData.chatSessionId) {
        try {
          const metadataResponse = await fetch(`${backendUrl}/api/files?chat_session_id=${encodeURIComponent(fileData.chatSessionId)}`);
          if (metadataResponse.ok) {
            const allFiles = await metadataResponse.json();
            if (Array.isArray(allFiles)) {
              const enrichedFile = allFiles.find(f => f.id === fileId);
              if (enrichedFile) {
                // Merge all metadata
                Object.assign(fileData, enrichedFile);
              }
            }
          }
        } catch (metadataError) {
          console.warn("Could not load additional metadata:", metadataError);
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
        doc_publication_year: fileData.document?.publication_year || fileData.doc_publication_year || '',
        doc_summary: fileData.document?.summary || fileData.doc_summary || '',
        total_pages: fileData.document?.total_pages || fileData.total_pages || 0,
        source: fileData.source || (fileData.url ? 'link' : 'upload'),
        status: fileData.status || 'completed',
        processed_at: fileData.processed_at || '',
        file_content: fileContent
      };
      
      // If parent component provides onFileSelect, use that
      if (onFileSelect) {
        onFileSelect(file);
      } else {
        // Otherwise handle locally
        setSelectedFile(file);
      }
    } catch (error) {
      console.error("Error fetching file details:", error);
      // Show error notification
      setNotification('Error loading file details');
      setTimeout(() => setNotification(null), 3000);
    } finally {
      // Clear loading state regardless of success or failure
      setLoadingFileId(null);
    }
  };
  
  // Close tooltip when clicking outside
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
  
  // Function to extract file IDs directly from a message's metadata
  const extractFileIdsFromMetadata = (msg: MessageType & { metadata?: any }): string[] => {
    const fileIds: string[] = [];
    
    if (!msg.metadata) return fileIds;
    
    // Case 1: Direct citations array in metadata
    if (msg.metadata.citations && Array.isArray(msg.metadata.citations)) {
      msg.metadata.citations.forEach((citation: any) => {
        if (citation.file_id && !fileIds.includes(citation.file_id)) {
          fileIds.push(citation.file_id);
        }
      });
    }
    
    // Case 2: Raw content with AnnotationFileCitation format
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
    
    // Case 3: Enhanced content with citation markers
    if (msg.metadata.has_citations && 
        typeof msg.content === 'string' && 
        msg.content.includes('(') && 
        msg.content.includes(')') && 
        (msg.content.includes('cited in') || msg.content.includes('et al') || 
         msg.content.includes('citation'))) {
      
      // This is a heuristic - if the message looks like it includes citations
      // and has metadata but no actual file IDs were found, look for them in Works Cited
      const worksCitedMatch = msg.content.match(/Works Cited:[\s\S]+/);
      if (worksCitedMatch) {
        console.log("Found Works Cited section, analyzing...");
        // This message has a Works Cited section - good indicator of enhanced content
        setShouldFetchMetadata(true);
      }
    }
    
    console.log("Extracted file IDs from metadata:", fileIds);
    return fileIds;
  };
  
  // Use effect to automatically fetch metadata for cited files on refresh
  useEffect(() => {
    if (message.role === 'assistant' && message.metadata?.has_citations && !annotations) {
      const fileIds = extractFileIdsFromMetadata(message);
      
      // Fetch metadata for each file ID
      fileIds.forEach(fileId => {
        fetchFileMetadata(fileId);
      });
      
      // If we found file IDs, we want to trigger metadata loading
      if (fileIds.length > 0) {
        setShouldFetchMetadata(true);
      }
    }
  }, [message.id, message.metadata, message.role, message.content, annotations]);
  
  // Create synthetic annotations from metadata if needed
  useEffect(() => {
    if (!propAnnotations && 
        message.role === 'assistant' && 
        message.metadata?.has_citations && 
        message.metadata?.citations && 
        Array.isArray(message.metadata.citations) && 
        message.metadata.citations.length > 0) {
      
      console.log("Creating synthetic annotations from metadata.citations");
      
      // Create annotation content in the format expected by parseCitations
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
      setShouldFetchMetadata(true);
    }
  }, [message.metadata, propAnnotations, message.role, message.timestamp]);
  
  // Effect to ensure UI updates when enhancedText changes
  useEffect(() => {
    if (enhancedText) {
      // Force UI refresh when enhancedText is available
      setHasCitationsIncluded(true);
      
      // Log to verify text is available
      console.log("Enhanced text available:", enhancedText.substring(0, 50) + "...");
    }
  }, [enhancedText]);
  
  // Function to check if we have access to the annotations
  const ensureAnnotationsAvailable = async () => {
    // If we already have annotations (from props or synthetic) or they're not needed, skip
    if (annotations || !message.metadata?.has_citations) return null;
    
    // We have enhanced content but no annotations - need to fetch them
    if ((message.metadata?.has_citations || message.content.includes('citation')) && message.sessionId && message.id) {
      try {
        console.log("Fetching annotations for message:", message.id);
        
        const backendUrl = getBackendUrl();
        // First try to get tool messages with annotations for this specific message
        const toolResponse = await fetch(
          `${backendUrl}/api/chat-sessions/${message.sessionId}/messages?role=tool&toolAction=annotations`
        );
        
        if (!toolResponse.ok) {
          throw new Error(`Failed to fetch annotations: ${toolResponse.status}`);
        }
        
        const toolData = await toolResponse.json();
        console.log("Annotations tool messages response:", toolData);
        
        // Find the annotation that corresponds to this message based on timing
        let annotationContent = null;
        
        if (Array.isArray(toolData) && toolData.length > 0) {
          // Sort by timestamp to find the tool message closest to our message
          const sortedToolMessages = [...toolData].sort((a, b) => {
            const timeA = new Date(a.created_at).getTime();
            const timeB = new Date(b.created_at).getTime();
            
            // Get message creation time
            const messageTime = message.timestamp?.getTime() || Date.now();
            
            // Calculate absolute difference between message time and tool message time
            return Math.abs(timeA - messageTime) - Math.abs(timeB - messageTime);
          });
          
          // Use the closest tool message
          const closestToolMessage = sortedToolMessages[0];
          if (closestToolMessage && closestToolMessage.content) {
            annotationContent = closestToolMessage.content;
            console.log("Found annotation content:", annotationContent.substring(0, 50) + "...");
          }
        }
        
        if (annotationContent) {
          // Create a synthetic annotations object
          const fetchedAnnotations = {
            role: 'tool' as MessageType['role'],
            toolAction: 'annotations' as const,
            content: annotationContent,
            toolName: 'file_citations',
            timestamp: message.timestamp
          };
          
          // Set the synthetic annotations state
          setSyntheticAnnotations(fetchedAnnotations);
          
          // Trigger metadata fetch
          setShouldFetchMetadata(true);
          
          return fetchedAnnotations;
        }
      } catch (error) {
        console.error("Error fetching annotations:", error);
      }
    }
    
    return null;
  };

  // Use effect to ensure annotations are available when message loads
  useEffect(() => {
    // Only run this for assistant messages with citations but no annotations
    if (message.role === 'assistant' && message.metadata?.has_citations && !annotations) {
      ensureAnnotationsAvailable();
    }
  }, [message.id, message.metadata, message.role, annotations]);

  // Add useEffect to load enhanced content on mount if it exists in metadata
  useEffect(() => {
    if (
      message.role === 'assistant' && 
      message.metadata && 
      message.metadata.has_citations && 
      message.metadata.original_content
    ) {
      // If the current content is already enhanced, no need to update
      if (message.metadata.original_content !== message.content) {
        // Message already has enhanced content
        console.log("Found enhanced content, loading it with proper formatting");
        
        // Ensure whitespace is preserved by explicitly setting the enhancedText state
        // rather than relying on the message.content directly
        let enhancedContent = message.content;
        
        // Force text processing by adding an invisible character if this was loaded from a page refresh
        const isPageReload = window.performance && 
          (window.performance.navigation?.type === 1 || 
           window.performance.getEntriesByType('navigation').some(
             (entry: any) => entry.type === 'reload'
           ));
        
        if (isPageReload) {
          // Add an invisible zero-width space to force a re-parse on page reload
          enhancedContent = enhancedContent.trim() + '\u200B';
          console.log("Added invisible character to force re-rendering on reload");
        }
        
        setEnhancedText(enhancedContent);
        setHasCitationsIncluded(true);
        setCitationStyle(message.metadata.citation_style || 'apa');
        
        // Add class to force whitespace preservation
        setTimeout(() => {
          // Find the parent element containing this message's content
          const messageElement = document.getElementById(`message-${message.id}`);
          if (messageElement) {
            messageElement.classList.add('preserve-whitespace');
            const paragraphs = messageElement.querySelectorAll('p');
            paragraphs.forEach(p => {
              p.classList.add('whitespace-pre-wrap');
              
              // Check for double spacing patterns
              if (p.innerHTML.includes('&nbsp;&nbsp;') || p.innerHTML.includes('\u00A0\u00A0')) {
                p.classList.add('has-doubled-spaces');
              }
            });
            console.log("Added whitespace-pre-wrap to paragraphs");
          }
        }, 100);
        
        // If we don't have annotations but the message contains citations, trigger metadata fetch
        if (!annotations && message.content.includes('citation')) {
          console.log("Enhanced message has citations but no annotations, will try to extract citation info");
          setShouldFetchMetadata(true);
          
          // Try to extract citation file IDs from the enhanced message content
          // Look for common citation patterns like (Author YYYY) or [X]
          const citationRegex = /\(([^)]+)\s+(\d{4})\)|\[(\d+)\]/g;
          let match;
          const extractedCitations = new Set<string>();
          
          while ((match = citationRegex.exec(message.content)) !== null) {
            // We found a citation, now look for file IDs in the message metadata
            if (message.metadata.citations && Array.isArray(message.metadata.citations)) {
              message.metadata.citations.forEach((citation: any) => {
                if (citation.file_id && !extractedCitations.has(citation.file_id)) {
                  extractedCitations.add(citation.file_id);
                  console.log(`Extracted citation file ID from metadata: ${citation.file_id}`);
                  fetchFileMetadata(citation.file_id);
                }
              });
            }
          }
        }
      }
    }
  }, [message.id, message.metadata, message.content, message.role, annotations]);

  // Use location.reload detection to preserve formatting
  useEffect(() => {
    // Check if this is a page reload (not a navigation)
    const isPageReload = window.performance && 
      window.performance.navigation && 
      window.performance.navigation.type === 1;
    
    if (isPageReload && 
        message.role === 'assistant' && 
        message.metadata?.has_citations && 
        enhancedText) {
      console.log("Detected page reload with enhanced content, forcing whitespace preservation");
      
      // Force re-render with explicit whitespace preservation
      setHasCitationsIncluded(true);
      
      // Add special class to message container on reload
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

  // Determine if this message is in a loading/streaming state
  const isStreaming = message.role === 'assistant' && message.content === '';

  // Function to parse citations from content
  const parseCitations = (content: string): Citation[] => {
    try {
      // Handle the specific format with annotations= prefix
      if (content.startsWith('annotations=')) {
        console.log("Parsing citations from annotations= format");
        // Strip the annotations= prefix and any surrounding brackets
        const contentWithoutPrefix = content.replace(/^annotations=\s*\[\s*|\s*\]\s*$/g, '');
        // Look for AnnotationFileCitation patterns
        const matches = contentWithoutPrefix.match(/AnnotationFileCitation\(([^)]+)\)/g);
        
        if (matches) {
          console.log(`Found ${matches.length} citations in annotations format`);
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
      
      // Handle individual AnnotationFileCitation matches
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
        // Silent error handling for JSON parsing
      }
    } catch (e) {
      console.error("Error parsing citations:", e);
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
    if (shouldFetchMetadata && annotations) {
      console.log("Fetching metadata for citations in annotations");
      const citations = parseCitations(annotations.content);
      
      // Log the parsed citations for debugging
      console.log("Parsed citations:", citations);
      
      if (citations.length > 0) {
        // Create a Map to store unique citations by file_id
        const uniqueCitations = new Map();
        citations.forEach(citation => {
          if (!uniqueCitations.has(citation.file_id)) {
            uniqueCitations.set(citation.file_id, citation);
          }
        });
        
        // Fetch metadata for all unique citations
        Array.from(uniqueCitations.values()).forEach(citation => {
          console.log("Fetching metadata for citation:", citation);
          fetchFileMetadata(citation.file_id);
        });
      } else {
        console.warn("No citations found in annotations content:", annotations.content.substring(0, 100));
      }
      
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
      
      // Preserve original message's paragraphs and formatting
      const originalParagraphs = message.content.split(/\n\s*\n/);
      
      // Prepare the request body
      const requestBody = {
        message_content: message.content,
        citations: citations.map(citation => ({
          file_id: citation.file_id,
          index: citation.index,
          filename: citation.filename
        })),
        citation_style: style,
        preserve_formatting: true // Add flag to preserve formatting
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
      console.log("Citations API Response:", data); // Debug log
      
      if (!data.enhanced_message) {
        throw new Error('No enhanced text received from server');
      }

      // Update the UI immediately
      const enhancedMessage = data.enhanced_message;
      
      // Set enhanced text ensuring whitespace is preserved
      setEnhancedText(enhancedMessage);
      setHasCitationsIncluded(true);
      
      // Save to database
      if (message.id && message.sessionId) {
        try {
          console.log("Saving enhanced message to database:", {
            id: message.id,
            sessionId: message.sessionId
          });
          
          // Create metadata for enhancement tracking
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
          console.log("Database update result:", updateResult);
          
        } catch (dbError) {
          console.error("Error saving enhanced message to database:", dbError);
          // Continue anyway since the UI is already updated
        }
      } else {
        console.warn("Cannot save to database: missing message.id or message.sessionId", { 
          id: message.id, 
          sessionId: message.sessionId 
        });
      }
    } catch (error) {
      console.error("Citation processing error:", error);
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

  // Helper function to get agent description
  const getAgentDescription = (agentName: string) => {
    switch(agentName) {
      case "Triage Agent":
      case "General Assistant":
        return "The most suitable and effective model for general questions and answers based on uploaded files";
      case "Grok X":
        return "Great for questions about social media trends, viral content, and the latest news";
      case "Mistral Europe":
        return "Specializes in European languages, culture, and regional topics";
      case "Claude Creative":
        return "Great for questions about social media trends, viral content, and the latest news";
      case "Deep Seek":
        return "Expert in Chinese culture, language, and current affairs";
      case "Perplexity":
        return "Provides up-to-date information and internet search results";
      case "Deep Thinker":
        return "Great for questions about social media trends, viral content, and the latest news";
      default:
        return "";
    }
  };

  // Helper function to get display name for agents
  const getDisplayAgentName = (agentName: string) => {
    // Always display "General Assistant" instead of "Triage Agent"
    if (agentName === "Triage Agent") {
      return "General Assistant";
    }
    return agentName;
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

  // Check if a message is a file quick action message (updated format)
  const isFileQuickAction = (content: string) => {
    return typeof content === 'string' && 
          (content.startsWith('<FILE_QUICK_ACTION>') || 
           content.startsWith('Analyze this document:'));
  };

  // Parse file quick action message to extract metadata (handles both old and new formats)
  const parseFileQuickAction = (content: string) => {
    if (!isFileQuickAction(content)) return null;
    
    // Handle the new format: "Analyze this document: "filename". Action"
    if (content.startsWith('Analyze this document:')) {
      try {
        // Extract filename - should be inside quotes after "Analyze this document:"
        const filenameMatch = content.match(/Analyze this document: "([^"]+)"/);
        const filename = filenameMatch ? filenameMatch[1] : "document";
        
        // Extract action - should be the text between the filename and the content section
        const actionMatch = content.match(/Analyze this document: "[^"]+"\.?\s*([^\.]+)/);
        const action = actionMatch ? actionMatch[1].trim() : "Analyze";
        
        return {
          filename,
          action,
          file_id: "unknown"  // We don't have this in the new format
        };
      } catch (e) {
        console.error("Error parsing new file quick action format:", e);
        return null;
      }
    }
    
    // Handle the old tag-based format
    if (content.startsWith('<FILE_QUICK_ACTION>')) {
      const lines = content.split('\n');
      const result: {[key: string]: string} = {};
      
      // Parse each line for key-value pairs
      for (let i = 1; i < lines.length - 1; i++) { // Skip first and last line (tags)
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

  // User message
  if (message.role === 'user') {
    // Check if this is a file quick action message
    if (typeof message.content === 'string' && isFileQuickAction(message.content)) {
      const actionData = parseFileQuickAction(message.content);
      if (actionData) {
        return (
          <div className="inline-block max-w-[85%] w-auto mb-3 py-3 px-4 relative group"
            style={{
              borderRadius: '16px 16px 0px 16px',
              border: '2px solid #FF9500', // Orange border
              background: 'rgba(255, 149, 0, 0.05)', // Light orange background
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
    
    // For regular user messages, check if they contain "Document content:" section to hide
    if (typeof message.content === 'string' && message.content.includes('Document content:')) {
      // More robust approach to extract just the essential parts
      try {
        // First, try to detect if this is a file quick action message in disguise
        // Check for "Analyze this document:" or similar patterns
        let fileActionMessage = false;
        let filename = "";
        let action = "";

        // Try to extract filename and action from full format
        const analyzeMatch = message.content.match(/Analyze this document: "([^"]+)"\.?\s*([^\.]+)/);
        if (analyzeMatch) {
          fileActionMessage = true;
          filename = analyzeMatch[1] || "document";
          action = analyzeMatch[2]?.trim() || "Analyze";
        } 
        // Also try to match other patterns like the CNN article example
        else {
          // Look for obvious title patterns
          const titleMatch = message.content.match(/^([^|\.]+)(\s*\|\s*[^\.]+)?\s*Action:\s*(.+?)(?=\s*Document content:)/s);
          if (titleMatch) {
            fileActionMessage = true;
            filename = titleMatch[1]?.trim() || "document";
            action = titleMatch[3]?.trim() || "Analyze";
          }
        }

        // If we detected a file action format
        if (fileActionMessage) {
          return (
            <div className="inline-block max-w-[85%] w-auto mb-3 py-3 px-4 relative group"
              style={{
                borderRadius: '16px 16px 0px 16px',
                border: '2px solid #FF9500', // Orange border
                background: 'rgba(255, 149, 0, 0.05)', // Light orange background
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

        // Fallback to simpler approach if not detected as file action
        // Extract just the part before "Document content:"
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
        console.error("Error parsing document content message:", e);
        // Fallback to just showing content before "Document content:"
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
    
    // Regular user message
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
      {/* Display notification */}
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
              <>
                {/* Citation indicator - show only when enhancedText exists */}
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
                    onLinkSubmit={onLinkSubmit} // Pass the handler down
                  />
                </div>
              </>
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
                    <div className="relative" ref={tooltipRef}> {/* Use agent tooltip ref here */}
                      <div
                        className={`flex items-center justify-center w-6 h-6 rounded-full ${getAgentCircleColor(message.metadata?.agent_name || message.agentName || currentAgent || 'Assistant')} ${getIconTextColor(message.metadata?.agent_name || message.agentName || currentAgent || 'Assistant')} cursor-pointer`}
                        onClick={() => setIsTooltipVisible(!isTooltipVisible)} // Toggle agent tooltip
                      >
                        {(() => {
                          if (message.content === '') {
                            return getAgentIcon(getDisplayAgentName(currentAgent || 'Assistant'));
                          }
                          const displayName = getDisplayAgentName(message.metadata?.agent_name || message.agentName || currentAgent || 'Assistant');
                          return getAgentIcon(displayName);
                        })()}
                        {isStreaming && (
                          <Loader2 className="h-3 w-3 animate-spin absolute top-0 right-0 -mt-1 -mr-1" />
                        )}
                      </div>

                      {/* Agent Tooltip - Restored Content */}
                      {isTooltipVisible && (
                        <div className="absolute bottom-full left-0 mb-2 transition-opacity duration-200" style={{ zIndex: 5 }}>
                          <div className="relative">
                            {/* Arrow */}
                            <div className="w-2 h-2 bg-[#232323] transform rotate-45 absolute -bottom-1 left-3" style={{ zIndex: 6 }}></div>
      
                            {/* Tooltip content */}
                            <div
                              style={{
                                display: "flex",
                                width: "210px",
                                padding: "4px",
                                flexDirection: "column",
                                alignItems: "flex-start",
                                borderRadius: "12px",
                                background: "var(--Monochrome-Black, #232323)",
                                boxShadow: "0px 0px 20px 0px rgba(203, 203, 203, 0.20)",
                                position: "relative"
                              }}
                            >
                              <div
                                className="font-semibold p-2 w-full"
                                style={{
                                  color: "var(--Monochrome-White, #FFF)",
                                  fontSize: "12px",
                                  fontStyle: "normal",
                                  fontWeight: "400",
                                  lineHeight: "16px"
                                }}
                              >
                                {getDisplayAgentName(message.metadata?.agent_name || message.agentName || currentAgent || 'Assistant')}
                              </div>
                              <div
                                className="p-2 pt-0 w-full"
                                style={{
                                  color: "var(--Monochrome-White, #FFF)",
                                  opacity: 0.7,
                                  fontSize: "12px",
                                  fontStyle: "normal",
                                  fontWeight: "400",
                                  lineHeight: "16px"
                                }}
                              >
                                {getAgentDescription(getDisplayAgentName(message.metadata?.agent_name || message.agentName || currentAgent || 'Assistant'))}
                              </div>
                            </div>
                          </div>
                        </div>
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
                        className="flex p-4 items-start gap-3 relative group flex-shrink-0 cursor-pointer"
                        style={{
                          borderRadius: '16px',
                          border: '1px solid var(--superlight)',
                          background: 'var(--ultralight)',
                          width: '160px',
                          minWidth: '160px',
                          maxWidth: '160px'
                        }}
                        onClick={() => handleFileClick(citation.file_id, metadata?.file_name || citation.filename)}
                      >
                        {/* Show loading overlay when this specific file is loading */}
                        {loadingFileId === citation.file_id && (
                          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70 z-10 rounded-[16px]">
                            <div className="flex flex-col items-center">
                              <div className="h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                              <span className="text-xs mt-1 text-blue-600">Loading...</span>
                            </div>
                          </div>
                        )}
                        
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
      
      {/* Render the file detail modal when selected */}
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
}
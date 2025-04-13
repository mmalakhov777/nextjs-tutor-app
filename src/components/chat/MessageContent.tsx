import { useRef, useEffect, useState } from 'react';
import React from 'react';
import Image from 'next/image';
import { Copy, ArrowRight, File, ChevronDown, ChevronRight, Download, Search, FileText, AlertCircle, Loader2, Trash2, Pencil, Share2, Check, Link, ExternalLink, Volume2, VolumeX, Users, X, Info, Plus, Settings, Wrench, Shield, UserCircle, Brain, Globe, Sparkles, BookOpen, Code, Lightbulb, ChevronDown as ChevronDownIcon, ChevronUp } from 'lucide-react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import rehypeHighlight from 'rehype-highlight';


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
    /* Ensure link cards are always visible */
    .link-cards-container {
      opacity: 1 !important;
      display: block !important;
      visibility: visible !important;
      height: auto !important;
      min-height: 50px !important;
      overflow: visible !important;
      transition: none !important;
    }
    /* Additional style to keep link cards visible */
    .link-cards-visible {
      position: relative !important;
      z-index: 10 !important;
    }
  `}</style>
);

interface LinkState {
  status: 'idle' | 'loading' | 'added' | 'error';
  message?: string;
}

export interface MessageContentProps {
  content: string;
  messageId?: string;
  onLinkSubmit?: (url: string) => Promise<void>;
  hasFileAnnotations?: boolean;
}

export const MessageContent = React.memo(({ content, messageId, onLinkSubmit, hasFileAnnotations }: MessageContentProps) => {
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
  const [linkCardsVisible, setLinkCardsVisible] = useState(true); // New state to control link cards visibility

  // Add an effect to ensure link cards remain visible
  useEffect(() => {
    // Ensure link cards are visible initially
    if (links.length > 0) {
      setLinkCardsVisible(true);
      
      // Add a longer delay to ensure they remain visible
      const timer = setTimeout(() => {
        setLinkCardsVisible(true);
        
        // Try to forcibly show link cards by adding a class to their container
        const linkContainer = document.querySelector('.link-cards-container');
        if (linkContainer) {
          linkContainer.classList.add('link-cards-visible');
          linkContainer.setAttribute('style', 'opacity: 1 !important; display: flex !important;');
        }
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [links.length]);

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
      
      {/* Display all links as cards outside the markdown content - always show them */}
      {links.length > 0 && linkCardsVisible && (
        <div className="my-3 relative link-cards-container" style={{ opacity: 1, display: 'block' }}>
          {/* Restore horizontal scrolling but ensure tooltips are visible */}
          <div className="flex overflow-x-auto pb-2 hide-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <div className="flex gap-3">
              {links.map((link, index) => {
                const currentState = linkStates[link.url] || { status: 'idle' };
                const isAddedTooltipCurrentlyVisible = addedTooltipVisible[link.url] || false;
                
                return (
                  <div key={`link-card-${link.url}-${index}`} className="relative group">
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
    prevProps.hasFileAnnotations === nextProps.hasFileAnnotations &&
    // For onLinkSubmit, we only care if it goes from being defined to undefined or vice versa
    (!!prevProps.onLinkSubmit === !!nextProps.onLinkSubmit)
  );
}); 
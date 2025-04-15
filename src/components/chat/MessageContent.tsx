import { useRef, useEffect, useState, useCallback } from 'react';
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

// Global favicon cache to prevent redundant fetches
const faviconCache: Record<string, string> = {};

// Favicon component that displays a website's favicon
const Favicon = React.memo(({ domain }: { domain: string }) => {
  const [faviconSrc, setFaviconSrc] = useState<string | null>(() => {
    // Check if we already have this domain in our cache
    return faviconCache[domain] || null;
  });
  const [error, setError] = useState(false);
  const [attemptedSources, setAttemptedSources] = useState<string[]>([]);
  const domainRef = useRef<string>(domain);
  const isInitialMount = useRef<boolean>(true);
  
  // Only run this effect on first mount to prevent re-fetching
  useEffect(() => {
    // Only load if this is the initial mount or if domain has actually changed
    // and we don't have it cached
    if ((isInitialMount.current || domainRef.current !== domain) && !faviconCache[domain]) {
      isInitialMount.current = false;
      domainRef.current = domain;
      
      // Reset states when domain changes
      setError(false);
      setAttemptedSources([]);
      
      if (!domain) {
        setError(true);
        return;
      }
      
      // Start with Google's service which is most reliable
      const googleFaviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
      // Preload the image to avoid flickering
      const img = new window.Image();
      img.onload = () => {
        setFaviconSrc(googleFaviconUrl);
        // Add to cache
        faviconCache[domain] = googleFaviconUrl;
      };
      img.onerror = () => {
        // Immediately try the next source
        tryDuckDuckGo();
      };
      img.src = googleFaviconUrl;
      setAttemptedSources(['google']);
    }
  }, [domain]);
  
  // Extracted to separate function to improve readability
  const tryDuckDuckGo = () => {
    if (!domainRef.current) return;
    
    const duckduckgoUrl = `https://icons.duckduckgo.com/ip3/${domainRef.current}.ico`;
    const img = new window.Image();
    img.onload = () => {
      setFaviconSrc(duckduckgoUrl);
      // Add to cache
      faviconCache[domainRef.current] = duckduckgoUrl;
    };
    img.onerror = () => {
      // Try direct favicon
      tryDirectFavicon();
    };
    img.src = duckduckgoUrl;
    setAttemptedSources(prev => [...prev, 'duckduckgo']);
  };
  
  const tryDirectFavicon = () => {
    if (!domainRef.current) return;
    
    const directUrl = `https://${domainRef.current}/favicon.ico`;
    const img = new window.Image();
    img.onload = () => {
      setFaviconSrc(directUrl);
      // Add to cache
      faviconCache[domainRef.current] = directUrl;
    };
    img.onerror = () => {
      // If all fail, show the fallback icon
      setError(true);
    };
    img.src = directUrl;
    setAttemptedSources(prev => [...prev, 'direct']);
  };
  
  const handleError = () => {
    // Only proceed if we haven't tried all sources yet
    if (!faviconSrc) return;
    
    // Try DuckDuckGo if Google fails
    if (!attemptedSources.includes('duckduckgo')) {
      tryDuckDuckGo();
    }
    // Try direct favicon if DuckDuckGo fails
    else if (!attemptedSources.includes('direct')) {
      tryDirectFavicon();
    }
    // If all fail, show the fallback icon
    else {
      setError(true);
    }
  };
  
  // Use cached value when component re-renders to prevent flicker
  const cachedSrc = React.useMemo(() => faviconSrc, [faviconSrc]);
  
  return (
    <div 
      className="w-8 h-8 flex items-center justify-center rounded-full flex-shrink-0"
      style={{ 
        background: 'var(--superlight)',
        overflow: 'hidden'
      }}
    >
      {error || !cachedSrc ? (
        <ExternalLink className="h-4 w-4 text-blue-500" />
      ) : (
        <div className="flex items-center justify-center w-full h-full">
          <img 
            src={cachedSrc}
            alt=""
            width={20}
            height={20}
            onError={handleError}
            className="object-contain max-w-[16px] max-h-[16px]"
            loading="eager"
          />
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Perform a deep equality check on domain
  return prevProps.domain === nextProps.domain;
});


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
    
    /* Markdown-specific styling */
    .markdown-content h1 {
      font-size: 1.8rem;
      font-weight: bold;
      margin-bottom: 1rem;
      margin-top: 1.5rem;
    }
    
    .markdown-content h2 {
      font-size: 1.5rem;
      font-weight: bold;
      margin-bottom: 0.75rem;
      margin-top: 1.25rem;
    }
    
    .markdown-content h3 {
      font-size: 1.25rem;
      font-weight: bold;
      margin-bottom: 0.5rem;
      margin-top: 1rem;
    }
    
    .markdown-content h4 {
      font-size: 1.1rem;
      font-weight: bold;
      margin-bottom: 0.5rem;
      margin-top: 0.75rem;
    }
    
    .markdown-content h5, .markdown-content h6 {
      font-size: 1rem;
      font-weight: bold;
      margin-bottom: 0.5rem;
      margin-top: 0.75rem;
    }
    
    .markdown-content ul, .markdown-content ol {
      padding-left: 1.5rem;
      margin-bottom: 1rem;
    }
    
    .markdown-content ul {
      list-style-type: disc;
    }
    
    .markdown-content ol {
      list-style-type: decimal;
    }
    
    .markdown-content li {
      margin-bottom: 0.25rem;
    }
    
    .markdown-content pre {
      background-color: #f6f8fa;
      border-radius: 0.25rem;
      padding: 1rem;
      overflow-x: auto;
      margin-bottom: 1rem;
    }
    
    .dark .markdown-content pre {
      background-color: #1e1e1e;
    }
    
    .markdown-content code {
      background-color: rgba(175, 184, 193, 0.2);
      border-radius: 0.25rem;
      padding: 0.2em 0.4em;
      font-family: monospace;
    }
    
    .markdown-content pre code {
      background-color: transparent;
      padding: 0;
    }
    
    .markdown-content blockquote {
      border-left: 4px solid #dfe2e5;
      padding-left: 1rem;
      color: #6a737d;
      margin-bottom: 1rem;
    }
    
    .dark .markdown-content blockquote {
      border-left-color: #444;
      color: #aaa;
    }
    
    .markdown-content table {
      border-collapse: collapse;
      width: 100%;
      margin-bottom: 1rem;
    }
    
    .markdown-content table th, .markdown-content table td {
      border: 1px solid #dfe2e5;
      padding: 0.5rem;
    }
    
    .dark .markdown-content table th, .dark .markdown-content table td {
      border-color: #444;
    }
    
    .markdown-content table th {
      background-color: #f6f8fa;
      font-weight: bold;
    }
    
    .dark .markdown-content table th {
      background-color: #2d2d2d;
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
  loadingLinkId?: string | null;
  isStreaming?: boolean;
}

export const MessageContent = React.memo(function MessageContent({ content, messageId, onLinkSubmit, hasFileAnnotations, loadingLinkId, isStreaming }: MessageContentProps) {
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
    // Don't set loading state here if the parent is already tracking it
    if (!loadingLinkId) {
      setLinkStates(prev => ({ ...prev, [url]: { status: 'loading' } }));
    }
    
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
  
  // Function to toggle added tooltip visibility
  const toggleAddedTooltip = (url: string) => {
    setAddedTooltipVisible(prev => ({ ...prev, [url]: !prev[url] }));
  };
  
  // Create a separate memoized LinkCard component to prevent re-renders
  const LinkCard = React.memo(({ 
    link, 
    onLinkSubmit, 
    linkState, 
    isAddedTooltipVisible, 
    toggleAddedTooltip, 
    addedTooltipRef,
    index 
  }: { 
    link: { url: string; domain: string; title: string; extension: string };
    onLinkSubmit?: (url: string) => Promise<void>;
    linkState: LinkState;
    isAddedTooltipVisible: boolean;
    toggleAddedTooltip: (url: string) => void;
    addedTooltipRef: HTMLDivElement | null;
    index: number;
  }) => {
    const [ref, setRef] = useState<HTMLDivElement | null>(null);
    
    // Update ref when addedTooltipRef changes
    useEffect(() => {
      if (addedTooltipRef) {
        setRef(addedTooltipRef);
      }
    }, [addedTooltipRef]);
    
    const handleAddLink = async () => {
      if (!onLinkSubmit) return;
      
      try {
        // Use the parent component's function
        await handleLinkSubmitWithLoading(link.url);
      } catch (error) {
        // Error is already handled by parent function
      }
    };
    
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
        {onLinkSubmit && linkState.status !== 'added' && ( // Don't show button if already added
          <Button
            onClick={handleAddLink}
            variant="ghost"
            size="icon"
            className={cn(
              "absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 hover:bg-white",
              linkState.status === 'loading' && "opacity-100 cursor-not-allowed",
              linkState.status === 'error' && "opacity-100"
            )}
            title={
              linkState.status === 'loading' ? "Adding..." :
              linkState.status === 'error' ? `Error: ${linkState.message}` :
              "Add to files"
            }
            disabled={linkState.status === 'loading'}
          >
            {linkState.status === 'loading' && <Loader2 className="h-3 w-3 text-blue-500 animate-spin" />}
            {linkState.status === 'error' && <AlertCircle className="h-3 w-3 text-red-500" />}
            {linkState.status === 'idle' && <Plus className="h-3 w-3 text-blue-500" />}
          </Button>
        )}
        {/* Show checkmark if added - make it clickable */}
        {linkState.status === 'added' && (
          <div 
            ref={setRef}
            className="absolute top-1 right-1 cursor-pointer"
            onClick={() => toggleAddedTooltip(link.url)}
          >
            <div className="h-6 w-6 flex items-center justify-center rounded-full bg-green-100 hover:bg-green-200 transition-colors">
              <Check className="h-3 w-3 text-green-600" />
            </div>
            {/* Added Tooltip with fixed positioning */}
            {isAddedTooltipVisible && (
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
                  if (el && ref) {
                    // Calculate position relative to the checkmark icon
                    const rect = ref.getBoundingClientRect();
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
  }, (prevProps, nextProps) => {
    // Only re-render if these props change
    return (
      prevProps.link.url === nextProps.link.url &&
      prevProps.link.domain === nextProps.link.domain &&
      prevProps.linkState.status === nextProps.linkState.status &&
      prevProps.isAddedTooltipVisible === nextProps.isAddedTooltipVisible &&
      prevProps.index === nextProps.index
    );
  });

  // State for forcing re-renders when needed
  const [forceUpdateKey, setForceUpdateKey] = useState(0);
  
  // Function to handle completion of streaming to ensure proper markdown rendering
  const handleStreamingCompletion = useCallback(() => {
    console.log('🔄 Handling streaming completion - preparing to re-render');
    
    // Log messageId to verify it exists
    console.log('🏷️ [MESSAGE ID] Current messageId:', messageId);
    
    // Small delay to ensure content is fully processed
    const timerId = setTimeout(() => {
      console.log('🔄 Re-rendering markdown after streaming completed');
      // Force re-render by updating the key
      setForceUpdateKey(prev => prev + 1);
      
      // Additional delay to ensure the re-render completes before dispatching event
      setTimeout(() => {
        // Try to get the rendered HTML directly from the DOM
        let renderedHtml = '';
        if (messageId) {
          const markdownElement = document.querySelector(`#message-${messageId} .markdown-content`);
          if (markdownElement) {
            renderedHtml = markdownElement.innerHTML;
            console.log('✅ Successfully captured rendered HTML');
          } else {
            console.log('⚠️ Could not find markdown element for messageId:', messageId);
          }
        } else {
          console.error('❌ No messageId available for capturing HTML or dispatching event');
        }
        
        // Log detail information before dispatching event
        console.log('🛠️ [EVENT DETAILS]', {
          messageId: messageId || 'MISSING',
          hasContent: !!content,
          contentLength: content?.length || 0,
          hasRenderedHtml: !!renderedHtml,
          renderedHtmlLength: renderedHtml?.length || 0
        });
        
        const event = new CustomEvent('markdown-rendering-complete', {
          detail: {
            messageId,
            content,
            renderedHtml,
            timestamp: new Date().toISOString()
          }
        });
        console.log('📣 Dispatching markdown-rendering-complete event', { 
          messageId, 
          hasRenderedHtml: !!renderedHtml,
          contentLength: content?.length || 0
        });
        window.dispatchEvent(event);
      }, 200); // Increased delay to ensure React has finished rendering
      
    }, 500); // Increased delay for more reliable rendering
    
    return () => clearTimeout(timerId);
  }, [messageId, content]);

  // Helper to detect complex content that needs special handling
  const hasComplexContent = useCallback((text: string): boolean => {
    if (!text) return false;
    // Check for code blocks, multi-paragraph content, or tables
    return (
      text.includes('```') || 
      text.includes('\n\n') || 
      text.includes('|---') ||
      text.includes('<table') ||
      text.includes('- ') // List items
    );
  }, []);

  // Primary effect for handling streaming completion
  useEffect(() => {
    // Only trigger when streaming has just completed (changed from true to false)
    if (isStreaming === false && content) {
      console.log('🔵 Streaming just completed - triggering re-render');
      handleStreamingCompletion();
    }
  }, [isStreaming, content, handleStreamingCompletion]);

  // Secondary effect for handling content changes when not streaming
  useEffect(() => {
    // When content changes for complex content and we're not streaming
    if (!isStreaming && content && hasComplexContent(content)) {
      console.log('🟣 Complex content detected - triggering additional re-render');
      handleStreamingCompletion();
    }
  }, [content, isStreaming, handleStreamingCompletion, hasComplexContent]);

  // Final effect to ensure we re-render on component mount for already-completed messages
  useEffect(() => {
    // For already loaded messages (not streaming), trigger a re-render once on mount
    if (!isStreaming && content && messageId) {
      console.log('🟢 Non-streaming content on mount - triggering initial re-render');
      const timer = setTimeout(() => {
        setForceUpdateKey(prev => prev + 1);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [messageId]);

  return (
    <div 
      id={messageId ? `message-${messageId}` : undefined} 
      className="prose prose-sm dark:prose-invert max-w-none message-content-container preserve-all-breaks"
    >
      <GlobalStyles />
      <div className="markdown-content" key={`md-${forceUpdateKey}`}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[
            rehypeKatex,
            [rehypeRaw, { passThrough: ['span', 'div'] }],
            rehypeSanitize,
            [rehypeHighlight, { detect: true, ignoreMissing: true }]
          ]}
          key={`markdown-${forceUpdateKey}`} // Explicit key naming for debugging
          components={{
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
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
      
      {/* Display all links as cards outside the markdown content - always show them */}
      {links.length > 0 && linkCardsVisible && (
        <div className="my-3 relative link-cards-container" style={{ opacity: 1, display: 'block' }}>
          {/* Restore horizontal scrolling but ensure tooltips are visible */}
          <div className="flex overflow-x-auto pb-2 hide-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <div className="flex gap-3">
              {links.map((link, index) => {
                // Use loadingLinkId from props if available
                const isLoading = loadingLinkId === link.url;
                // Only use local state if not already loading from props
                const currentState = isLoading 
                  ? { status: 'loading' as const } 
                  : (linkStates[link.url] || { status: 'idle' as const });
                const isAddedTooltipCurrentlyVisible = addedTooltipVisible[link.url] || false;
                
                return (
                  <LinkCard
                    key={`link-card-${link.url}-${index}`}
                    link={link}
                    onLinkSubmit={onLinkSubmit}
                    linkState={currentState}
                    isAddedTooltipVisible={isAddedTooltipCurrentlyVisible}
                    toggleAddedTooltip={toggleAddedTooltip}
                    addedTooltipRef={addedTooltipRefs.current[link.url]}
                    index={index}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Modified memo comparison function to ensure re-renders when streaming status changes
  const shouldSkipRerender = 
    prevProps.content === nextProps.content &&
    prevProps.messageId === nextProps.messageId &&
    prevProps.hasFileAnnotations === nextProps.hasFileAnnotations &&
    prevProps.isStreaming === nextProps.isStreaming && 
    prevProps.loadingLinkId === nextProps.loadingLinkId &&
    // For onLinkSubmit, we only care if it goes from being defined to undefined or vice versa
    (!!prevProps.onLinkSubmit === !!nextProps.onLinkSubmit);
  
  return shouldSkipRerender;
}); 
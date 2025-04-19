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
import { LoadingSpinner } from '@/components/icons/LoadingSpinner';

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
      z-index: 1 !important;
    }
    /* Additional style to keep link cards visible */
    .link-cards-visible {
      position: relative !important;
      z-index: 1 !important;
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
    
    .hover-trigger .hidden-action {
      display: none;
    }
    
    .hover-trigger:hover .hidden-action {
      display: flex;
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
  isResearchResponse?: boolean;
}

export const MessageContent = React.memo(({ content, messageId, onLinkSubmit, hasFileAnnotations, loadingLinkId, isStreaming, isResearchResponse = false }: MessageContentProps) => {
  // Function to extract URLs from text with their surrounding context
  const extractLinks = React.useMemo(() => {
    // First, look for regular URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    
    // Regular Markdown-style links
    const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    
    // Special case for consecutive Markdown links with numbered references
    // This handles cases like: [text](url1)[[number]](url2)
    const numberedRefRegex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)(?:\s*)\[\[(\d+)\]\]\((https?:\/\/[^)]+)\)/g;
    
    // Collect all URLs from all patterns
    let allUrls: string[] = [];
    let markdownMatches: Array<{text: string, url: string}> = [];
    
    // Extract regular URLs
    const regularUrls = content.match(urlRegex) || [];
    allUrls = [...regularUrls];
    
    // Extract special case of numbered references first
    // This ensures we handle both URLs in the pattern [text](url1)[[number]](url2)
    let numberedMatch;
    while ((numberedMatch = numberedRefRegex.exec(content)) !== null) {
      const [fullMatch, text, url1, numberRef, url2] = numberedMatch;
      
      // Add both URLs with appropriate context
      if (url1.startsWith('http')) {
        allUrls.push(url1);
        markdownMatches.push({text, url: url1});
      }
      
      if (url2.startsWith('http')) {
        allUrls.push(url2);
        markdownMatches.push({text: `Reference ${numberRef}`, url: url2});
      }
    }
    
    // Extract regular Markdown-style links
    let match;
    while ((match = markdownLinkRegex.exec(content)) !== null) {
      const [fullMatch, text, url] = match;
      
      // Skip if we've already processed this exact match in the numbered reference pattern
      // This check prevents duplicates when we have [text](url1)[[number]](url2)
      if (content.includes(`${fullMatch}[[`)) {
        const afterMatch = content.substring(match.index + fullMatch.length);
        if (afterMatch.match(/^\s*\[\[\d+\]\]\(/)) {
          continue; // Skip this match as it's part of a numbered reference pattern
        }
      }
      
      // Only add if it's a URL (some markdown links might be anchors or other non-URL formats)
      if (url.startsWith('http')) {
        allUrls.push(url);
        markdownMatches.push({text, url});
      }
    }
    
    if (allUrls.length === 0) return { text: content, links: [] };
    
    // Create a mapping of URLs to their context text from markdown links
    const markdownTextMap = new Map<string, string>();
    markdownMatches.forEach(({text, url}) => {
      markdownTextMap.set(url, text);
    });
    
    // Extract URLs with context
    const processedUrls = new Set<string>(); // Track processed URLs to avoid duplicates
    const links = allUrls.map(url => {
      // Clean up the URL if it has trailing punctuation
      const cleanUrl = url.replace(/[.,;:!?)]+$/, '');
      
      // Skip if we've already processed this URL
      if (processedUrls.has(cleanUrl)) return null;
      processedUrls.add(cleanUrl);
      
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
      
      // Use markdown text if available, otherwise try to extract from context
      let title = markdownTextMap.get(cleanUrl) || '';
      
      // If no title from markdown, try to extract from context
      if (!title) {
        // Try to extract a title-like text before the URL
        const beforeUrl = sentenceWithUrl.split(cleanUrl)[0].trim();
        
        // Look for text in quotes, between brackets, or take the last 5-7 words
        const quoteMatch = beforeUrl.match(/['"]([^'"]+)['"]\s*$/);
        const bracketMatch = beforeUrl.match(/\[([^\]]+)\]\s*$/);
        
        if (quoteMatch) {
          title = quoteMatch[1];
        } else if (bracketMatch) {
          title = bracketMatch[1];
        } else {
          // Try to extract a title from words before the link
          const words = beforeUrl.split(/\s+/);
          if (words.length >= 3) {
            // Take last 3-5 words as potential title
            const titleWords = words.slice(Math.max(0, words.length - 5));
            if (titleWords.join(' ').length > 5) {
              title = titleWords.join(' ');
              // Remove leading articles, conjunctions, etc.
              title = title.replace(/^(and|the|a|an|in|for|to|of|on|by|with)\s+/i, '');
            }
          }
        }
      }
      
      // If no good title, use domain name
      if (!title || title.length < 4) {
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
    }).filter(Boolean) as Array<{
      url: string;
      title: string;
      context: string;
      domain: string;
      extension: string;
    }>;
    
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
  const [errorTooltipVisible, setErrorTooltipVisible] = useState<Record<string, boolean>>({});
  const errorTooltipRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [linkCardsVisible, setLinkCardsVisible] = useState(true); // New state to control link cards visibility

  // Check for failed links in the FileSidebar and sync states
  useEffect(() => {
    const checkForFailedLinks = () => {
      // Look for elements with error classes in the FileSidebar that match our links
      const failedLinkElements = document.querySelectorAll('.file-upload-error');
      
      failedLinkElements.forEach(element => {
        const url = element.getAttribute('data-url');
        const errorMessage = element.getAttribute('data-error') || 'Failed to process link';
        
        if (url && links.some(link => link.url === url)) {
          console.log("Found failed link in FileSidebar:", url, errorMessage);
          // Update our state
          setLinkStates(prev => ({
            ...prev,
            [url]: { status: 'error', message: errorMessage }
          }));
        }
      });
    };
    
    // Run once after a delay to allow FileSidebar to render
    const timeoutId = setTimeout(checkForFailedLinks, 500);
    return () => clearTimeout(timeoutId);
  }, [links]);

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
      // Close success tooltips
      Object.keys(addedTooltipRefs.current).forEach(url => {
        if (addedTooltipRefs.current[url] && !addedTooltipRefs.current[url]!.contains(event.target as Node)) {
          setAddedTooltipVisible(prev => ({ ...prev, [url]: false }));
        }
      });
      
      // Close error tooltips
      Object.keys(errorTooltipRefs.current).forEach(url => {
        if (errorTooltipRefs.current[url] && !errorTooltipRefs.current[url]!.contains(event.target as Node)) {
          setErrorTooltipVisible(prev => ({ ...prev, [url]: false }));
        }
      });
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Add a function to validate if a link exists in the FileSidebar's uploaded files
  const checkLinkExistsInSidebar = (url: string) => {
    try {
      // Try to find the link in the FileSidebar - it might be in various elements
      // 1. Check for elements with data-file-url attribute
      const fileUrlElements = document.querySelectorAll('[data-file-url]');
      for (const element of fileUrlElements) {
        const fileUrl = element.getAttribute('data-file-url');
        if (fileUrl === url) {
          return true;
        }
      }
      
      // 2. Check for elements with data-url attribute
      const urlElements = document.querySelectorAll('[data-url]');
      for (const element of urlElements) {
        const dataUrl = element.getAttribute('data-url');
        if (dataUrl === url) {
          return true;
        }
      }
      
      // 3. Check for link text in file list elements
      try {
        const hostname = new URL(url).hostname;
        const fileElements = document.querySelectorAll('.file-card, .webpage-card, .youtube-card');
        for (const element of fileElements) {
          const text = element.textContent || '';
          if (text.includes(hostname) || text.includes(url)) {
            return true;
          }
        }
      } catch (e) {
        // URL parsing error, ignore
      }
      
      return false;
    } catch (error) {
      console.error("Error checking if link exists in sidebar:", error);
      return false;
    }
  };

  // Add a helper function to format the title nicely
  const formatLinkTitle = (link: { url: string; domain: string; title: string; extension: string; context?: string }): string => {
    // First extract a better title if possible
    let title = link.title;
    
    // Try to get a better title from the URL and context
    if (link.url) {
      const betterTitle = extractBetterTitle(link.url, link.context || '');
      if (betterTitle && betterTitle.length > 3) {
        title = betterTitle;
      }
    }
    
    // Remove dates and common prefixes/suffixes
    title = title
      .replace(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b|\b\d{4}-\d{2}-\d{2}\b|\b\d{2}-\d{2}-\d{4}\b/, '')
      .replace(/^(breaking|exclusive|just in|update):/i, '')
      .replace(/ \| [^|]+$/, '') // Remove pipe and text after it (common in news titles)
      .replace(/ [-–] [^-–]+$/, ''); // Remove dash and text after it
    
    // Capitalize first letter of each word
    const capitalized = title
      .replace(/\b\w/g, c => c.toUpperCase())
      .replace(/\bAnd\b/g, 'and')
      .replace(/\bThe\b/g, 'The')
      .replace(/\bOf\b/g, 'of')
      .replace(/\bIn\b/g, 'in')
      .replace(/\bTo\b/g, 'to');
    
    // Trim and limit length
    const trimmed = capitalized.trim();
    if (trimmed.length > 30) {
      return trimmed.substring(0, 30) + '...';
    }
    
    return trimmed;
  };

  // Add a helper function to extract better titles from URLs
  const extractBetterTitle = (url: string, context: string): string => {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.replace(/^www\./, '');
      
      // Special handling for Reuters URLs
      if (hostname === 'reuters.com') {
        // Extract title from path segments
        const pathSegments = urlObj.pathname.split('/').filter(segment => segment.length > 0);
        
        // Handle specific Reuters URL patterns
        if (pathSegments.includes('take-five')) {
          return "Global Markets Themes";
        }
        
        if (pathSegments.includes('world')) {
          return "World News";
        }
        
        if (pathSegments.includes('business')) {
          return "Business News";
        }
        
        if (pathSegments.length >= 3) {
          // Convert the last meaningful segment to a readable title
          const lastSegment = pathSegments[pathSegments.length - 1]
            .replace(/-/g, ' ')
            .replace(/\d{4}-\d{2}-\d{2}/, '') // Remove date patterns
            .replace(/graphic/, '') // Remove "graphic" word
            .replace(/\d+$/, ''); // Remove trailing numbers
            
          if (lastSegment && lastSegment.trim().length > 3) {
            return lastSegment.trim();
          }
          
          // If the last segment wasn't useful, try the second-to-last
          if (pathSegments.length > 3) {
            const secondLastSegment = pathSegments[pathSegments.length - 2].replace(/-/g, ' ');
            if (secondLastSegment && secondLastSegment.length > 3) {
              return secondLastSegment;
            }
          }
        }
      }
      
      // Special handling for New York Times
      if (hostname === 'nytimes.com' || hostname.includes('nyt.com')) {
        const pathSegments = urlObj.pathname.split('/').filter(segment => segment.length > 0);
        
        if (pathSegments.includes('opinion')) {
          return "NYT Opinion";
        }
        
        if (pathSegments.includes('technology')) {
          return "NYT Technology";
        }
        
        if (pathSegments.length >= 2) {
          // NYT articles often have a descriptive last segment
          const lastSegment = pathSegments[pathSegments.length - 1].replace(/-/g, ' ');
          if (lastSegment && lastSegment.length > 3 && !lastSegment.match(/^\d+$/)) {
            return "NYT: " + lastSegment;
          }
        }
      }
      
      // Special handling for BBC
      if (hostname.includes('bbc.com') || hostname.includes('bbc.co.uk')) {
        const pathSegments = urlObj.pathname.split('/').filter(segment => segment.length > 0);
        // BBC news articles often end with a descriptive slug
        if (pathSegments.length >= 2 && pathSegments[0] === 'news') {
          const lastSegment = pathSegments[pathSegments.length - 1].replace(/-/g, ' ');
          if (lastSegment && lastSegment.length > 3 && !lastSegment.match(/^\d+$/)) {
            return "BBC: " + lastSegment;
          }
        }
      }
      
      // Special handling for The Guardian
      if (hostname.includes('theguardian.com')) {
        const pathSegments = urlObj.pathname.split('/').filter(segment => segment.length > 0);
        if (pathSegments.includes('world')) {
          return "Guardian World News";
        }
        
        if (pathSegments.includes('technology')) {
          return "Guardian Tech";
        }
        
        if (pathSegments.length >= 3) {
          // Guardian articles typically end with a descriptive slug
          const lastSegment = pathSegments[pathSegments.length - 1].replace(/-/g, ' ');
          if (lastSegment && lastSegment.length > 3 && !lastSegment.match(/^\d+$/)) {
            return "Guardian: " + lastSegment;
          }
        }
      }
      
      // For Wikipedia, use the last path segment which is usually the article name
      if (hostname === 'en.wikipedia.org' && urlObj.pathname.startsWith('/wiki/')) {
        const articleName = urlObj.pathname.replace('/wiki/', '').replace(/_/g, ' ');
        if (articleName.length > 0) {
          return "Wiki: " + decodeURIComponent(articleName);
        }
      }
      
      // Handle GitHub repositories
      if (hostname === 'github.com') {
        const pathSegments = urlObj.pathname.split('/').filter(segment => segment.length > 0);
        if (pathSegments.length >= 2) {
          return `GitHub: ${pathSegments[0]}/${pathSegments[1]}`;
        }
      }
      
      // Handle YouTube videos
      if (hostname.includes('youtube.com') || hostname === 'youtu.be') {
        return "YouTube Video";
      }
      
      // For other URLs, try to find a title-like phrase in the context
      const beforeUrl = context.split(url)[0].trim();
      const sentenceBeforeUrl = beforeUrl.split(/[.!?]\s*/).pop() || '';
      
      // Check for quotes or bracketed text that might contain a title
      const quoteMatch = sentenceBeforeUrl.match(/["']([^"']+)["']\s*$/);
      const bracketMatch = sentenceBeforeUrl.match(/\[([^\]]+)\]\s*$/);
      
      if (quoteMatch) {
        return quoteMatch[1];
      } else if (bracketMatch) {
        return bracketMatch[1];
      }
      
      // If still no title, try to extract from URL pathname
      const pathTitle = urlObj.pathname
        .split('/')
        .pop()
        ?.replace(/[_-]/g, ' ')
        .replace(/\.\w+$/, ''); // Remove file extension
      
      if (pathTitle && pathTitle.length > 3) {
        return pathTitle;
      }
      
      // Fallback to domain with proper capitalization
      return hostname.split('.')[0].charAt(0).toUpperCase() + hostname.split('.')[0].slice(1);
    } catch (e) {
      // If URL parsing fails, return a default title
      return 'Link';
    }
  };

  // Function to handle link submission with loading state
  const handleLinkSubmitWithLoading = async (url: string): Promise<void> => {
    try {
      console.log("MessageContent attempting to submit link:", url);
      
      if (!onLinkSubmit) {
        throw new Error("No link submission function provided");
      }
      
      // Call the link submission function - but catch errors locally
      try {
        await onLinkSubmit(url);
        
        console.log("Link successfully submitted:", url);
        
        // Set success state 
        setLinkStates(prev => ({ ...prev, [url]: { status: 'added', message: 'Link added successfully' } }));
        
        // Dispatch event to update the virtual upload in sidebar to completed
        try {
          const uploadCompleteEvent = new CustomEvent('link-upload-completed', {
            detail: { 
              url: url,
              status: 'completed'
            },
            bubbles: true,
            cancelable: true
          });
          window.dispatchEvent(uploadCompleteEvent);
        } catch (eventError) {
          console.error("Error dispatching link completion event:", eventError);
        }
        
        // Show success notification
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-80 text-white px-4 py-2 rounded shadow-lg z-50 text-sm';
        notification.textContent = 'Link added successfully';
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 2000);
      } catch (error) {
        // Trap error here to prevent it from blocking other submissions
        console.error("Link submission error:", error);
        
        // Extract the error message
        const errorMessage = error instanceof Error ? error.message : 'Failed to add link';
        
        // Set error state with the message
        setLinkStates(prev => ({
          ...prev, 
          [url]: { status: 'error' as const, message: errorMessage }
        }));
        
        // Dispatch event to update the virtual upload in sidebar to error
        try {
          const uploadErrorEvent = new CustomEvent('link-upload-error', {
            detail: { 
              url: url,
              status: 'error',
              errorMessage: errorMessage
            },
            bubbles: true,
            cancelable: true
          });
          window.dispatchEvent(uploadErrorEvent);
        } catch (eventError) {
          console.error("Error dispatching link error event:", eventError);
        }
        
        // Show error notification
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded shadow-lg z-[100] text-sm';
        notification.textContent = errorMessage || 'Failed to add link';
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
        
        // Also update error toasts in the LinkCard component
        if (typeof document !== 'undefined') {
          document.querySelectorAll('.error-toast').forEach(el => {
            (el as HTMLElement).style.zIndex = '100';
          });
        }
      }
    } catch (error) {
      // This should never happen since we trap all errors above
      console.error("Unexpected error in handleLinkSubmitWithLoading:", error);
    }
  };
  
  // Function to toggle added tooltip visibility
  const toggleAddedTooltip = (url: string) => {
    setAddedTooltipVisible(prev => ({ ...prev, [url]: !prev[url] }));
  };
  
  // NEW: Add a function to toggle error tooltip visibility
  const toggleErrorTooltip = (url: string) => {
    setErrorTooltipVisible(prev => ({ ...prev, [url]: !prev[url] }));
  };
  
  // The key component that manages link cards
  const LinkCard = React.memo(({ 
    link,
    linkState, 
    isAddedTooltipVisible,
    isErrorTooltipVisible,
    toggleAddedTooltip,
    toggleErrorTooltip,
    addedTooltipRef,
    index 
  }: { 
    link: { url: string; domain: string; title: string; extension: string };
    linkState: LinkState;
    isAddedTooltipVisible: boolean;
    isErrorTooltipVisible: boolean;
    toggleAddedTooltip: (url: string) => void;
    toggleErrorTooltip: (url: string) => void;
    addedTooltipRef: HTMLDivElement | null;
    index: number;
  }) => {
    const [ref, setRef] = useState<HTMLDivElement | null>(null);
    const [errorRef, setErrorRef] = useState<HTMLDivElement | null>(null);
    // Track this specific card's loading state independently
    const [isThisCardLoading, setIsThisCardLoading] = useState(false);
    
    // Update ref when addedTooltipRef changes
    useEffect(() => {
      if (addedTooltipRef) {
        setRef(addedTooltipRef);
      }
    }, [addedTooltipRef]);
    
    // Store error tooltip ref
    useEffect(() => {
      if (errorRef) {
        errorTooltipRefs.current[link.url] = errorRef;
      }
    }, [errorRef, link.url]);
    
    // Completely isolated submission handler for this specific card
    const handleAddLink = () => { // No async here - completely detached
      if (isThisCardLoading || !onLinkSubmit) return;
      
      // Visual feedback immediately
      setIsThisCardLoading(true);
      setLinkStates(prev => ({
        ...prev,
        [link.url]: { status: 'loading' }
      }));
      
      // Dispatch a custom event to notify the FileSidebar to create a temporary upload item
      try {
        // Create an event with the link details to show in sidebar
        const addLinkEvent = new CustomEvent('link-upload-started', {
          detail: { 
            url: link.url,
            name: formatLinkTitle(link),
            domain: link.domain,
            uploadId: `link-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            timestamp: new Date().toISOString()
          },
          bubbles: true,
          cancelable: true
        });
        window.dispatchEvent(addLinkEvent);
      } catch (eventError) {
        console.error("Error dispatching link upload event:", eventError);
      }
      
      // TRUE fire-and-forget pattern - no waiting at all
      setTimeout(() => {
        // Temporarily override console.error to prevent error propagation
        const originalConsoleError = console.error;
        console.error = (...args) => {
          // Swallow all errors related to link submission
          if (args.length > 0 && 
              typeof args[0] === 'string' && 
              (args[0].includes('link') || args[0].includes('URL') || args[0].includes('Error'))) {
            // Log to a different method to avoid console pollution
            console.debug('[Suppressed Error]', ...args);
            return;
          }
          // Otherwise use the original
          originalConsoleError.apply(console, args);
        };
        
        try {
          // Create a self-executing function that doesn't propagate errors
          (function() {
            // Clone the URL to avoid any potential reference issues
            const urlToProcess = String(link.url);
            
            // Store the promise but don't await it
            let processPromise = null;
            
            try {
              // Call onLinkSubmit but don't await or catch directly
              processPromise = onLinkSubmit(urlToProcess);
              
              // Set a timeout to handle the loading state properly
              // even if the promise never resolves or rejects
              setTimeout(() => {
                try {
                  setIsThisCardLoading(false);
                } catch {}
              }, 15000); // 15 second max timeout
              
              // Set up handlers without awaiting
              processPromise
                .then(() => {
                  try {
                    // Success handler
                    setLinkStates(prev => ({
                      ...prev,
                      [urlToProcess]: { status: 'added', message: 'Link added successfully' }
                    }));
                    
                    // Dispatch event to update the virtual upload in sidebar to completed
                    try {
                      const uploadCompleteEvent = new CustomEvent('link-upload-completed', {
                        detail: { 
                          url: urlToProcess,
                          status: 'completed'
                        },
                        bubbles: true,
                        cancelable: true
                      });
                      window.dispatchEvent(uploadCompleteEvent);
                    } catch (eventError) {
                      console.error("Error dispatching link completion event:", eventError);
                    }
                    
                    try {
                      // Show success notification
                      const notification = document.createElement('div');
                      notification.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-80 text-white px-4 py-2 rounded shadow-lg z-50 text-sm';
                      notification.textContent = 'Link added successfully';
                      document.body.appendChild(notification);
                      setTimeout(() => {
                        try { notification.remove(); } catch {}
                      }, 2000);
                    } catch {}
                  } catch {}
                })
                .catch((error) => {
                  try {
                    // Error handler
                    let errorMessage = 'Failed to add link';
                    try {
                      if (error instanceof Error) {
                        errorMessage = error.message || errorMessage;
                      }
                    } catch {}
                    
                    // Update error state with the direct method
                    markLinkFailed(urlToProcess, errorMessage);
                    
                    // Dispatch event to update the virtual upload in sidebar to error
                    try {
                      const uploadErrorEvent = new CustomEvent('link-upload-error', {
                        detail: { 
                          url: urlToProcess,
                          status: 'error',
                          errorMessage: errorMessage
                        },
                        bubbles: true,
                        cancelable: true
                      });
                      window.dispatchEvent(uploadErrorEvent);
                    } catch (eventError) {
                      console.error("Error dispatching link error event:", eventError);
                    }
                    
                    try {
                      // Show error notification
                      const notification = document.createElement('div');
                      notification.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded shadow-lg z-[100] text-sm';
                      notification.textContent = errorMessage;
                      document.body.appendChild(notification);
                      setTimeout(() => {
                        try { notification.remove(); } catch {}
                      }, 3000);
                    } catch {}
                  } catch {}
                })
                .finally(() => {
                  try {
                    // Always reset loading state
                    setIsThisCardLoading(false);
                  } catch {}
                  
                  try {
                    // Restore original console.error
                    console.error = originalConsoleError;
                  } catch {}
                });
            } catch (e) {
              // Even if setting up the promise handlers fails
              try {
                setIsThisCardLoading(false);
                markLinkFailed(urlToProcess, 'Failed to process link');
              } catch {}
              
              try {
                // Restore original console.error
                console.error = originalConsoleError;
              } catch {}
            }
          })(); // Self-executing function
        } catch (e) {
          // Outer catch for truly unexpected errors
          try {
            setIsThisCardLoading(false);
          } catch {}
          
          try {
            // Restore original console.error
            console.error = originalConsoleError;
          } catch {}
        }
      }, 10); // Minimal timeout to detach from current execution context
    };
    
    // This component's loading state is completely local
    const isCardLoading = isThisCardLoading || linkState.status === 'loading';
    
    return (
      <div 
        className="relative" 
        data-url={link.url} 
        data-status={linkState.status}
      >
        <a 
          href={link.url} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="no-underline block flex-shrink-0 relative hover-trigger"
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
                  {formatLinkTitle(link)}
                </span>
              </div>
              
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="text-xs text-muted-foreground">
                  {link.domain || 'webpage'}
                </span>
              </div>
            </div>
          </div>
        
          {onLinkSubmit && linkState.status !== 'added' && linkState.status !== 'error' && (
            <div
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleAddLink();
              }}
              className={cn(
                "absolute top-1 right-1 h-6 w-6 rounded-full flex items-center justify-center cursor-pointer hidden-action",
                isCardLoading && "opacity-100 cursor-not-allowed bg-white/90",
                !isCardLoading && linkState.status === 'idle' && "bg-[#232323] hover:bg-[#363636]"
              )}
              title={
                isCardLoading ? "Adding..." :
                "Add to files"
              }
              style={{ pointerEvents: isCardLoading ? 'none' : 'auto' }}
            >
              {isCardLoading && (
                <div className="flex items-center justify-center">
                  <LoadingSpinner className="h-4 w-4" color="#70D6FF" />
                </div>
              )}
              {!isCardLoading && linkState.status === 'idle' && <Plus className="h-3 w-3 text-white" />}
            </div>
          )}
        </a>
        
        {/* Show error icon if error - make it clickable like the checkmark */}
        {linkState.status === 'error' && (
          <div 
            ref={setErrorRef}
            className="absolute top-1 right-1"
          >
            <div 
              className="h-6 w-6 flex items-center justify-center rounded-full bg-red-100 hover:bg-red-200 transition-colors cursor-pointer"
              onClick={() => toggleErrorTooltip(link.url)}
            >
              <AlertCircle className="h-3 w-3 text-red-600" />
            </div>
            {/* Error Tooltip with fixed positioning */}
            {isErrorTooltipVisible && (
              <div 
                className="fixed transform -translate-x-1/2 transition-opacity duration-200" 
                style={{ 
                  zIndex: 99999,
                  width: '200px',
                  // Position will be calculated and set by useEffect
                  left: '50%',
                  bottom: '30px' // Default fallback
                }}
                ref={(el) => {
                  if (el && errorRef) {
                    // Calculate position relative to the error icon
                    const rect = errorRef.getBoundingClientRect();
                    el.style.left = `${rect.left + rect.width/2}px`;
                    el.style.bottom = `${window.innerHeight - rect.top + 10}px`;
                  }
                }}
              >
                <div className="relative">
                  {/* Arrow */}
                  <div className="w-2 h-2 bg-[#232323] transform rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2" style={{ zIndex: 100000 }}></div>

                  {/* Tooltip content */}
                  <div
                    style={{
                      zIndex: 100000,
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
                      {linkState.message || "Failed to process link"}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Show checkmark if added - make it clickable */}
        {linkState.status === 'added' && (
          <div 
            ref={setRef}
            className="absolute top-1 right-1"
          >
            <div 
              className="h-6 w-6 flex items-center justify-center rounded-full bg-green-100 hover:bg-green-200 transition-colors cursor-pointer"
              onClick={() => toggleAddedTooltip(link.url)}
            >
              <Check className="h-3 w-3 text-green-600" />
            </div>
            {/* Added Tooltip with fixed positioning */}
            {isAddedTooltipVisible && (
              <div 
                className="fixed transform -translate-x-1/2 transition-opacity duration-200" 
                style={{ 
                  zIndex: 99999,
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
                  <div className="w-2 h-2 bg-[#232323] transform rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2" style={{ zIndex: 100000 }}></div>

                  {/* Tooltip content */}
                  <div
                    style={{
                      zIndex: 100000,
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
      prevProps.isErrorTooltipVisible === nextProps.isErrorTooltipVisible &&
      prevProps.index === nextProps.index
    );
  });

  // Add state to track if we need to force a re-render after streaming
  const [forceUpdateKey, setForceUpdateKey] = useState(0);
  
  // Force re-render when streaming ends to ensure Markdown is properly rendered
  useEffect(() => {
    if (isStreaming === false) {
      // Small delay to ensure content is fully available
      const timerId = setTimeout(() => {
        setForceUpdateKey(prev => prev + 1);
      }, 100);
      
      return () => clearTimeout(timerId);
    }
  }, [isStreaming]);

  // Add a useEffect to listen for custom error events
  useEffect(() => {
    // Listen for custom error events from Message component
    const handleLinkError = (event: any) => {
      const { url, error } = event.detail;
      if (url) {
        console.log(`Link error event received for ${url}:`, error);
        // Update the state for this specific link to show error
        setLinkStates(prev => ({
          ...prev,
          [url]: { status: 'error', message: error || 'Failed to add link' }
        }));
        
        // Show error notification
        try {
          const notification = document.createElement('div');
          notification.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded shadow-lg z-[100] text-sm';
          notification.textContent = error || 'Failed to add link';
          document.body.appendChild(notification);
          setTimeout(() => {
            try { notification.remove(); } catch {}
          }, 3000);
        } catch {}
      }
    };

    // Add event listener
    window.addEventListener('link-submission-error', handleLinkError);
    
    // Cleanup
    return () => {
      window.removeEventListener('link-submission-error', handleLinkError);
    };
  }, []);
  
  // Direct method to mark a link as failed - will be used by LinkCard
  const markLinkFailed = useCallback((url: string, errorMessage: string) => {
    setLinkStates(prev => ({
      ...prev,
      [url]: { status: 'error', message: errorMessage }
    }));
  }, []);

  return (
    <div 
      id={messageId ? `message-${messageId}` : undefined} 
      className="prose prose-sm dark:prose-invert max-w-none message-content-container preserve-all-breaks"
      style={{ position: 'relative' }}
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
        <>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2 mt-4">Add source to session context</h3>
          <div className="my-3 relative link-cards-container" style={{ opacity: 1, display: 'block', zIndex: 1 }}>
            {/* Restore horizontal scrolling but ensure tooltips are visible */}
            <div className="flex overflow-x-auto pb-2 hide-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              <div className="flex gap-3">
                {links.map((link, index) => {
                  // Get this link's state; default to idle
                  const currentState = linkStates[link.url] || { status: 'idle' as const };
                  const isAddedTooltipCurrentlyVisible = addedTooltipVisible[link.url] || false;
                  const isErrorTooltipCurrentlyVisible = errorTooltipVisible[link.url] || false;
                  return (
                    <LinkCard
                      key={`link-card-${link.url}-${index}`}
                      link={link}
                      linkState={currentState}
                      isAddedTooltipVisible={isAddedTooltipCurrentlyVisible}
                      isErrorTooltipVisible={isErrorTooltipCurrentlyVisible}
                      toggleAddedTooltip={toggleAddedTooltip}
                      toggleErrorTooltip={toggleErrorTooltip}
                      addedTooltipRef={addedTooltipRefs.current[link.url]}
                      index={index}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if these props change
  return (
    prevProps.content === nextProps.content &&
    prevProps.messageId === nextProps.messageId &&
    prevProps.hasFileAnnotations === nextProps.hasFileAnnotations &&
    prevProps.isStreaming === nextProps.isStreaming && 
    // For onLinkSubmit, we only care if it goes from being defined to undefined or vice versa
    (!!prevProps.onLinkSubmit === !!nextProps.onLinkSubmit) &&
    prevProps.isResearchResponse === nextProps.isResearchResponse
  );
}); 
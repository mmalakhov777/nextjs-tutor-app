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
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import 'katex/dist/katex.min.css';

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
    /* Make all links bold and #70D6FF */
    .message-content-container a {
      font-weight: bold !important;
      color: #70D6FF !important;
      text-decoration: none !important;
    }
    /* Add hover effect for links */
    .message-content-container a:hover {
      text-decoration: underline !important;
    }
    /* Dark mode support */
    .dark .message-content-container a {
      color: #70D6FF !important;
    }
    /* Additional link styling for prose content */
    .prose a {
      color: #70D6FF !important;
    }
    .prose a:hover {
      color: #70D6FF !important;
    }
    /* Summary elements */
    .prose summary {
      color: #70D6FF !important;
    }
    .prose summary:hover {
      color: #70D6FF !important;
    }
    /* Ensure main text stays #232323 */
    .message-content-container {
      color: #232323 !important;
    }
    .prose {
      color: #232323 !important;
    }
    .prose p, .prose div, .prose span, .prose li, .prose h1, .prose h2, .prose h3, .prose h4, .prose h5, .prose h6 {
      color: #232323 !important;
    }
    /* Override any inherited text colors but preserve link colors */
    .message-content-container *:not(a):not(summary) {
      color: #232323 !important;
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
  hasFileAnnotations?: boolean;
  isStreaming?: boolean;
  isResearchResponse?: boolean;
}

export const MessageContent: React.FC<MessageContentProps> = ({ 
  content, 
  messageId,
  hasFileAnnotations = false,
  isStreaming = false,
  isResearchResponse = false
}) => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [processedContent, setProcessedContent] = useState(content);
  const contentRef = useRef<HTMLDivElement>(null);

  // Process content for display
  useEffect(() => {
    if (isStreaming) {
      // For streaming content, show it as-is
      setProcessedContent(content);
        } else {
      // For completed messages, process the content
      let processed = content;
      
      // Handle research responses with citations
      if (isResearchResponse && processed.includes('[') && processed.includes(']')) {
        // Research responses might have citation links that need processing
        processed = processed.replace(/\[(\d+)\]/g, (match, num) => {
          return `[${num}]`;
        });
      }
      
      setProcessedContent(processed);
    }
  }, [content, isStreaming, isResearchResponse]);

  const handleCopyCode = useCallback((code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    });
  }, []);

  const handleLinkClick = useCallback(async (e: React.MouseEvent<HTMLAnchorElement>) => {
    const href = e.currentTarget.href;
    
    // Check if it's an external link
    if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
      e.preventDefault();
      
      // For links inside message content, just open in new tab
      // Don't use onLinkSubmit as that's for adding cards, not for regular content links
      window.open(href, '_blank', 'noopener,noreferrer');
    }
  }, []);

  // Custom components for markdown rendering
  const components = {
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : '';
      const codeString = String(children).replace(/\n$/, '');
      
      if (!inline && language) {
        return (
          <div className="relative group my-4">
            <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleCopyCode(codeString)}
                className="h-8 px-2 text-xs"
              >
                {copiedCode === codeString ? (
                  <>
                    <Check className="h-3 w-3 mr-1" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <SyntaxHighlighter
              style={oneDark}
              language={language}
              PreTag="div"
              className="rounded-md text-sm"
              {...props}
            >
              {codeString}
            </SyntaxHighlighter>
          </div>
        );
      }
      
      return (
        <code className="px-1.5 py-0.5 rounded-md bg-gray-100 text-sm font-mono" {...props}>
          {children}
        </code>
      );
    },
    
    a({ href, children, ...props }: any) {
      const isExternal = href && (href.startsWith('http://') || href.startsWith('https://'));
      
      return (
        <a
          href={href}
          onClick={handleLinkClick}
          className="inline-flex items-center gap-1 underline"
          style={{ color: '#70D6FF' }}
          target={isExternal ? "_blank" : undefined}
          rel={isExternal ? "noopener noreferrer" : undefined}
          {...props}
        >
          {children}
          {isExternal && <ExternalLink className="h-3 w-3" />}
        </a>
      );
    },
    
    p({ children, ...props }: any) {
      return (
        <p className="mb-4 last:mb-0 leading-relaxed" {...props}>
          {children}
        </p>
      );
    },
    
    ul({ children, ...props }: any) {
      return (
        <ul className="list-disc pl-6 mb-4 space-y-1" {...props}>
          {children}
        </ul>
      );
    },
    
    ol({ children, ...props }: any) {
      return (
        <ol className="list-decimal pl-6 mb-4 space-y-1" {...props}>
          {children}
        </ol>
      );
    },
    
    li({ children, ...props }: any) {
      return (
        <li className="leading-relaxed" {...props}>
          {children}
        </li>
      );
    },
    
    blockquote({ children, ...props }: any) {
      return (
        <blockquote className="border-l-4 border-gray-300 pl-4 my-4 italic text-gray-700" {...props}>
          {children}
        </blockquote>
      );
    },
    
    h1({ children, ...props }: any) {
      return (
        <h1 className="text-2xl font-bold mb-4 mt-6 first:mt-0" {...props}>
          {children}
        </h1>
      );
    },
    
    h2({ children, ...props }: any) {
      return (
        <h2 className="text-xl font-bold mb-3 mt-5 first:mt-0" {...props}>
          {children}
        </h2>
      );
    },
    
    h3({ children, ...props }: any) {
      return (
        <h3 className="text-lg font-bold mb-2 mt-4 first:mt-0" {...props}>
          {children}
        </h3>
      );
    },
    
    table({ children, ...props }: any) {
    return (
        <div className="overflow-x-auto my-4">
          <table className="min-w-full divide-y divide-gray-200" {...props}>
            {children}
          </table>
              </div>
      );
    },
    
    thead({ children, ...props }: any) {
      return (
        <thead className="bg-gray-50" {...props}>
          {children}
        </thead>
      );
    },
    
    tbody({ children, ...props }: any) {
      return (
        <tbody className="bg-white divide-y divide-gray-200" {...props}>
          {children}
        </tbody>
      );
    },
    
    th({ children, ...props }: any) {
      return (
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" {...props}>
          {children}
        </th>
      );
    },
    
    td({ children, ...props }: any) {
      return (
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" {...props}>
          {children}
        </td>
      );
    },
    
    hr({ ...props }: any) {
      return <hr className="my-6 border-gray-200" {...props} />;
    },
    
    details({ children, ...props }: any) {
    return (
        <details className="my-4 p-4 border border-gray-200 rounded-lg" {...props}>
          {children}
        </details>
      );
    },
    
    summary({ children, ...props }: any) {
      return (
        <summary className="cursor-pointer font-medium" style={{ color: '#70D6FF' }} {...props}>
          {children}
        </summary>
      );
    },
  };

  return (
    <div 
      ref={contentRef}
      className={cn(
        "prose prose-sm max-w-none mb-[10px]",
        "prose-p:leading-relaxed prose-p:mb-4",
        "prose-headings:font-bold",
        "prose-a:no-underline hover:prose-a:underline",
        "prose-code:text-sm prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded",
        "prose-pre:bg-gray-900 prose-pre:text-gray-100",
        "prose-blockquote:border-l-4 prose-blockquote:border-gray-300 prose-blockquote:pl-4",
        "prose-ul:pl-6 prose-ol:pl-6 prose-li:leading-relaxed",
        "prose-table:min-w-full prose-table:divide-y prose-table:divide-gray-200",
        hasFileAnnotations && "has-file-annotations",
        isStreaming && "streaming-content"
      )}
      style={{ 
        '--tw-prose-links': '#70D6FF',
        '--tw-prose-links-hover': '#70D6FF',
        color: '#232323'
      } as React.CSSProperties}
    >
      <GlobalStyles />
      {isStreaming ? (
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex, rehypeRaw]}
          components={components}
        >
          {processedContent}
        </ReactMarkdown>
      ) : (
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex, rehypeRaw]}
          components={components}
        >
          {processedContent}
        </ReactMarkdown>
      )}
    </div>
  );
}; 
import React, { useState, useEffect, memo, useMemo } from 'react';
import { Message as MessageType, UploadedFile } from '@/types/chat';
import { Plus, ChevronLeft, ChevronRight, X, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SpinnerIcon } from '@/components/icons/SpinnerIcon';

// Global cache for meta descriptions to prevent re-fetching (session-based)
const metaDescriptionCache = new Map<string, { description: string | null; title?: string | null; timestamp: number }>();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes for session cache

// Session storage key for persistent caching
const SESSION_CACHE_KEY = 'sourceMetadataCache';

// Load cache from session storage on initialization
const loadCacheFromSession = () => {
  if (typeof window !== 'undefined') {
    try {
      const cached = sessionStorage.getItem(SESSION_CACHE_KEY);
      if (cached) {
        const parsedCache = JSON.parse(cached);
        Object.entries(parsedCache).forEach(([url, data]: [string, any]) => {
          if (Date.now() - data.timestamp < CACHE_DURATION) {
            metaDescriptionCache.set(url, data);
          }
        });
      }
    } catch (error) {
      console.error('Error loading cache from session storage:', error);
    }
  }
};

// Save cache to session storage
const saveCacheToSession = () => {
  if (typeof window !== 'undefined') {
    try {
      const cacheObject = Object.fromEntries(metaDescriptionCache);
      sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(cacheObject));
    } catch (error) {
      console.error('Error saving cache to session storage:', error);
    }
  }
};

// Initialize cache from session storage
if (typeof window !== 'undefined') {
  loadCacheFromSession();
}

// Function to clean URLs by removing unwanted characters and UTM parameters
const cleanUrl = (url: string): string => {
  // Remove common unwanted characters that might be included when copying URLs
  let cleaned = url.trim();
  
  // Remove NUL characters (0x00) that can cause backend errors
  cleaned = cleaned.replace(/\x00/g, '');
  
  // Remove other control characters that might cause issues
  cleaned = cleaned.replace(/[\x00-\x1F\x7F]/g, '');
  
  // Remove brackets, parentheses, and other punctuation from the end
  cleaned = cleaned.replace(/[)\]}>.,;:!?'"]*$/, '');
  
  // Remove brackets, parentheses from the beginning
  cleaned = cleaned.replace(/^[(<\[{'"]*/, '');
  
  // Remove any trailing periods, commas, or other punctuation
  cleaned = cleaned.replace(/[.,;:!?]*$/, '');
  
  // Remove any markdown link syntax like [text](url) - extract just the URL
  const markdownMatch = cleaned.match(/\[.*?\]\((https?:\/\/[^)]+)\)/);
  if (markdownMatch) {
    cleaned = markdownMatch[1];
  }
  
  // Remove any remaining unwanted characters at the end
  cleaned = cleaned.replace(/[)\]}>]*$/, '');
  
  // Final cleanup: ensure no invisible or problematic characters remain
  cleaned = cleaned.replace(/[\u200B-\u200D\uFEFF]/g, ''); // Remove zero-width characters
  
  // Remove UTM tracking parameters and other common tracking parameters
  try {
    const urlObj = new URL(cleaned);
    const paramsToRemove = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'utm_id', 'utm_source_platform', 'utm_creative_format', 'utm_marketing_tactic',
      'fbclid', 'gclid', 'msclkid', 'twclid', 'li_fat_id',
      'mc_cid', 'mc_eid', '_ga', 'igshid', 'ref', 'referrer'
    ];
    
    paramsToRemove.forEach(param => {
      urlObj.searchParams.delete(param);
    });
    
    // Remove any parameter that starts with utm_ (catch-all for UTM variants)
    const allParams = Array.from(urlObj.searchParams.keys());
    allParams.forEach(param => {
      if (param.toLowerCase().startsWith('utm_')) {
        urlObj.searchParams.delete(param);
      }
    });
    
    cleaned = urlObj.toString();
  } catch (error) {
    // If URL parsing fails, return the cleaned string as-is
  }
  
  return cleaned;
};

// Function to fetch rich metadata using Serper API
const fetchRichMetadata = async (url: string): Promise<{ title: string | null; description: string | null } | null> => {
  // Check cache first
  const cached = metaDescriptionCache.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return { title: cached.title || null, description: cached.description };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch('/api/proxy/serper-scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const title = data.metadata?.title || data.metadata?.['og:title'] || null;
      const description = data.metadata?.Description || data.metadata?.['og:description'] || null;
      
      // Cache the result
      const cacheData = {
        title,
        description,
        timestamp: Date.now()
      };
      metaDescriptionCache.set(url, cacheData);
      saveCacheToSession(); // Save to session storage
      
      return { title, description };
    }
  } catch (error: unknown) {
    if (error instanceof Error && error.name !== 'AbortError') {
      console.error('Error fetching rich metadata:', error);
    }
    // Try fallback to original meta description API
    return await fetchMetaDescriptionFallback(url);
  }
  return null;
};

// Fallback function for original meta description API
const fetchMetaDescriptionFallback = async (url: string): Promise<{ title: string | null; description: string | null } | null> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(`/api/proxy/meta-description?url=${encodeURIComponent(url)}`, {
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const description = data.description || null;
      
      // Cache the result
      const cacheData = {
        title: null,
        description,
        timestamp: Date.now()
      };
      metaDescriptionCache.set(url, cacheData);
      saveCacheToSession(); // Save to session storage
      
      return { title: null, description };
    }
  } catch (error: unknown) {
    if (error instanceof Error && error.name !== 'AbortError') {
      console.error('Error fetching meta description fallback:', error);
    }
    // Cache null result to prevent retrying immediately
    const cacheData = {
      title: null,
      description: null,
      timestamp: Date.now()
    };
    metaDescriptionCache.set(url, cacheData);
    saveCacheToSession(); // Save to session storage
  }
  return null;
};

// Function to fetch meta description from URL (legacy - keeping for compatibility)
const fetchMetaDescription = async (url: string): Promise<string | null> => {
  const result = await fetchRichMetadata(url);
  return result?.description || null;
};

interface SourceData {
  url: string;
  title?: string;
  id?: string;
  fromParts: boolean;
  hostname: string;
}

interface SourceCardsDisplayProps {
  message: MessageType & {
    parts?: Array<{ type: string; source: { id?: string; url: string; title?: string; snippet?: string } }>;
  };
  onLinkSubmit?: (url: string) => Promise<void>;
  loadingLinkId?: string | null;
  setLoadingLinkId: React.Dispatch<React.SetStateAction<string | null>>;
  setNotification: React.Dispatch<React.SetStateAction<string | null>>;
  isMessageComplete?: boolean;
}

// YouTube icon component (copied from YouTubeCard.tsx for now)
const YouTubeIcon = ({ className = "text-red-500", size = 12 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    stroke="none"
    style={{ minWidth: `${size}px`, minHeight: `${size}px`, maxWidth: `${size}px`, maxHeight: `${size}px` }}
  >
    <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
  </svg>
);

// Adapted from YouTubeCard.tsx - simplified to check for video URLs
const isYouTubeVideoUrl = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname;
    const pathname = parsedUrl.pathname;

    // Check for youtube.com with video parameter 'v'
    if (hostname.includes('youtube.com') && parsedUrl.searchParams.has('v')) {
      return true;
    }
    // Check for youtu.be format (shortened YouTube links)
    if (hostname.includes('youtu.be') && pathname.length > 1 && pathname !== '/') {
      return true;
    }
    return false;
  } catch {
    return false;
  }
};

// Favicon component with fallback
const FaviconIcon = ({ hostname, size = 32, className = "" }: { hostname: string; size?: number; className?: string }) => {
  const [faviconError, setFaviconError] = useState(false);
  const [faviconLoaded, setFaviconLoaded] = useState(false);
  
  const faviconUrl = `https://favicone.com/${hostname}?s=${size}`;
  
  const handleFaviconLoad = () => {
    setFaviconLoaded(true);
    setFaviconError(false);
  };
  
  const handleFaviconError = () => {
    setFaviconError(true);
    setFaviconLoaded(false);
  };
  
  if (faviconError || !hostname) {
    // Fallback to first letter
    return (
      <span className={`text-xs font-medium ${className}`}>
        {hostname ? hostname.charAt(0).toUpperCase() : '?'}
      </span>
    );
  }
  
  return (
    <div className="relative">
      <img
        src={faviconUrl}
        alt={`${hostname} favicon`}
        width={size}
        height={size}
        onLoad={handleFaviconLoad}
        onError={handleFaviconError}
        className={`${className} ${faviconLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-200`}
        style={{ width: `${size}px`, height: `${size}px` }}
      />
      {!faviconLoaded && !faviconError && (
        <div className={`absolute inset-0 flex items-center justify-center ${className}`}>
          <span className="text-xs font-medium">
            {hostname ? hostname.charAt(0).toUpperCase() : '?'}
          </span>
        </div>
      )}
    </div>
  );
};

const SourceCardsDisplay: React.FC<SourceCardsDisplayProps> = memo(({
  message,
  onLinkSubmit,
  loadingLinkId,
  setLoadingLinkId,
  setNotification,
  isMessageComplete,
}) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [metaDescriptions, setMetaDescriptions] = useState<Map<string, { title: string | null; description: string | null }>>(new Map());
  const [selectedSourceUrl, setSelectedSourceUrl] = useState<string | null>(null);
  const [loadingMetaForUrl, setLoadingMetaForUrl] = useState<string | null>(null);
  const iconsPerPage = 7; // More icons can fit

  // Memoize source data extraction to prevent recalculation on every render
  const sourceData: SourceData[] = useMemo(() => {
    if (isMessageComplete === false) {
      return [];
    }
    
    const allSourceUrls = new Set<string>();
    const data: SourceData[] = [];

    if (message.parts && Array.isArray(message.parts)) {
      message.parts.forEach(part => {
        if (part.type === 'source' && part.source && part.source.url) {
          const cleanedUrl = cleanUrl(part.source.url);
          if (cleanedUrl && !allSourceUrls.has(cleanedUrl)) {
            let hostname = 'N/A';
            try {
              hostname = new URL(cleanedUrl).hostname.replace(/^www\./, '');
            } catch { /* ignore error */ }
            data.push({
              url: cleanedUrl,
              title: part.source.title,
              id: part.source.id,
              fromParts: true,
              hostname,
            });
            allSourceUrls.add(cleanedUrl);
          }
        }
      });
    }

    if (message.role === 'assistant' && message.content) {
      const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;
      const extractedUrls = message.content.match(urlRegex) || [];
      
      const cleanedUrls = extractedUrls
        .map(url => cleanUrl(url))
        .filter(url => url.length > 0);
      
      const uniqueContentUrls = [...new Set(cleanedUrls)];

      uniqueContentUrls.forEach(url => {
        if (!allSourceUrls.has(url)) {
          let hostname = 'N/A';
          try {
            hostname = new URL(url).hostname.replace(/^www\./, '');
          } catch { /* ignore error */ }
          data.push({
            url,
            fromParts: false,
            hostname,
          });
          allSourceUrls.add(url);
        }
      });
    }
    return data;
  }, [message.parts, message.content, message.role, isMessageComplete]);

  const messageKey = useMemo(() => {
    return `${message.id || 'no-id'}-${JSON.stringify(message.parts)}-${message.content}`;
  }, [message.id, message.parts, message.content]);

  // Load cached metadata on component mount
  useEffect(() => {
    const cachedData = new Map<string, { title: string | null; description: string | null }>();
    sourceData.forEach(source => {
      const cached = metaDescriptionCache.get(source.url);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        cachedData.set(source.url, { title: cached.title || null, description: cached.description });
      }
    });
    setMetaDescriptions(cachedData);
  }, [sourceData]);

  const handleIconClick = async (url: string) => {
    const newSelectedUrl = selectedSourceUrl === url ? null : url;
    setSelectedSourceUrl(newSelectedUrl);
    
    // If selecting a new source and we don't have metadata for it, fetch it
    if (newSelectedUrl && !metaDescriptions.has(newSelectedUrl)) {
      setLoadingMetaForUrl(newSelectedUrl);
      try {
        const metadata = await fetchRichMetadata(newSelectedUrl);
        if (metadata) {
          setMetaDescriptions(prev => new Map(prev).set(newSelectedUrl, metadata));
        }
      } catch (error) {
        console.error('Error fetching metadata for source:', error);
      } finally {
        setLoadingMetaForUrl(null);
      }
    }
  };

  // Skeleton component for loading state
  const MetadataSkeleton = () => (
    <div className="animate-pulse">
      <div className="h-4 bg-muted rounded mb-2 w-3/4"></div>
      <div className="h-3 bg-muted rounded mb-1 w-full"></div>
      <div className="h-3 bg-muted rounded mb-1 w-5/6"></div>
      <div className="h-3 bg-muted rounded w-2/3"></div>
    </div>
  );

  const renderAddButton = (url: string, inExpandedView: boolean = false) => (
    <Button
      onClick={async (e) => {
        e.stopPropagation();
        if (onLinkSubmit) {
          setLoadingLinkId(url);
          try {
            const domain = new URL(url).hostname;
            const uploadId = `source-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
            
            const linkUploadEvent = new CustomEvent('link-upload-started', {
              detail: { url, name: domain, domain, uploadId, timestamp: Date.now() }
            });
            window.dispatchEvent(linkUploadEvent);
            
            await onLinkSubmit(url);
            
            const successEvent = new CustomEvent('link-upload-completed', {
              detail: { url, status: 'completed' }
            });
            window.dispatchEvent(successEvent);
            
            setNotification('Source added to files');
            setTimeout(() => setNotification(null), 3000);
          } catch (error) {
            // Check if this is a network error
            const isNetworkError = (error instanceof TypeError && error.message.includes('fetch')) || 
                                  (error instanceof Error && (error.name === 'NetworkError' || error.message.includes('Network error')));
            
            const errorMessage = isNetworkError 
              ? 'Network error - check connection' 
              : (error instanceof Error ? error.message : 'Failed to add source');
            
            const errorEvent = new CustomEvent('link-upload-error', {
              detail: { 
                url, 
                status: 'error', 
                errorMessage: errorMessage,
                isNetworkError: isNetworkError
              }
            });
            window.dispatchEvent(errorEvent);
            
            const notificationMessage = isNetworkError 
              ? 'Network error: Could not add source' 
              : 'Failed to add source';
            
            setNotification(notificationMessage);
            setTimeout(() => setNotification(null), 3000);
          } finally {
            setLoadingLinkId(null);
          }
        }
      }}
      variant={inExpandedView ? "outline" : "ghost"}
      size={inExpandedView ? "sm" : "icon"}
      className={inExpandedView ? "text-xs" : "h-6 w-6 opacity-80 hover:opacity-100 transition-opacity hover:bg-transparent"}
      aria-label="Add source to files"
      disabled={loadingLinkId === url}
    >
      {loadingLinkId === url ? (
        <SpinnerIcon className="h-4 w-4 animate-spin" />
      ) : (
        <>
          <Plus className={`h-4 w-4 ${inExpandedView ? 'mr-1.5' : 'text-muted-foreground group-hover:text-foreground'}`} />
          {inExpandedView && "Add to Files"}
        </>
      )}
    </Button>
  );

  if (sourceData.length === 0) {
    return null;
  }

  const totalPages = Math.ceil(sourceData.length / iconsPerPage);
  const startIndex = currentPage * iconsPerPage;
  const endIndex = startIndex + iconsPerPage;
  const currentIconsData = sourceData.slice(startIndex, endIndex);

  const goToNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const selectedSourceDetails = selectedSourceUrl ? sourceData.find(s => s.url === selectedSourceUrl) : null;
  const selectedSourceMetadata = selectedSourceUrl ? metaDescriptions.get(selectedSourceUrl) : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 border rounded-2xl p-2">
            <h3 className="text-sm font-medium text-foreground">Sources</h3>
            {currentIconsData.map((source, index) => (
              <button
                key={source.url}
                onClick={() => handleIconClick(source.url)}
                className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium transition-all border-2 border-background
                            ${index > 0 ? '-ml-4' : ''}
                            ${selectedSourceUrl === source.url ? 'bg-accent text-accent-foreground z-10' : 'bg-muted hover:bg-[#232323] text-muted-foreground hover:text-white hover:z-10 z-0'}
                            focus:outline-none`}
                title={source.title || source.hostname}
              >
                {isYouTubeVideoUrl(source.url) ? (
                  <YouTubeIcon size={14} className="text-red-500" />
                ) : (
                  <FaviconIcon hostname={source.hostname} size={14} />
                )}
              </button>
            ))}
            
            {totalPages > 1 && (
              <div className="flex items-center gap-1 ml-2">
                <Button
                  onClick={goToPrevPage}
                  disabled={currentPage === 0}
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  aria-label="Previous sources"
                >
                  <ChevronLeft className="h-3 w-3" />
                </Button>
                <span className="text-xs text-muted-foreground px-1">
                  {currentPage + 1}/{totalPages}
                </span>
                <Button
                  onClick={goToNextPage}
                  disabled={currentPage >= totalPages - 1}
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  aria-label="Next sources"
                >
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedSourceDetails && (
        <div className="mt-2 p-3 border rounded-lg relative animate-fadeIn">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-1 right-1 h-6 w-6"
            onClick={() => setSelectedSourceUrl(null)}
            aria-label="Close source details"
          >
            <X className="h-4 w-4" />
          </Button>

          <div className="flex items-start gap-2 mb-1.5">
            <div className="flex-shrink-0 h-6 w-6 rounded-md flex items-center justify-center bg-muted text-muted-foreground text-sm">
              {isYouTubeVideoUrl(selectedSourceDetails.url) ? (
                <YouTubeIcon size={14} className="text-red-500" />
              ) : (
                <FaviconIcon hostname={selectedSourceDetails.hostname} size={14} />
              )}
            </div>
            <h4 className="text-sm font-medium text-foreground flex-grow line-clamp-2">
              {loadingMetaForUrl === selectedSourceDetails.url ? (
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                </div>
              ) : (
                selectedSourceMetadata?.title || selectedSourceDetails.title || selectedSourceDetails.hostname
              )}
            </h4>
          </div>
          
          <a
            href={selectedSourceDetails.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground break-all line-clamp-1 mb-1.5 block"
            style={{ color: '#70D6FF' }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#5BB8E8'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#70D6FF'}
            title={selectedSourceDetails.url}
          >
            {selectedSourceDetails.url}
          </a>

          {(metaDescriptions.has(selectedSourceDetails.url) || loadingMetaForUrl === selectedSourceDetails.url) && (
            <div className="text-xs text-muted-foreground line-clamp-3 mb-2">
              {loadingMetaForUrl === selectedSourceDetails.url ? (
                <MetadataSkeleton />
              ) : (
                selectedSourceMetadata?.description || 'No description available.'
              )}
            </div>
          )}

          <div className="flex items-center gap-2 mt-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => window.open(selectedSourceDetails.url, '_blank')}
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Open Link
            </Button>
            {renderAddButton(selectedSourceDetails.url, true)}
          </div>
        </div>
      )}
    </div>
  );
});

SourceCardsDisplay.displayName = 'SourceCardsDisplay';

export { SourceCardsDisplay }; 
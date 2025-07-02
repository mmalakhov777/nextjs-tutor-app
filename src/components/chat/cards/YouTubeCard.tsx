import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DeleteIcon } from '@/components/icons';
import type { UploadedFile } from '@/types/chat';
import { LoadingSpinner } from '@/components/icons/LoadingSpinner';
import { useState, useEffect, memo } from 'react';

// Global cache for meta descriptions to prevent re-fetching
const metaDescriptionCache = new Map<string, { description: string | null; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Helper function to remove file metadata from local storage
const removeFileMetadataFromLocalStorage = (fileId: string): void => {
  try {
    const storedMetadata = localStorage.getItem('uploadedFilesMetadata');
    if (!storedMetadata) return;
    
    const metadataObj = JSON.parse(storedMetadata);
    if (metadataObj[fileId]) {
      delete metadataObj[fileId];
      localStorage.setItem('uploadedFilesMetadata', JSON.stringify(metadataObj));
      console.log(`File metadata removed for ${fileId}`);
    }
  } catch (error) {
    console.error('Error removing file metadata from local storage:', error);
  }
};

// Optimized function to fetch meta description with caching
const fetchMetaDescription = async (url: string): Promise<string | null> => {
  // Check cache first
  const cached = metaDescriptionCache.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.description;
  }

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
      metaDescriptionCache.set(url, {
        description,
        timestamp: Date.now()
      });
      
      return description;
    }
  } catch (error: unknown) {
    if (error instanceof Error && error.name !== 'AbortError') {
      console.error('Error fetching meta description:', error);
    }
    // Cache null result to prevent retrying immediately
    metaDescriptionCache.set(url, {
      description: null,
      timestamp: Date.now()
    });
  }
  return null;
};

interface YouTubeCardProps {
  file: UploadedFile;
  onDelete: (fileId: string) => void;
  onSelect: (file: UploadedFile) => void;
  isDeletingFile: string | null;
  customAction?: React.ReactNode;
}

// YouTube icon component
const YouTubeIcon = ({ className = "text-red-600" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="currentColor"
    stroke="none"
    style={{ minWidth: '12px', minHeight: '12px', maxWidth: '12px', maxHeight: '12px' }}
  >
    <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
  </svg>
);

// Helper function to extract video title from URL
const getYouTubeVideoId = (url: string): string | null => {
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.hostname.includes('youtube.com')) {
      return new URLSearchParams(parsedUrl.search).get('v');
    } else if (parsedUrl.hostname.includes('youtu.be')) {
      return parsedUrl.pathname.slice(1);
    }
    return null;
  } catch {
    return null;
  }
};

// Helper function to detect YouTube URL type
const getYouTubeUrlType = (url: string): 'video' | 'channel' | 'playlist' | 'unknown' => {
  try {
    const parsedUrl = new URL(url);
    const pathname = parsedUrl.pathname;
    
    if (pathname.includes('/watch') || parsedUrl.hostname.includes('youtu.be')) {
      return 'video';
    } else if (pathname.includes('/channel/') || pathname.includes('/c/') || pathname.includes('/user/') || pathname.includes('/@')) {
      return 'channel';
    } else if (pathname.includes('/playlist')) {
      return 'playlist';
    }
    
    // Check if it's a channel by username (e.g., youtube.com/username)
    const pathParts = pathname.split('/').filter(p => p);
    if (pathParts.length === 1 && !pathParts[0].includes('.')) {
      return 'channel';
    }
    
    return 'unknown';
  } catch {
    return 'unknown';
  }
};

const YouTubeCard = memo(({ file, onDelete, onSelect, isDeletingFile, customAction }: YouTubeCardProps) => {
  const [metaDescription, setMetaDescription] = useState<string | null>(null);
  const [isLoadingMeta, setIsLoadingMeta] = useState(false);
  
  const videoId = file.url ? getYouTubeVideoId(file.url) : null;

  // Fetch meta description when component mounts - optimized with cache check
  useEffect(() => {
    if (!file.url || file.doc_summary) return;

    // Check cache immediately
    const cached = metaDescriptionCache.get(file.url);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setMetaDescription(cached.description);
      return;
    }

    // Only fetch if not already loading and no cached result
    if (!isLoadingMeta && metaDescription === null) {
      setIsLoadingMeta(true);
      fetchMetaDescription(file.url).then((description) => {
        setMetaDescription(description);
        setIsLoadingMeta(false);
      });
    }
  }, [file.url, file.doc_summary]);
  
  return (
    <div 
      className="flex w-full max-w-full p-4 items-start gap-3 relative group cursor-pointer hover:bg-gray-50"
      style={{
        borderRadius: '16px',
        border: '1px solid var(--superlight)',
        background: 'var(--ultralight)'
      }}
      onClick={() => onSelect(file)}
    >
      <div className="flex flex-col flex-grow min-w-0 overflow-hidden">
        <div className="flex items-start w-full">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="h-7 w-7 rounded-full flex items-center justify-center bg-muted flex-shrink-0">
              <YouTubeIcon className="text-red-500 h-4 w-4" />
            </div>
            <span className="truncate text-sm font-medium text-foreground">
              {file.doc_title || "YouTube Video"}
            </span>
          </div>
        </div>
        
        {/* Meta description */}
        <div className="text-xs text-slate-500 mt-1 line-clamp-2">
          {isLoadingMeta ? (
            <span className="flex items-center gap-1">
              <LoadingSpinner className="h-3 w-3" />
              Loading description...
            </span>
          ) : (
            // Prioritize actual content over empty strings
            (() => {
              const docSummary = file.doc_summary && file.doc_summary.trim();
              const metaDesc = metaDescription && metaDescription.trim();
              
              // Show the full URL as fallback instead of generic text
              const fallback = file.url || "No URL available";
              
              return docSummary || metaDesc || fallback;
            })()
          )}
        </div>
      </div>
      
      {/* Right side actions */}
      <div className="flex flex-col items-end gap-2">
        {/* Show spinner for processing status */}
        {file.status === 'pending' || file.status === 'processing' ? (
          <RefreshCw className="h-4 w-4 text-amber-500 animate-spin" />
        ) : isDeletingFile === file.id ? (
          <div className="h-6 w-6 flex items-center justify-center">
            <LoadingSpinner className="h-4 w-4" color="#70D6FF" />
          </div>
        ) : customAction ? (
          customAction
        ) : (
          <Button
            onClick={(e) => {
              e.stopPropagation();
              removeFileMetadataFromLocalStorage(file.id);
              onDelete(file.id);
            }}
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-transparent"
            aria-label="Delete file"
            disabled={isDeletingFile === file.id}
          >
            <DeleteIcon className="h-4 w-4 text-muted-foreground group-hover:text-[#232323]" />
          </Button>
        )}
      </div>
    </div>
  );
});

YouTubeCard.displayName = 'YouTubeCard';

export { YouTubeCard }; 
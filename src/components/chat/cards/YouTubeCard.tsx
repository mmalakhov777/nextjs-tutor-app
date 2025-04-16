import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DeleteIcon } from '@/components/icons';
import type { UploadedFile } from '@/types/chat';

interface YouTubeCardProps {
  file: UploadedFile;
  onDelete: (fileId: string) => void;
  onSelect: (file: UploadedFile) => void;
  isDeletingFile: string | null;
}

// YouTube icon component
const YouTubeIcon = ({ className = "h-3 w-3 text-red-600" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="currentColor"
    stroke="none"
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

export const YouTubeCard = ({ file, onDelete, onSelect, isDeletingFile }: YouTubeCardProps) => {
  const videoId = file.url ? getYouTubeVideoId(file.url) : null;
  
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
          <span className="truncate text-sm font-medium text-foreground">
            {file.doc_title || "YouTube Video"}
          </span>
        </div>
        
        {/* URL as secondary info */}
        <div className="text-xs text-slate-500 truncate mt-0.5 mb-0.5">
          {file.url || "YouTube Video"}
        </div>
        
        {/* Creator info if available */}
        <div className="flex items-center gap-2 flex-wrap mt-0.5 mb-1">
          {file.doc_authors && file.doc_authors.length > 0 && (
            <span className="text-xs text-slate-700">
              {Array.isArray(file.doc_authors) 
                ? file.doc_authors.join(', ')
                : file.doc_authors}
            </span>
          )}
        </div>
        
        {/* File type and status on the same line */}
        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
          {/* YouTube icon */}
          <span className="flex items-center gap-1">
            <YouTubeIcon />
            YouTube
          </span>
          
          {/* Duration if available */}
          {file.doc_publication_year && (
            <>
              <span className="text-slate-400">•</span>
              <span>{file.doc_publication_year}</span>
            </>
          )}
          
          {/* Status indicator */}
          {file.status && file.status !== 'completed' && (
            <>
              <span className="text-slate-400">•</span>
              <span className={`${file.status === 'error' ? 'text-red-600' : 'text-amber-600'}`}>
                {file.status === 'error' ? 'Error' : 'Processing'}
              </span>
            </>
          )}
          
          {/* Add "Ready" indicator for completed files */}
          {file.status === 'completed' && !file.doc_publication_year && (
            <>
              <span className="text-slate-400">•</span>
              <span className="text-green-600">Ready</span>
            </>
          )}
          
          {/* Watch on YouTube link */}
          {file.url && (
            <a 
              href={file.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="ml-auto text-red-600 hover:underline flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              <span>Watch on YouTube</span>
            </a>
          )}
        </div>
      </div>
      
      {/* Right side actions */}
      <div className="flex flex-col items-end gap-2">
        {/* Show spinner for processing status */}
        {file.status === 'pending' || file.status === 'processing' ? (
          <RefreshCw className="h-4 w-4 text-amber-500 animate-spin" />
        ) : (
          /* Delete button */
          <Button
            onClick={(e) => {
              e.stopPropagation(); // Prevent opening the modal
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
}; 
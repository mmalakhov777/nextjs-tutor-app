import { RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DeleteIcon } from '@/components/icons';
import type { FileUploadStatus } from './UploadingFileCard';
import { LoadingSpinner } from '@/components/icons/LoadingSpinner';

interface UploadingYouTubeCardProps {
  upload: FileUploadStatus;
  onRemove: (uploadId: string) => void;
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

// Helper function to check if a URL is a YouTube URL
const isYouTubeUrl = (url?: string): boolean => {
  if (!url) return false;
  try {
    const parsedUrl = new URL(url);
    return (
      parsedUrl.hostname.includes('youtube.com') ||
      parsedUrl.hostname.includes('youtu.be')
    );
  } catch {
    return false;
  }
};

export const UploadingYouTubeCard = ({ upload, onRemove }: UploadingYouTubeCardProps) => {
  return (
    <div 
      className="flex w-full max-w-full p-4 items-start gap-3 relative group"
      style={{
        borderRadius: '16px',
        border: '1px solid var(--superlight)',
        background: 'var(--ultralight)'
      }}
    >
      <div className="flex flex-col flex-grow min-w-0 overflow-hidden">
        <div className="flex items-start w-full">
          <span className="truncate text-sm font-medium text-foreground">
            {upload.name || "YouTube Video"}
          </span>
        </div>
        
        {/* URL as secondary info */}
        {upload.url && (
          <div className="text-xs text-slate-500 truncate mt-0.5 mb-2">
            {upload.url}
          </div>
        )}
        
        {/* Status */}
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          {/* Type */}
          <span className="flex items-center gap-1">
            <YouTubeIcon />
            YouTube
          </span>
          
          <span className="text-slate-400">•</span>
          
          {/* Upload status */}
          <span className={`
            ${upload.status === 'error' ? 'text-red-600' : 
              upload.status === 'completed' ? 'text-green-600' : 'text-blue-500'}
          `}>
            {upload.status === 'uploading' && 'Uploading...'}
            {upload.status === 'processing' && 'Processing...'}
            {upload.status === 'error' && 'Error'}
          </span>

          {/* Show error message if available */}
          {upload.status === 'error' && upload.errorMessage && (
            <span className="ml-1 text-xs text-red-600 truncate">
              {upload.errorMessage}
            </span>
          )}
        </div>
      </div>
      
      {/* Right side actions */}
      <div className="flex flex-col items-end gap-2">
        {/* Status icon or delete button for errors */}
        {(upload.status === 'uploading' || upload.status === 'processing') && (
          <div className="h-6 w-6 flex items-center justify-center">
            <LoadingSpinner className="h-4 w-4" color="#70D6FF" />
          </div>
        )}
        {upload.status === 'error' && 
          <div className="flex items-center gap-1">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <Button
              onClick={() => onRemove(upload.id)}
              variant="ghost"
              size="icon"
              className="h-6 w-6 hover:bg-transparent"
              aria-label="Remove upload"
            >
              <DeleteIcon className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        }
      </div>
    </div>
  );
}; 
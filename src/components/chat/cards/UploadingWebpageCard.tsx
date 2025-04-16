import { RefreshCw, AlertTriangle, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DeleteIcon } from '@/components/icons';
import type { FileUploadStatus } from './UploadingFileCard';

interface UploadingWebpageCardProps {
  upload: FileUploadStatus;
  onRemove: (uploadId: string) => void;
}

export const UploadingWebpageCard = ({ upload, onRemove }: UploadingWebpageCardProps) => {
  // Extract domain from URL
  const getDomain = (url?: string): string => {
    if (!url) return "Website";
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return "Website";
    }
  };

  const domain = getDomain(upload.url);
  
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
            {upload.name || domain}
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
            <Globe className="h-3 w-3 text-blue-500" />
            Website
          </span>
          
          <span className="text-slate-400">•</span>
          
          {/* Upload status */}
          <span className={`
            ${upload.status === 'error' ? 'text-red-600' : 
              upload.status === 'completed' ? 'text-green-600' : 'text-amber-600'}
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
          <RefreshCw className="h-4 w-4 text-amber-500 animate-spin" />
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
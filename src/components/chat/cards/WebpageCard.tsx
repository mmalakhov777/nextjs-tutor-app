import { Globe, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DeleteIcon } from '@/components/icons';
import type { UploadedFile } from '@/types/chat';
import { WebPageIcon } from '../WebPageIcon';
import { LoadingSpinner } from '@/components/icons/LoadingSpinner';
import { useState, useEffect, memo } from 'react';

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

interface WebpageCardProps {
  file: UploadedFile;
  onDelete: (fileId: string) => void;
  onSelect: (file: UploadedFile) => void;
  isDeletingFile: string | null;
  customAction?: React.ReactNode;
}

const WebpageCard = memo(({ file, onDelete, onSelect, isDeletingFile, customAction }: WebpageCardProps) => {
  // Function to extract domain from URL
  const extractDomain = (url: string): string => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace(/^www\./, '');
    } catch (e) {
      return "Website";
    }
  };
  
  // First try to get domain directly from metadata if available
  // Then fallback to extracting from URL
  // This is based on DB structure where domain is stored in metadata.domain
  const getDomain = (): string => {
    // Check if domain is directly available in metadata
    if (file.metadata && typeof file.metadata === 'object' && 'domain' in file.metadata) {
      const domain = file.metadata.domain as string;
      return domain.replace(/^www\./, '');
    }
    
    // Check if we have a URL to extract domain from
    if (file.url) {
      return extractDomain(file.url);
    }
    
    // Check if URL is in metadata.original_url
    if (file.metadata && typeof file.metadata === 'object' && 'original_url' in file.metadata) {
      const url = file.metadata.original_url as string;
      return extractDomain(url);
    }
    
    // Fallback
    return "Website";
  };
  
  // Get domain using all possible sources
  const domain = getDomain();
  
  // Get URL from all possible sources
  const getUrl = (): string => {
    if (file.url) return file.url;
    
    if (file.metadata && typeof file.metadata === 'object' && 'original_url' in file.metadata) {
      return file.metadata.original_url as string;
    }
    
    return "";
  };
  
  const url = getUrl();
  
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
            <WebPageIcon file={file} />
          <span className="truncate text-sm font-medium text-foreground">
            {file.doc_title || file.name}
          </span>
        </div>
        </div>
        
        {/* Show URL or fallback text */}
        <div className="text-xs text-slate-500 mt-1 line-clamp-2">
          {file.doc_summary || url || "Web page content available for analysis"}
        </div>
      </div>
      
      {/* Right side actions */}
      <div className="flex flex-col items-end gap-2">
        {/* Show spinner for processing status */}
        {file.status === 'pending' || file.status === 'processing' ? (
          <RefreshCw className="h-4 w-4 text-amber-500 animate-spin" />
        ) : isDeletingFile === file.id ? (
          /* Show loading spinner while deleting - match delete button size */
          <div className="h-6 w-6 flex items-center justify-center">
            <LoadingSpinner className="h-4 w-4" color="#70D6FF" />
          </div>
        ) : customAction ? (
          customAction
        ) : (
          /* Delete button */
          <Button
            onClick={(e) => {
              e.stopPropagation(); // Prevent opening the modal
              removeFileMetadataFromLocalStorage(file.id); // Clean up localStorage first
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

WebpageCard.displayName = 'WebpageCard';

export { WebpageCard }; 
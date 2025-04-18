import { Globe, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DeleteIcon } from '@/components/icons';
import type { UploadedFile } from '@/types/chat';
import { WebPageIcon } from '../WebPageIcon';
import { LoadingSpinner } from '@/components/icons/LoadingSpinner';

interface WebpageCardProps {
  file: UploadedFile;
  onDelete: (fileId: string) => void;
  onSelect: (file: UploadedFile) => void;
  isDeletingFile: string | null;
}

export const WebpageCard = ({ file, onDelete, onSelect, isDeletingFile }: WebpageCardProps) => {
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
          <span className="truncate text-sm font-medium text-foreground">
            {file.doc_title || file.name}
          </span>
        </div>
        
        {/* URL as secondary info */}
        <div className="text-xs text-slate-500 truncate mt-0.5 mb-0.5">
          {url || domain}
        </div>
        
        {/* File metadata - authors */}
        <div className="flex items-center gap-2 flex-wrap mt-0.5 mb-1">
          {file.doc_authors && file.doc_authors.length > 0 && (
            <span className="text-xs text-slate-700 flex items-center">
              {Array.isArray(file.doc_authors) 
                ? file.doc_authors.slice(0, 1).map((author: string) => author).join(', ')
                : file.doc_authors}
              {Array.isArray(file.doc_authors) && file.doc_authors.length > 1 && (
                <span className="ml-1 inline-flex items-center justify-center text-slate-800 text-[10px]"
                  style={{
                    borderRadius: '1000px',
                    background: 'var(--Monochrome-Light, #E8E8E5)',
                    display: 'flex',
                    width: '18px',
                    height: '18px',
                    padding: '2px 4px 2px 2px',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                  +{file.doc_authors.length - 1}
                </span>
              )}
            </span>
          )}
        </div>
        
        {/* File type and status on the same line */}
        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
          {/* Web icon and webpage label */}
          <span className="flex items-center gap-1">
            <WebPageIcon file={file} />
            <span>Webpage</span>
          </span>
          
          {/* Year if available */}
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
import { Globe, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DeleteIcon } from '@/components/icons';
import type { UploadedFile } from '@/types/chat';
import { WebPageIcon } from '../WebPageIcon';

interface WebpageCardProps {
  file: UploadedFile;
  onDelete: (fileId: string) => void;
  onSelect: (file: UploadedFile) => void;
  isDeletingFile: string | null;
}

export const WebpageCard = ({ file, onDelete, onSelect, isDeletingFile }: WebpageCardProps) => {
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
          {file.url || "Webpage"}
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
          {/* Web icon */}
          <span className="flex items-center gap-1">
            <WebPageIcon file={file} />
            Website
          </span>
          
          {/* Dot divider */}
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
          
          {/* External link button */}
          {file.url && (
            <a 
              href={file.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="ml-auto text-blue-500 hover:underline flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              <span>View source</span>
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
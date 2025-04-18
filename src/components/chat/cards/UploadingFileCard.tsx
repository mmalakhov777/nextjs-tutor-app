import { RefreshCw, AlertTriangle, FileText, FileIcon, Image, FileJson, FileCode, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DeleteIcon } from '@/components/icons';
import type { UploadedFile } from '@/types/chat';
import { LoadingSpinner } from '@/components/icons/LoadingSpinner';

// Define an interface for tracking file uploads
export interface FileUploadStatus {
  id: string;
  name: string;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  url?: string;
  file?: File;
  fileName: string;
  errorMessage: string;
  metadata?: Record<string, any>;
}

interface UploadingFileCardProps {
  upload: FileUploadStatus;
  onRemove: (uploadId: string) => void;
}

// Helper to get the appropriate icon for a file extension
const getFileIcon = (fileName: string) => {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  
  switch (extension) {
    case 'pdf':
      return <FileText className="h-3 w-3 text-red-500" />;
    case 'doc':
    case 'docx':
    case 'txt':
      return <FileText className="h-3 w-3 text-blue-500" />;
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'webp':
      return <Image className="h-3 w-3 text-purple-500" />;
    case 'json':
    case 'jsonl':
      return <FileJson className="h-3 w-3 text-yellow-600" />;
    case 'csv':
      return <Database className="h-3 w-3 text-green-600" />;
    case 'js':
    case 'ts':
    case 'py':
    case 'java':
    case 'c':
    case 'cpp':
    case 'html':
    case 'css':
    case 'xml':
      return <FileCode className="h-3 w-3 text-emerald-600" />;
    default:
      return <FileIcon className="h-3 w-3 text-gray-500" />;
  }
};

export const UploadingFileCard = ({ upload, onRemove }: UploadingFileCardProps) => {
  const fileExtension = upload.file ? upload.name.split('.').pop()?.toLowerCase() || '' : '';
  
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
          <span className="truncate text-sm font-medium text-foreground">{upload.name}</span>
        </div>
        
        {/* File type and status */}
        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
          {/* File format */}
          <span className="flex items-center gap-1">
            {getFileIcon(upload.name)}
            {fileExtension.toUpperCase().substring(0, 4) || 'FILE'}
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
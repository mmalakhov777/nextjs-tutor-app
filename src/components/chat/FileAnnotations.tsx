import React, { useState, useRef, useEffect, useCallback } from 'react';
import { File, FileText, Book, Loader2, ExternalLink, UserCircle, Calendar, Tag, Info } from 'lucide-react';
import { UploadedFile } from '@/types/chat';
import FileCitationBadges, { Citation as BaseCitation } from './FileCitationBadges';

// Extend the base Citation interface to include start and end properties
interface Citation extends BaseCitation {
  start?: number;
  end?: number;
}

interface FileAnnotationsProps {
  citations: Citation[];
  fileMetadata: Record<string, any>;
  isLoadingMetadata: Record<string, boolean>;
  loadingFileId: string | null;
  onFileClick: (fileId: string, filename: string, start?: number, end?: number) => void;
  fetchFileMetadata?: (fileId: string) => void;
}

// Helper function to get the backend URL
const getBackendUrl = () => {
  return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5002';
};

// Create a Set to track files with 404 errors
const notFoundFiles = new Set<string>();

// Helper function to determine file type icon
const getFileIcon = (filename: string, metadata?: any) => {
  // Check document type from metadata first
  if (metadata?.doc_type) {
    if (metadata.doc_type.toLowerCase().includes('article')) {
      return <FileText className="h-3 w-3" />;
    }
    if (metadata.doc_type.toLowerCase().includes('book')) {
      return <Book className="h-3 w-3" />;
    }
  }
  
  // Fall back to extension-based icons
  const extension = filename.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'pdf':
      return <FileText className="h-3 w-3" />;
    case 'docx':
    case 'doc':
      return <FileText className="h-3 w-3" />;
    case 'txt':
      return <File className="h-3 w-3" />;
    default:
      return <File className="h-3 w-3" />;
  }
};

// Helper to get background color based on file type
const getFileBadgeColor = (filename: string, metadata?: any) => {
  // Check document type from metadata first
  if (metadata?.doc_type) {
    if (metadata.doc_type.toLowerCase().includes('article')) {
      return "bg-blue-500";
    }
    if (metadata.doc_type.toLowerCase().includes('book')) {
      return "bg-purple-500";
    }
  }
  
  // Fall back to extension-based colors
  const extension = filename.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'pdf':
      return "bg-red-500";
    case 'docx':
    case 'doc':
      return "bg-blue-600";
    case 'txt':
      return "bg-gray-500";
    default:
      return "bg-slate-500";
  }
};

const FileAnnotations = React.memo<FileAnnotationsProps>(({ 
  citations,
  fileMetadata,
  isLoadingMetadata,
  loadingFileId,
  onFileClick,
  fetchFileMetadata
}) => {
  // Local state for lightweight file type info
  const [fileTypeInfo, setFileTypeInfo] = useState<Record<string, {name?: string, type?: string}>>({});
  const [loadingFileTypes, setLoadingFileTypes] = useState<Record<string, boolean>>({});
  
  // Function to fetch ONLY file type information (lightweight)
  const fetchFileTypeInfo = useCallback(async (fileId: string) => {
    // Skip if we already have this info or it's loading or previously returned 404
    if (fileTypeInfo[fileId] || loadingFileTypes[fileId] || notFoundFiles.has(fileId)) return;
    
    // Mark as loading
    setLoadingFileTypes(prev => ({ ...prev, [fileId]: true }));
    
    try {
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/files/${fileId}/info`);
      
      if (!response.ok) {
        // Check for 404 specifically
        if (response.status === 404) {
          // Add to notFoundFiles to prevent future retries
          notFoundFiles.add(fileId);
          
          // Create a minimal entry with just the filename to prevent future requests
          setFileTypeInfo(prev => ({ 
            ...prev, 
            [fileId]: {
              name: fileId.replace('file-', ''),
              type: 'unknown'
            }
          }));
          return;
        }
        
        // Try basic file info endpoint as fallback
        const basicResponse = await fetch(`${backendUrl}/api/files/${fileId}`);
        if (basicResponse.ok) {
          const data = await basicResponse.json();
          setFileTypeInfo(prev => ({ 
            ...prev, 
            [fileId]: {
              name: data.name,
              type: data.type || data.mime_type || data.doc_type
            }
          }));
        } else {
          // Check if this is also a 404
          if (basicResponse.status === 404) {
            notFoundFiles.add(fileId);
            
            // Create a minimal entry with just the filename
            setFileTypeInfo(prev => ({ 
              ...prev, 
              [fileId]: {
                name: fileId.replace('file-', ''),
                type: 'unknown'
              }
            }));
          }
          throw new Error(`Failed to fetch file type info: ${response.status}`);
        }
      } else {
        const data = await response.json();
        setFileTypeInfo(prev => ({ 
          ...prev, 
          [fileId]: {
            name: data.name,
            type: data.type || data.mime_type || data.doc_type
          }
        }));
      }
    } catch (error) {
      console.error("Error fetching file type info:", error);
    } finally {
      setLoadingFileTypes(prev => ({ ...prev, [fileId]: false }));
    }
  }, [fileTypeInfo, loadingFileTypes]);
  
  // Fetch file type info for all citations on mount
  useEffect(() => {
    citations.forEach(citation => {
      if (!fileMetadata[citation.file_id] && !fileTypeInfo[citation.file_id] && !notFoundFiles.has(citation.file_id)) {
        fetchFileTypeInfo(citation.file_id);
      }
    });
  }, [citations, fileMetadata, fileTypeInfo, fetchFileTypeInfo]);
  
  // Handle annotation click - directly open FileDetailModal
  const handleAnnotationClick = (fileId: string, filename: string, start?: number, end?: number) => {
    // Call onFileClick immediately to open FileDetailModal
    onFileClick(fileId, filename, start, end);
  };
  
  if (citations.length === 0) {
    return null;
  }
  
  return (
    <div className="relative space-y-2">
      <div className="flex items-center gap-1 text-xs text-gray-500">
        <Info className="h-3 w-3" />
        <span>Annotations</span>
      </div>
      
      <div className="space-y-2">
        {citations.map((citation, index) => {
          // Use fileMetadata first, fall back to lightweight fileTypeInfo, or use citation.filename
          const metadata = fileMetadata[citation.file_id] || fileTypeInfo[citation.file_id];
          const isLoading = isLoadingMetadata[citation.file_id] || loadingFileId === citation.file_id;
          const filename = metadata?.file_name || metadata?.name || citation.filename;
          
          return (
            <div 
              key={`${citation.file_id}-${citation.start}-${citation.end}-${index}`} 
              className="flex items-center gap-2"
            >
              {/* File Circle */}
              <div
                className={`flex items-center justify-center min-w-6 w-6 h-6 rounded-full ${getFileBadgeColor(filename, metadata)} text-white cursor-pointer transition-all border-2 border-white hover:ring-1 hover:ring-blue-100 ${isLoading ? 'opacity-70' : ''}`}
                onClick={() => !isLoading && handleAnnotationClick(
                  citation.file_id, 
                  filename,
                  citation.start,
                  citation.end
                )}
                aria-disabled={isLoading}
              >
                {getFileIcon(filename, metadata)}
                
                {/* Loading indicator */}
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 rounded-full">
                    <Loader2 className="h-3 w-3 animate-spin text-white" />
                  </div>
                )}
              </div>
              
              {/* Citation label */}
              <div 
                className="flex-1 text-sm cursor-pointer hover:underline"
                onClick={() => !isLoading && handleAnnotationClick(
                  citation.file_id, 
                  filename,
                  citation.start,
                  citation.end
                )}
              >
                {filename}
                {citation.start !== undefined && citation.end !== undefined && (
                  <span className="text-gray-500 ml-1">
                    (pages {citation.start}-{citation.end})
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

FileAnnotations.displayName = 'FileAnnotations';

export default FileAnnotations; 
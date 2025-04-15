import React, { useState, useRef, useEffect, useCallback } from 'react';
import { File, FileText, Book, Loader2, ExternalLink, UserCircle, Calendar, Tag, Plus } from 'lucide-react';

export interface Citation {
  file_id: string;
  index: number;
  type: string;
  filename: string;
}

interface FileCitationBadgesProps {
  citations: Citation[];
  fileMetadata: Record<string, any>;
  isLoadingMetadata: Record<string, boolean>;
  loadingFileId: string | null;
  onFileClick: (fileId: string, filename: string) => void;
  fetchFileMetadata?: (fileId: string) => void;
}

// Helper function to get the backend URL
const getBackendUrl = () => {
  return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5002';
};

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

// Create a Set to track in-flight requests
const pendingRequests = new Set<string>();

// Create a Set to track files with 404 errors
const notFoundFiles = new Set<string>();

const FileCitationBadges: React.FC<FileCitationBadgesProps> = ({ 
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
  
  // Create a Map to store unique citations by file_id
  const uniqueCitations = React.useMemo(() => {
    const map = new Map();
    citations.forEach(citation => {
      if (!map.has(citation.file_id)) {
        map.set(citation.file_id, citation);
      }
    });
    return map;
  }, [citations]);
  
  // State to track if we're showing all files or just the first 3
  const [showAllFiles, setShowAllFiles] = useState(false);
  
  // Function to fetch ONLY file type information (lightweight)
  const fetchFileTypeInfo = useCallback(async (fileId: string) => {
    // Skip if we already have this info, it's loading, has a pending request, or previously returned 404
    if (fileTypeInfo[fileId] || loadingFileTypes[fileId] || pendingRequests.has(fileId) || notFoundFiles.has(fileId)) return;
    
    // Mark as loading and add to pending requests
    setLoadingFileTypes(prev => ({ ...prev, [fileId]: true }));
    pendingRequests.add(fileId);
    
    try {
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/files/${fileId}/info`);
      
      if (!response.ok) {
        // Check for 404 error specifically
        if (response.status === 404) {
          // Add to notFoundFiles set to prevent future retries
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
            
            // Create a minimal entry with just the filename to prevent future requests
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
      pendingRequests.delete(fileId); // Remove from pending requests
    }
  }, [fileTypeInfo, loadingFileTypes]);
  
  // Fetch file type info for all citations on mount
  useEffect(() => {
    const filesToFetch = Array.from(uniqueCitations.values())
      .filter((citation: Citation) => 
        !fileMetadata[citation.file_id] && 
        !fileTypeInfo[citation.file_id] && 
        !pendingRequests.has(citation.file_id) &&
        !notFoundFiles.has(citation.file_id) // Add check for notFoundFiles
      );
    
    filesToFetch.forEach((citation: Citation) => {
      fetchFileTypeInfo(citation.file_id);
    });
  }, [uniqueCitations, fileMetadata, fileTypeInfo, fetchFileTypeInfo]);
  
  // Handle badge click - directly open FileDetailModal
  const handleBadgeClick = (fileId: string, filename: string) => {
    // Call onFileClick immediately to open FileDetailModal
    onFileClick(fileId, filename);
  };
  
  // Convert map to array for easier manipulation
  const citationsArray = Array.from(uniqueCitations.values());
  
  // Determine if we need a "+N" badge
  const hasMoreBadges = citationsArray.length > 3;
  
  // Determine which citations to display
  const displayCitations = showAllFiles ? citationsArray : citationsArray.slice(0, 3);
  
  // Calculate how many additional badges are hidden
  const additionalBadgesCount = citationsArray.length - 3;
  
  return (
    <div className="relative">
      {/* Files container with negative margins for overlap */}
      <div className="flex items-center">
        {displayCitations.map((citation, index) => {
          // Use fileMetadata first, fall back to lightweight fileTypeInfo, or use citation.filename
          const metadata = fileMetadata[citation.file_id] || fileTypeInfo[citation.file_id];
          const isLoading = isLoadingMetadata[citation.file_id] || loadingFileId === citation.file_id;
          const filename = metadata?.file_name || metadata?.name || citation.filename;
          
          return (
            <div 
              key={`${citation.file_id}-${index}`} 
              className="relative"
              style={{ 
                marginLeft: index > 0 ? '-0.5rem' : '0', // 20% overlap
                zIndex: 10 - index // Higher z-index for earlier items
              }}
            >
              {/* File Badge Circle */}
              <div
                className={`flex items-center justify-center w-6 h-6 rounded-full ${getFileBadgeColor(filename, metadata)} text-white cursor-pointer transition-all border-2 border-white hover:ring-1 hover:ring-blue-100 ${isLoading ? 'opacity-70' : ''}`}
                onClick={() => !isLoading && handleBadgeClick(citation.file_id, filename)}
                title={filename}
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
            </div>
          );
        })}
        
        {/* +N badge if there are more than 3 files and not showing all */}
        {hasMoreBadges && !showAllFiles && (
          <div 
            className="relative"
            style={{ marginLeft: '-0.5rem', zIndex: 5 }}
          >
            <div
              className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-600 text-white cursor-pointer border-2 border-white hover:bg-gray-700"
              onClick={() => setShowAllFiles(true)}
              title={`Show ${additionalBadgesCount} more file${additionalBadgesCount > 1 ? 's' : ''}`}
            >
              <span className="text-xs font-medium">+{additionalBadgesCount}</span>
            </div>
          </div>
        )}
        
        {/* Collapse button when showing all files and there are more than 3 */}
        {hasMoreBadges && showAllFiles && (
          <div 
            className="ml-1 flex items-center justify-center cursor-pointer text-gray-500 hover:text-gray-700"
            onClick={() => setShowAllFiles(false)}
            title="Show fewer files"
          >
            <span className="text-xs">Collapse</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(FileCitationBadges, (prevProps, nextProps) => {
  // If citations array length changed, need to rerender
  if (prevProps.citations.length !== nextProps.citations.length) {
    return false; // don't skip the rerender
  }
  
  // If loading ID changed, need to rerender
  if (prevProps.loadingFileId !== nextProps.loadingFileId) {
    return false;
  }
  
  // Check if metadata or loading state changed for any citation
  for (const citation of prevProps.citations) {
    const fileId = citation.file_id;
    
    // If metadata changed for this citation, need to rerender
    if (
      prevProps.fileMetadata[fileId] !== nextProps.fileMetadata[fileId] ||
      prevProps.isLoadingMetadata[fileId] !== nextProps.isLoadingMetadata[fileId]
    ) {
      return false;
    }
  }
  
  // Otherwise, skip the rerender
  return true;
}); 
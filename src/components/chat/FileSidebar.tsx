"use client";

import { useRef, useState, useEffect } from 'react';
import { 
  Upload, FileText, Info, Copy, 
  Maximize2, CheckCircle2, Clock, AlertTriangle,
  RefreshCw, ChevronDown, ChevronRight, BookOpen,
  Link, ExternalLink, FileIcon, Image, Code, Database, 
  FileJson, FileType, FileCode, Globe, ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DeleteIcon } from '@/components/icons';
import type { FileSidebarProps, UploadedFile } from '@/types/chat';
import { WebPageIcon } from './WebPageIcon';
import { FileDetailModal } from './FileDetailModal';
import { useFileContext } from '@/contexts/FileContext';

// Add a helper function to get the backend URL at the top of the file
const getBackendUrl = () => {
  return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5002';
};

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

// Define an interface for tracking file uploads
interface FileUploadStatus {
  id: string;
  name: string;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  url?: string; // Add URL for tracking link uploads
  file?: File; // Add file object for rendering purposes
  fileName: string; // Add original filename for deduplication
  errorMessage: string; // Add field for error message
}

// Helper function to check if a URL is a YouTube URL
const isYouTubeUrl = (url: string): boolean => {
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

// Helper to get the appropriate icon for a file extension
const getFileIcon = (fileName: string, file: UploadedFile) => {
  // Check if it's a YouTube video
  if (file.source === 'link' && 
      file.url && 
      isYouTubeUrl(file.url) || 
      file.doc_type?.toLowerCase() === 'youtube_video') {
    return <YouTubeIcon />;
  }
  
  // If it's a link or has webpage type, use the webpage icon
  if (file.source === 'link' || 
      file.doc_type?.toLowerCase() === 'webpage' || 
      file.doc_type?.toLowerCase() === 'webpage') {
    return <WebPageIcon file={file} />;
  }
  
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

// Helper function to save file metadata to local storage
const saveFileMetadataToLocalStorage = (file: UploadedFile) => {
  try {
    // Get existing metadata from local storage
    const storedMetadata = localStorage.getItem('uploadedFilesMetadata');
    const metadataObj = storedMetadata ? JSON.parse(storedMetadata) : {};
    
    // Save or update metadata for this file
    metadataObj[file.id] = {
      id: file.id,
      name: file.name,
      doc_title: file.doc_title,
      doc_authors: file.doc_authors,
      doc_publication_year: file.doc_publication_year,
      doc_type: file.doc_type,
      doc_summary: file.doc_summary,
      total_pages: file.total_pages,
      url: file.url,
      source: file.source,
      processed_at: file.processed_at,
      status: file.status,
      // Also save file content if it exists
      file_content: file.file_content
    };
    
    // Save back to local storage
    localStorage.setItem('uploadedFilesMetadata', JSON.stringify(metadataObj));
  } catch (error) {
    console.error('Error saving file metadata to local storage:', error);
  }
};

// Helper function to get file metadata from local storage
const getFileMetadataFromLocalStorage = (fileId: string): Partial<UploadedFile> | null => {
  try {
    const storedMetadata = localStorage.getItem('uploadedFilesMetadata');
    if (!storedMetadata) return null;
    
    const metadataObj = JSON.parse(storedMetadata);
    return metadataObj[fileId] || null;
  } catch (error) {
    console.error('Error getting file metadata from local storage:', error);
    return null;
  }
};

// Add this function after getFileMetadataFromLocalStorage
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

// New function to load and save file content after upload
const loadAndSaveFileContent = async (fileId: string) => {
  try {
    // Check if the file content already exists in localStorage
    const storedMetadata = localStorage.getItem('uploadedFilesMetadata');
    if (storedMetadata) {
      const metadataObj = JSON.parse(storedMetadata);
      if (metadataObj[fileId] && metadataObj[fileId].file_content) {
        // Content already exists
        return;
      }
    }
    
    // Fetch the file content from the backend
    const backendUrl = getBackendUrl();
    const response = await fetch(`${backendUrl}/api/files/${fileId}/content`);
    
    if (!response.ok) {
      console.warn(`Could not load content for file ${fileId}: ${response.status}`);
      return;
    }
    
    const data = await response.json();
    const content = data.content || '';
    
    // Update the file content in localStorage
    const updatedStoredMetadata = localStorage.getItem('uploadedFilesMetadata');
    if (updatedStoredMetadata) {
      const updatedMetadataObj = JSON.parse(updatedStoredMetadata);
      if (updatedMetadataObj[fileId]) {
        updatedMetadataObj[fileId].file_content = content;
        localStorage.setItem('uploadedFilesMetadata', JSON.stringify(updatedMetadataObj));
        console.log(`File content saved for ${fileId}`);
      }
    }
  } catch (error) {
    console.error('Error loading file content:', error);
  }
};

export function FileSidebar({
  uploadedFiles,
  isUploadingFile,
  showFileInfo,
  userId,
  currentConversationId,
  defaultVectorStoreId,
  onFileUpload,
  onLinkSubmit,
  onToggleFileInfo,
  onFileDeleted,
  onVectorStoreCreated,
  onRefreshFiles,
  isRefreshing = false,
  onSendMessage,
  onFileQuickAction
}: FileSidebarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropAreaRef = useRef<HTMLDivElement>(null);
  const [isDeletingFile, setIsDeletingFile] = useState<string | null>(null);
  const lastVectorStoreIdRef = useRef<string | null>(null);
  const [showSessionInfo, setShowSessionInfo] = useState(false);
  const [expandedFileId, setExpandedFileId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [isLinkMode, setIsLinkMode] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null);
  const [isUploadAreaExpanded, setIsUploadAreaExpanded] = useState(true);
  
  // Track multiple file uploads with their progress
  const [fileUploads, setFileUploads] = useState<FileUploadStatus[]>([]);

  // Get the setUploadedFiles function from the FileContext
  const { setUploadedFiles } = useFileContext();

  // Detect mobile screen size
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Initial check
    checkIfMobile();
    
    // Add resize listener
    window.addEventListener('resize', checkIfMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  // Track vector store ID changes and refresh files
  useEffect(() => {
    if (
      defaultVectorStoreId && 
      defaultVectorStoreId !== lastVectorStoreIdRef.current && 
      onRefreshFiles
    ) {
      onRefreshFiles();
    }
    
    lastVectorStoreIdRef.current = defaultVectorStoreId;
    
    // If there are uploaded files, save their metadata to local storage
    // And update the FileContext
    if (uploadedFiles.length > 0) {
      uploadedFiles.forEach(file => {
        saveFileMetadataToLocalStorage(file);
      });
      setUploadedFiles(uploadedFiles);
    }
  }, [defaultVectorStoreId, onRefreshFiles, uploadedFiles, setUploadedFiles]);

  // Set up drag and drop event handlers
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isDragging) setIsDragging(true);
    };

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Only set isDragging to false if we're leaving the drop area (not entering a child element)
      if (dropAreaRef.current && !dropAreaRef.current.contains(e.relatedTarget as Node)) {
        setIsDragging(false);
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      
      if (e.dataTransfer?.files?.length) {
        // Convert FileList to array and upload all files
        const files = Array.from(e.dataTransfer.files);
        handleMultipleFileUpload(files);
      }
    };

    // Add global handlers to allow dragging from anywhere on the page
    const handleDocumentDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDocumentDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    // Add global handlers to prevent browser default behavior
    document.addEventListener('dragover', handleDocumentDragOver);
    document.addEventListener('drop', handleDocumentDrop);

    // Apply handlers to specific drop area
    const dropArea = dropAreaRef.current;
    if (dropArea && !isLinkMode) {
      dropArea.addEventListener('dragover', handleDragOver);
      dropArea.addEventListener('dragenter', handleDragEnter);
      dropArea.addEventListener('dragleave', handleDragLeave);
      dropArea.addEventListener('drop', handleDrop);
    }

    return () => {
      // Clean up all event listeners
      document.removeEventListener('dragover', handleDocumentDragOver);
      document.removeEventListener('drop', handleDocumentDrop);
      
      if (dropArea) {
        dropArea.removeEventListener('dragover', handleDragOver);
        dropArea.removeEventListener('dragenter', handleDragEnter);
        dropArea.removeEventListener('dragleave', handleDragLeave);
        dropArea.removeEventListener('drop', handleDrop);
      }
    };
  }, [isDragging, isLinkMode]);

  // Set up console command to show session info
  useEffect(() => {
    (window as any).showSessionInfo = () => {
      setShowSessionInfo(true);
      return 'Session info is now visible';
    };
    
    (window as any).hideSessionInfo = () => {
      setShowSessionInfo(false);
      return 'Session info is now hidden';
    };
    
    return () => {
      delete (window as any).showSessionInfo;
      delete (window as any).hideSessionInfo;
    };
  }, []);

  const onCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setNotification('ID copied to clipboard');
    setTimeout(() => setNotification(null), 3000);
  };
  
  // The single handleFileButtonClick function
  const handleFileButtonClick = () => {
    if (!fileInputRef.current) {
      return;
    }
    
    try {
      fileInputRef.current.click();
    } catch (error) {
      // Keep error handling without logging
    }
  };

  // New function to check if a file format is supported
  const isFileFormatSupported = (fileName: string): boolean => {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    const supportedExtensions = [
      'pdf', 'txt', 'csv', 'json', 'jsonl',
      'py', 'js', 'ts', 'jsx', 'tsx', 'java', 'c', 'cpp', 'html', 'css', 'xml'
    ];
    return supportedExtensions.includes(extension);
  };

  // Update the handleMultipleFileUpload function to validate file formats
  const handleMultipleFileUpload = async (files: File[]) => {
    if (!files.length || !defaultVectorStoreId) {
      setNotification(defaultVectorStoreId ? 'No files selected' : 'No vector store available');
      setTimeout(() => setNotification(null), 3000);
      return;
    }
    
    // Filter files into supported and unsupported
    const supportedFiles: File[] = [];
    const unsupportedFiles: File[] = [];
    
    files.forEach(file => {
      if (isFileFormatSupported(file.name)) {
        supportedFiles.push(file);
      } else {
        unsupportedFiles.push(file);
      }
    });
    
    // Show error for unsupported files immediately
    if (unsupportedFiles.length > 0) {
      const fileNames = unsupportedFiles.map(f => f.name).join(', ');
      setNotification(`Error: Unsupported file format(s) - ${fileNames}`);
      setTimeout(() => setNotification(null), 3000);
      
      // Add unsupported files to the uploads list with error status
      const newErrorUploads = unsupportedFiles.map(file => ({
        id: Math.random().toString(36).substring(2, 11),
        name: file.name,
        fileName: file.name,
        status: 'error' as const,
        file: file,
        errorMessage: 'Unsupported file format. Only PDF, TXT, CSV, JSON, and code files are supported.'
      }));
      
      setFileUploads(prev => [...prev, ...newErrorUploads]);
      
      // If all files are unsupported, return early
      if (supportedFiles.length === 0) return;
    }
    
    // Continue with supported files only
    // Add each file to the uploads state with initial status
    const newUploads = supportedFiles.map(file => ({
      id: Math.random().toString(36).substring(2, 11), // Generate a temporary ID
      name: file.name,
      fileName: file.name, // Store original filename for deduplication
      status: 'uploading' as const, 
      file: file, // Store the file object for rendering purposes
      errorMessage: '' // Add field for error message
    }));
    
    setFileUploads(prev => [...prev, ...newUploads]);
    
    // Process files one by one to avoid issues if one fails
    for (let i = 0; i < supportedFiles.length; i++) {
      const file = supportedFiles[i];
      const uploadId = newUploads[i].id;
      
      try {
        // Upload the file - wrap in try-catch to handle fetch errors
        await onFileUpload(file);
        
        // Mark as processing
        setFileUploads(prev => 
          prev.map(upload => 
            upload.id === uploadId 
              ? { ...upload, status: 'processing' } 
              : upload
          )
        );
        
        // Check if the file was successfully added to uploadedFiles
        const uploadedFile = uploadedFiles.find(uploadedFile => 
          uploadedFile.name === file.name
        );
        
        if (uploadedFile) {
          // File was uploaded successfully, now fetch and save its content
          try {
            await loadAndSaveFileContent(uploadedFile.id);
          } catch (contentError) {
            console.warn(`Could not load content for ${uploadedFile.id}: ${contentError}`);
            // Continue anyway - this is not critical
          }
          
          // Remove from fileUploads
          setFileUploads(prev => prev.filter(upload => upload.id !== uploadId));
        } else {
          // Mark as completed if not found in error checks
          setFileUploads(prev => 
            prev.map(upload => 
              upload.id === uploadId 
                ? { ...upload, status: 'completed' } 
                : upload
            )
          );
        }
      } catch (error) {
        console.warn(`Error uploading file ${file.name}:`, error);
        
        // Mark this file as error but continue with others
        setFileUploads(prev => 
          prev.map(upload => 
            upload.id === uploadId 
              ? { 
                  ...upload, 
                  status: 'error',
                  errorMessage: error instanceof Error 
                    ? error.message 
                    : error instanceof TypeError && error.message.includes('fetch')
                      ? 'Network error: Could not connect to server'
                      : 'Upload failed'
                } 
              : upload
          )
        );
        
        // Continue with next file, don't abort the entire process
        continue;
      }
    }
    
    // Final check for any files that might not have been properly handled
    setTimeout(() => {
      // Check for PDF files - they often cause silent 400 errors
      setFileUploads(prev => 
        prev.map(upload => {
          if (upload.status === 'completed' && 
              upload.fileName.toLowerCase().endsWith('.pdf')) {
            return { 
              ...upload, 
              status: 'error',
              errorMessage: 'Failed to upload file: 400 - PDFs not supported'
            };
          }
          return upload;
        })
      );
      
      // Show success notification if any uploads completed successfully
      const successfulUploads = fileUploads.filter(upload => upload.status === 'completed').length;
      if (successfulUploads > 0) {
        setNotification(`${successfulUploads} file upload${successfulUploads > 1 ? 's' : ''} completed`);
        setTimeout(() => setNotification(null), 3000);
      }
    }, 1500);
    
    // Refresh files regardless of success/failure
    if (onRefreshFiles) {
      onRefreshFiles();
    }
  };

  // Update the single file upload handler to use the multiple handler
  const handleFileUpload = async (file: File) => {
    handleMultipleFileUpload([file]);
  };

  const handleLinkSubmit = async () => {
    if (!linkUrl || !defaultVectorStoreId || !onLinkSubmit) {
      setNotification(defaultVectorStoreId ? 'No URL entered' : 'No vector store available');
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    try {
      // Validate URL
      const url = new URL(linkUrl); // This will throw an error if the URL is invalid
      
      // Check if the link is already uploading or present in uploaded files
      const isDuplicate = fileUploads.some(upload => upload.url === linkUrl) || 
                         uploadedFiles.some(file => file.source === 'link' && file.url === linkUrl);
      
      if (isDuplicate) {
        setNotification('This link is already being processed or has been uploaded');
        setTimeout(() => setNotification(null), 3000);
        return;
      }
      
      // Add link to uploads with uploading status
      const uploadId = Math.random().toString(36).substring(2, 11);
      const isYouTube = isYouTubeUrl(linkUrl);
      const domain = isYouTube ? 'YouTube Video' : url.hostname;
      
      setFileUploads(prev => [
        ...prev, 
        {
          id: uploadId,
          name: domain,
          fileName: domain, // Add fileName for deduplication
          status: 'uploading' as const,
          url: linkUrl,
          errorMessage: ''
        }
      ]);

      try {
        // Call the onLinkSubmit function
        await onLinkSubmit(linkUrl);
        
        // Update status to processing
        setFileUploads(prev => 
          prev.map(upload => 
            upload.id === uploadId 
              ? { ...upload, status: 'processing' } 
              : upload
          )
        );
        
        // Show success notification
        setNotification('Link submitted successfully');
        setTimeout(() => setNotification(null), 3000);
        
        // Clear the input
        setLinkUrl('');
        
        // Find the newly added link in uploadedFiles
        // Wait a short time for the link to be processed and added to uploadedFiles
        setTimeout(() => {
          const addedLink = uploadedFiles.find(file => 
            file.source === 'link' && file.url === linkUrl
          );
          
          if (addedLink) {
            // Link was added successfully, fetch and save its content
            loadAndSaveFileContent(addedLink.id);
          }
          
          // Immediately mark as completed and remove from fileUploads
          setFileUploads(prev => prev.filter(upload => upload.url !== linkUrl));
        }, 2000);
      } catch (error) {
        console.error('Error processing link:', error);
        
        // Get error message
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        // Mark as error but keep it visible
        setFileUploads(prev => 
          prev.map(upload => 
            upload.id === uploadId 
              ? { 
                  ...upload, 
                  status: 'error',
                  errorMessage: errorMessage 
                } 
              : upload
          )
        );
        
        // Show error notification
        setNotification(`Error: ${errorMessage}`);
        setTimeout(() => setNotification(null), 3000);
        
        // NEVER auto-remove error uploads - let user dismiss them
      }
      
      if (onRefreshFiles) {
        // Refresh files
        onRefreshFiles();
      }
    } catch (error) {
      if (error instanceof TypeError) {
        setNotification('Please enter a valid URL');
      } else {
        console.error('Error submitting link:', error);
        setNotification(error instanceof Error ? `Error: ${error.message}` : 'Error submitting link');
      }
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const toggleMode = () => {
    setIsLinkMode(!isLinkMode);
    setLinkUrl('');
  };

  const getDocumentMetadata = (file: UploadedFile) => {
    return {
      title: file.doc_title,
      authors: file.doc_authors,
      publication_year: file.doc_publication_year,
      type: file.doc_type,
      summary: file.doc_summary,
      total_pages: file.total_pages,
      processed_at: file.processed_at
    };
  };
  
  const FileStatusBadge = ({ status }: { status?: string }) => {
    if (!status || status === 'completed') {
      return (
        <div className="flex items-center text-green-600 text-xs gap-1">
          <CheckCircle2 className="h-3 w-3" />
          <span>Ready</span>
        </div>
      );
    } else if (status === 'pending' || status === 'processing') {
      return (
        <div className="flex items-center text-amber-600 text-xs gap-1">
          <Clock className="h-3 w-3" />
          <span>Processing</span>
        </div>
      );
    } else if (status === 'error') {
      return (
        <div className="flex items-center text-red-600 text-xs gap-1">
          <AlertTriangle className="h-3 w-3" />
          <span>Error</span>
        </div>
      );
    }
    return null;
  };

  // Render function for uploaded files and uploads in progress 
  const renderAllFiles = () => {
    // Define proper types for the combined array
    type CombinedFile = 
      | { isUpload: true; upload: FileUploadStatus; file?: never }
      | { isUpload: false; file: UploadedFile; upload?: never };
      
    // Create a set of file names that exist in uploadedFiles
    const uploadedFileNames = new Set(uploadedFiles.map(file => file.name));
    
    // Filter temporary uploads more carefully
    const filteredUploads = fileUploads.filter(upload => {
      // Check if a corresponding completed file with metadata exists in the main list
      const correspondingCompletedFile = uploadedFiles.find(f => 
        f.name === upload.fileName && 
        f.status === 'completed' &&
        Boolean(
          (f.doc_title && f.doc_title.trim() !== '') || 
          (Array.isArray(f.doc_authors) && f.doc_authors.length > 0) || 
          f.doc_publication_year || 
          (f.doc_type && f.doc_type.trim() !== '') || 
          (f.doc_summary && f.doc_summary.trim() !== '') || 
          (f.total_pages && f.total_pages > 0) ||
          f.source === 'link'
        )
      );

      // Condition 2: Keep uploading/processing items ONLY if not yet in uploadedFiles
      if ((upload.status === 'uploading' || upload.status === 'processing') && 
          !uploadedFileNames.has(upload.fileName) && 
          !correspondingCompletedFile) {
        return true;
      }
      
      // Filter out everything else
      return false;
    });
    
    // Combine filtered temporary uploads with ALL uploaded files (filtering will happen inline)
    const combinedFiles: CombinedFile[] = [
      ...filteredUploads.map(upload => ({ 
        isUpload: true as const, 
        upload 
      })),
      ...uploadedFiles.map(file => ({ // Use uploadedFiles directly here
        isUpload: false as const, 
        file 
      }))
    ];
    
    // Debug logging removed from here
    
    if (combinedFiles.length === 0 && filteredUploads.length === 0) return null; // Adjusted check
    
    return (
      <div className="mt-3 sm:mt-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-xs sm:text-sm font-semibold text-foreground">
            {fileUploads.length > 0 && uploadedFiles.length === 0 // Adjusted logic slightly
              ? "Uploading Files" 
              : "Uploaded Files"}
          </h3>
        </div>
        <div className="space-y-3 w-full">
          {combinedFiles.map((item) => {
            // Unified card component for both uploaded files and files in progress
            if (item.isUpload) {
              const upload = item.upload;
              const fileExtension = upload.file ? upload.name.split('.').pop()?.toLowerCase() || '' : '';
              
              return (
                <div 
                  key={`upload-${upload.id}`}
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
                        {getFileIcon(upload.name, { name: upload.name } as UploadedFile)}
                        {fileExtension.toUpperCase().substring(0, 4) || 'FILE'}
                      </span>
                      
                      <span className="text-slate-400">•</span>
                      
                      {/* Upload status */}
                      <span className={`
                        ${upload.status === 'error' ? 'text-red-600' : 
                          upload.status === 'completed' /* This check is commented out below */ ? 'text-green-600' : 'text-amber-600'}
                      `}>
                        {upload.status === 'uploading' && 'Uploading...'}
                        {upload.status === 'processing' && 'Processing...'}
                        {/* Remove the display of "Completed" status for temporary uploads */}
                        {upload.status === 'error' && 'Error'}
                      </span>

                      {/* Show error message if available */}
                      {upload.status === 'error' && upload.errorMessage && (
                        <span className="ml-1 text-xs text-red-600">
                          {/* Error message content might be here */}
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
                    {/* Remove the completed checkmark and button for temporary uploads */}
                    {upload.status === 'error' && 
                      <div className="flex items-center gap-1">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        <Button
                          onClick={(e) => removeUpload(upload.id)}
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
            } else {
              // This is an uploaded file - Apply filtering LOGIC HERE
              const file = item.file;

              // --- START INLINE FILTER --- 
              let shouldRender = false;

              // Log file details BEFORE filtering
              console.log(`[FileSidebar Render Check] File: ${file.id} (${file.name}), Status: ${file.status}, Source: ${file.source}, Metadata:`, {
                  title: file.doc_title,
                  authors: file.doc_authors,
                  year: file.doc_publication_year,
                  type: file.doc_type,
                  summary: file.doc_summary,
                  pages: file.total_pages
              });

              // Explicitly define allowed statuses before metadata check
              const allowedStatuses: Array<string | undefined> = ['processing', 'pending', 'completed'];

              // Filter out anything not in the allowed statuses immediately
              if (!allowedStatuses.includes(file.status)) {
                shouldRender = false; // Ensure it's false if status is invalid/undefined/error etc.
              } else {
                // Only proceed with checks if status is potentially valid
                // Condition 1: Keep processing or pending files
                if (file.status === 'processing' || file.status === 'pending') {
                  shouldRender = true;
                }
                // Condition 2: For completed files, check metadata strictly
                else if (file.status === 'completed') {
                  const hasMetadata = Boolean(
                    (file.doc_title && file.doc_title.trim() !== '') || 
                    (Array.isArray(file.doc_authors) && file.doc_authors.length > 0) || 
                    file.doc_publication_year || 
                    (file.doc_type && file.doc_type.trim() !== '') || 
                    (file.doc_summary && file.doc_summary.trim() !== '') || 
                    (file.total_pages && file.total_pages > 0) ||
                    file.source === 'link' // Always keep links
                  );
                  shouldRender = hasMetadata;
                }
                // No need for error check here, it's covered by the initial allowedStatuses check
              }

              // Log the filter result
              console.log(`[FileSidebar Render Check] File: ${file.id} - Should Render: ${shouldRender}`);
              
              // --- END INLINE FILTER ---

              if (!shouldRender) {
                return null; // Don't render this file if it doesn't meet the criteria
              }

              // --- If shouldRender is true, return the Card JSX --- 
              return (
                <div 
                  key={file.id}
                  className="flex w-full max-w-full p-4 items-start gap-3 relative group cursor-pointer hover:bg-gray-50"
                  style={{
                    borderRadius: '16px',
                    border: '1px solid var(--superlight)',
                    background: 'var(--ultralight)'
                  }}
                  onClick={() => handleFileSelection(file)}
                >
                  <div className="flex flex-col flex-grow min-w-0 overflow-hidden">
                    <div className="flex items-start w-full">
                      <span className="truncate text-sm font-medium text-foreground">
                        {file.doc_title || file.name}
                      </span>
                    </div>
                    
                    {/* Show filename as secondary info when title is displayed */}
                    {file.doc_title && (
                      <div className="text-xs text-slate-500 truncate mt-0.5 mb-0.5">
                        {file.name}
                      </div>
                    )}
                    
                    {/* File metadata - authors and type */}
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
                      {/* File format with link icon for URLs */}
                      {file.source === 'link' ? (
                        <span className="flex items-center gap-1">
                          {file.url && isYouTubeUrl(file.url) || file.doc_type?.toLowerCase() === 'youtube_video' ? (
                            <>
                              <YouTubeIcon />
                              YouTube
                            </>
                          ) : (
                            <>
                              <WebPageIcon file={file} />
                              Website
                            </>
                          )}
                        </span>
                      ) : file.name && (
                        <span className="flex items-center gap-1">
                          {getFileIcon(file.name, file)}
                          {file.name.split('.').pop()?.toUpperCase().substring(0, 4) || 'FILE'}
                        </span>
                      )}
                      
                      {/* Dot divider */}
                      {file.name && file.doc_type && file.doc_type !== "Unknown" && (
                        <span className="text-slate-400">•</span>
                      )}
                      
                      {/* Document type */}
                      {file.doc_type && file.doc_type !== "Unknown" && file.doc_type.toLowerCase() !== "youtube_video" && (
                        <span>
                          {file.doc_type.toLowerCase() === 'webpage' || file.doc_type.toLowerCase() === 'webpage' 
                            ? "WEB" 
                            : file.doc_type.substring(0, 3).toUpperCase()}
                        </span>
                      )}
                      
                      {/* Dot divider */}
                      {((file.name || (file.doc_type && file.doc_type !== "Unknown")) && 
                        (file.doc_publication_year || (file.status && file.status !== 'completed'))) && (
                        <span className="text-slate-400">•</span>
                      )}
                      
                      {/* Year instead of "Ready" status */}
                      {file.doc_publication_year && (
                        <span>
                          {file.doc_publication_year}
                        </span>
                      )}
                      
                      {/* Only show error or processing status */}
                      {file.status && file.status !== 'completed' && (
                        <span className={`${file.status === 'error' ? 'text-red-600' : 'text-amber-600'}`}>
                          {file.status === 'error' ? 'Error' : 'Processing'}
                        </span>
                      )}
                      
                      {/* Add "Ready" indicator for completed files with metadata */}
                      {file.status === 'completed' && !file.doc_publication_year && (
                        <>
                          {((file.name || (file.doc_type && file.doc_type !== "Unknown"))) && (
                            <span className="text-slate-400">•</span>
                          )}
                          <span className="text-green-600">Ready</span>
                        </>
                      )}
                      
                      {/* Show URL for link files */}
                      {file.source === 'link' && file.url && (
                        <a 
                          href={file.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="ml-auto text-blue-500 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          View source
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
                          setIsDeletingFile(file.id);
                          // Remove from local storage first
                          removeFileMetadataFromLocalStorage(file.id);
                          const result = onFileDeleted?.(file.id);
                          // Check if the result is a Promise-like object
                          if (result && typeof (result as any).then === 'function') {
                            (result as Promise<any>).finally(() => {
                              setIsDeletingFile(null);
                            });
                          } else {
                            // If not a promise, reset state after a small delay
                            setTimeout(() => setIsDeletingFile(null), 500);
                          }
                        }}
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-transparent"
                        aria-label="Delete file"
                        disabled={isDeletingFile === file.id}
                      >
                        {/* Always render DeleteIcon, disable button based on isDeletingFile */}
                        <DeleteIcon className="h-4 w-4 text-muted-foreground group-hover:text-[#232323]" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            }
          })}
        </div>
      </div>
    );
  };

  // Function to manually remove an upload from the list (for errors)
  const removeUpload = (uploadId: string) => {
    setFileUploads(prev => prev.filter(upload => upload.id !== uploadId));
  };

  // Update the function that handles file selection for detail view to enhance with local storage data
  const handleFileSelection = (file: UploadedFile) => {
    // Check if we can enhance the file data with metadata from local storage
    const storedMetadata = getFileMetadataFromLocalStorage(file.id);
    
    if (storedMetadata) {
      // Merge the stored metadata with the current file data, preferring current data where it exists
      const enhancedFile = {
        ...storedMetadata,
        ...file,
      };
      setSelectedFile(enhancedFile as UploadedFile);
    } else {
      // No stored metadata, just use the file as is
      setSelectedFile(file);
      // And save it for future use
      saveFileMetadataToLocalStorage(file);
    }
  };

  return (
    <div className={`${isMobile ? 'w-full' : 'w-64 border-r'} bg-white border-light h-full flex flex-col`}>
      <div 
        className={`sticky top-0 z-10 flex justify-between items-center h-[60px] px-4 ${isMobile ? 'hidden' : ''} bg-white`}
        style={{ 
          borderBottom: '1px solid var(--light)',
          alignSelf: 'stretch',
          minHeight: '60px'
        }}
      >
        <h2 
          style={{
            color: 'var(--Monochrome-Black, #232323)',
            textAlign: 'center',
            fontSize: '20px',
            fontStyle: 'normal',
            fontWeight: 500,
            lineHeight: '28px'
          }}
        >
          File Upload
        </h2>
        {defaultVectorStoreId && (
          <Button
            onClick={() => onRefreshFiles?.()}
            variant="ghost"
            size="icon"
            className="h-8 w-8 hidden"
            disabled={isRefreshing}
            title="Refresh files"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        )}
      </div>
      
      <div className={`${isMobile ? 'p-2' : 'p-4'} pt-4 overflow-y-auto`}>
        {showSessionInfo && (
          <Card className="mb-3 sm:mb-4 bg-white">
            <CardContent className="p-2 sm:p-3">
              <h3 className="text-xs sm:text-sm font-semibold text-slate-900 mb-2">Current Session</h3>
              
              <div className="space-y-2 text-xs">
                <div>
                  <div className="font-medium text-slate-600">Conversation ID:</div>
                  <div className="flex items-center justify-between gap-1">
                    <code className="bg-slate-100 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-blue-700 font-mono text-[10px] sm:text-xs max-w-[150px] truncate">
                      {currentConversationId || "None"}
                    </code>
                    {currentConversationId && (
                      <Button 
                        onClick={() => onCopyId(currentConversationId)}
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        title="Copy Conversation ID"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
                
                <div>
                  <div className="font-medium text-slate-600">Vector Store ID:</div>
                  <div className="flex items-center justify-between gap-1">
                    <code className="bg-slate-100 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-blue-700 font-mono text-[10px] sm:text-xs max-w-[150px] truncate">
                      {defaultVectorStoreId || "None"}
                    </code>
                    {defaultVectorStoreId && (
                      <Button 
                        onClick={() => onCopyId(defaultVectorStoreId)}
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        title="Copy Vector Store ID"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="mb-4 sm:mb-6">
          {/* ALWAYS show the expanded area now */}
          <div 
            ref={dropAreaRef}
            className={`
              relative overflow-hidden rounded-[16px] p-6
              flex flex-col items-center justify-center text-center
              transition-all duration-300 ease-in-out
              ${!defaultVectorStoreId ? 'cursor-not-allowed opacity-60' : ''}
              ${isDragging ? 'border-primary border-2' : ''}
            `}
            style={{ 
              border: isDragging ? '2px dashed var(--primary)' : '1px dashed var(--normal)',
              background: 'var(--ultralight)',
              transition: 'border 0.2s ease-in-out'
            }}
          >
            {/* Toggle between file upload and link input */}
            <div className="flex w-full mb-4 border-b border-light">
              <button 
                className={`flex-1 py-2 px-1 text-sm font-medium flex items-center justify-center gap-1 transition-colors
                  ${isLinkMode 
                    ? 'text-muted-foreground hover:text-foreground' 
                    : 'text-foreground border-b-2 border-primary'}
                `}
                onClick={() => setIsLinkMode(false)}
                disabled={!defaultVectorStoreId || fileUploads.length > 0}
              >
                <Upload className="h-4 w-4" />
                <span>File</span>
              </button>
              <button 
                className={`flex-1 py-2 px-1 text-sm font-medium flex items-center justify-center gap-1 transition-colors
                  ${isLinkMode 
                    ? 'text-foreground border-b-2 border-primary' 
                    : 'text-muted-foreground hover:text-foreground'}
                `}
                onClick={() => setIsLinkMode(true)}
                disabled={!defaultVectorStoreId || fileUploads.length > 0}
              >
                <Link className="h-4 w-4" />
                <span>Link</span>
              </button>
            </div>

            {isLinkMode ? (
              <>
                <h3 className="text-base font-medium text-foreground mb-2">
                  Add a link
                </h3>
                
                <p className="text-sm text-muted-foreground mb-3">
                  Enter a URL to analyze
                </p>
                
                <div className="w-full mb-2">
                  <input
                    type="url"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full p-2 text-sm border border-light rounded-md"
                    disabled={!defaultVectorStoreId || fileUploads.length > 0}
                  />
                </div>
                <button 
                  className="
                    w-full flex justify-center items-center gap-1 py-3 px-4
                    rounded-[8px] border border-light
                    text-foreground text-sm font-medium
                    transition-colors duration-200 ease-in-out
                    disabled:opacity-70 disabled:cursor-not-allowed
                  "
                  style={{ background: 'var(--superlight)' }}
                  disabled={!defaultVectorStoreId || !linkUrl || fileUploads.length > 0}
                  onClick={handleLinkSubmit}
                >
                  {fileUploads.some(upload => upload.url === linkUrl) ? (
                    <RefreshCw className="h-4 w-4 animate-spin" strokeWidth={2} />
                  ) : (
                    <Link className="h-4 w-4" strokeWidth={2} />
                  )}
                  <span>
                    {fileUploads.some(upload => upload.url === linkUrl) 
                      ? 'Processing...' 
                      : 'Submit Link'}
                  </span>
                </button>
                
                <div className="mt-4 text-xs text-muted-foreground/70">
                  webpages will be processed as text content
                </div>
              </>
            ) : (
              <>
                <input 
                  type="file"
                  onChange={(e) => {
                    if (e.target.files?.length) {
                      // Convert FileList to array for multiple uploads
                      const files = Array.from(e.target.files);
                      handleMultipleFileUpload(files);
                    }
                  }}
                  className="hidden"
                  id="file-upload"
                  multiple
                  accept=".pdf,.txt,.csv,.json,.jsonl,.py,.js,.ts,.jsx,.tsx,.java,.c,.cpp,.html,.css,.xml"
                  ref={fileInputRef}
                />
                
                <div 
                  className="w-full flex flex-col items-center justify-center text-center"
                  style={{ 
                    background: 'var(--ultralight)'
                  }}
                  onClick={defaultVectorStoreId && fileUploads.length === 0 ? handleFileButtonClick : undefined}
                >            
                  <h3 className="text-base font-medium text-foreground mb-2">
                    Drop your files here
                  </h3>
                  
                  <p className="text-sm text-muted-foreground mb-3">
                    or browse from your computer
                  </p>
                  
                  <button 
                    className="
                      w-full flex justify-center items-center gap-1 py-3 px-4
                      rounded-[8px] border border-light
                      text-foreground text-sm font-medium
                      transition-colors duration-200 ease-in-out
                      disabled:opacity-70 disabled:cursor-not-allowed
                    "
                    style={{ background: 'var(--superlight)' }}
                    disabled={!defaultVectorStoreId || fileUploads.length > 0}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFileButtonClick();
                    }}
                  >
                    <Upload className="h-4 w-4" strokeWidth={2} />
                    <span>Select Files</span>
                  </button>
                  
                  <div className="mt-4 text-xs text-muted-foreground/70">
                    Only PDF, TXT, CSV, JSON, and code files are supported
                  </div>
                </div>
              </>
            )}
            
            {/* REMOVED: Collapse button */}
            {/* {uploadedFiles.length > 0 && fileUploads.length === 0 && (
              <button
                className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
                onClick={() => setIsUploadAreaExpanded(false)}
                title="Collapse upload area"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
            )} */}
          </div>
        </div>
        
        {/* Render both active uploads and uploaded files in one unified list */}
        {renderAllFiles()}
        
        {notification && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-80 text-white px-4 py-2 rounded shadow-lg z-50 text-sm">
            {notification}
          </div>
        )}
      </div>
      
      {/* Render the file detail modal when a file is selected */}
      {selectedFile && (
        <FileDetailModal 
          file={selectedFile} 
          onClose={() => setSelectedFile(null)} 
          onSendMessage={onSendMessage}
          onFileQuickAction={onFileQuickAction}
        />
      )}
    </div>
  );
} 
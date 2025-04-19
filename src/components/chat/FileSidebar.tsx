"use client";

import { useRef, useState, useEffect } from 'react';
import { 
  Upload, Copy, 
  RefreshCw, Link, ChevronUp,
  AlertTriangle, CheckCircle2, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DeleteIcon } from '@/components/icons';
import type { FileSidebarProps, UploadedFile } from '@/types/chat';
import { WebPageIcon } from './WebPageIcon';
import { FileDetailModal } from './FileDetailModal';
import { useFileContext } from '@/contexts/FileContext';
import {
  FileCard,
  WebpageCard,
  YouTubeCard,
  UploadingFileCard,
  UploadingWebpageCard,
  UploadingYouTubeCard,
  type FileUploadStatus
} from './cards';

// Add a helper function to get the backend URL at the top of the file
const getBackendUrl = () => {
  return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5002';
};

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
    // Error saving file metadata to local storage
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
    // Error getting file metadata from local storage
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
    }
  } catch (error) {
    // Error removing file metadata from local storage
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
      // Could not load content for file
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
      }
    }
  } catch (error) {
    // Error loading file content
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
  const [linkTempState, setLinkTempState] = useState<{ isAdded: boolean, url: string }>({ isAdded: false, url: '' });

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
    
    // Check if the total number of files and uploads exceeds 50
    const totalCount = uploadedFiles.length + fileUploads.filter(upload => upload.status !== 'error').length;
    const remainingSlots = 50 - totalCount;
    
    if (totalCount >= 50) {
      setNotification('Maximum file limit reached (50). Please remove some files before adding more.');
      setTimeout(() => setNotification(null), 3000);
      return;
    }
    
    // Limit the number of files to be processed
    const filesToProcess = files.slice(0, remainingSlots);
    
    if (files.length > remainingSlots) {
      setNotification(`Only ${remainingSlots} files added. Maximum file limit (50) would be exceeded.`);
      setTimeout(() => setNotification(null), 3000);
    }
    
    // Filter files into supported and unsupported
    const supportedFiles: File[] = [];
    const unsupportedFiles: File[] = [];
    
    filesToProcess.forEach(file => {
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

    // Check if the total number of files and uploads exceeds 50
    const totalCount = uploadedFiles.length + fileUploads.filter(upload => upload.status !== 'error').length;
    if (totalCount >= 50) {
      setNotification('Maximum file limit reached (50). Please remove some files before adding more.');
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

      // Show temporary "Added!" in button
      const currentLinkUrl = linkUrl;
      const tempButtonRef = { isAdded: true, url: currentLinkUrl };
      setLinkTempState(tempButtonRef);
      
      // Clear the input immediately to allow adding more links
      setLinkUrl('');
      
      // Reset button after a brief delay
      setTimeout(() => {
        setLinkTempState(prev => prev.url === tempButtonRef.url ? { isAdded: false, url: '' } : prev);
      }, 1000);

      try {
        // Call the onLinkSubmit function
        await onLinkSubmit(currentLinkUrl);
        
        // Update status to processing
        setFileUploads(prev => 
          prev.map(upload => 
            upload.id === uploadId 
              ? { ...upload, status: 'processing' } 
              : upload
          )
        );
        
        // Find the newly added link in uploadedFiles
        // Wait a short time for the link to be processed and added to uploadedFiles
        setTimeout(() => {
          const addedLink = uploadedFiles.find(file => 
            file.source === 'link' && file.url === currentLinkUrl
          );
          
          if (addedLink) {
            // Link was added successfully, fetch and save its content
            loadAndSaveFileContent(addedLink.id);
          }
        }, 2000);
      } catch (error) {
        // Get error message
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        // Mark as error but keep it visible
        setFileUploads(prev => 
          prev.map(upload => 
            upload.id === uploadId && upload.url === currentLinkUrl
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
      }
      
      if (onRefreshFiles) {
        // Refresh files
        onRefreshFiles();
      }
    } catch (error) {
      if (error instanceof TypeError) {
        setNotification('Please enter a valid URL');
      } else {
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
    
    // Create a set of URLs from uploadedFiles to check for duplicates
    const uploadedFileUrls = new Set(
      uploadedFiles
        .filter(file => file.source === 'link' && file.url)
        .map(file => file.url)
    );
    
    // Filter temporary uploads more carefully
    const filteredUploads = fileUploads.filter(upload => {
      // Skip error uploads altogether - never show them
      if (upload.status === 'error') {
        return false;
      }
      
      // Always filter out temporary uploads if their URL exists in completed files
      if (upload.url && uploadedFileUrls.has(upload.url)) {
        return false; // Skip this temporary upload as we already have a completed entry
      }

      // Check if a corresponding completed file with metadata exists in the main list
      const correspondingCompletedFile = uploadedFiles.find(f => 
        (f.name === upload.fileName || (upload.url && f.url === upload.url)) && 
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

      if (correspondingCompletedFile) {
        return false; // Skip this upload as we have a completed version
      }

      // Keep uploading/processing items ONLY if not yet in uploadedFiles
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
    
    if (combinedFiles.length === 0 && filteredUploads.length === 0) return null; // Adjusted check
    
    return (
      <div className="mt-3 sm:mt-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-xs sm:text-sm font-semibold text-foreground">
            {/* Counter showing files used out of maximum */}
            <span className="text-xs sm:text-sm font-semibold text-foreground">
              {uploadedFiles.length + fileUploads.filter(upload => upload.status !== 'error').length}/50 files
            </span>
          </h3>
        </div>
        <div className="space-y-3 w-full">
          {combinedFiles.map((item) => {
            // Handle uploading file cards
            if (item.isUpload) {
              const upload = item.upload;
              
              // YouTube card for YouTube links
              if (upload.url && isYouTubeUrl(upload.url)) {
                return (
                  <UploadingYouTubeCard
                    key={`upload-${upload.id}`}
                    upload={upload}
                    onRemove={removeUpload}
                  />
                );
              }
              
              // Webpage card for other links
              if (upload.url) {
                return (
                  <UploadingWebpageCard
                    key={`upload-${upload.id}`}
                    upload={upload}
                    onRemove={removeUpload}
                  />
                );
              }
              
              // Default file card for file uploads
              return (
                <UploadingFileCard
                  key={`upload-${upload.id}`}
                  upload={upload}
                  onRemove={removeUpload}
                />
              );
            } else {
              // This is an uploaded file - Apply filtering LOGIC HERE
              const file = item.file;

              // --- START INLINE FILTER --- 
              let shouldRender = false;

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
              }

              if (!shouldRender) {
                return null; // Don't render this file if it doesn't meet the criteria
              }

              // Handle YouTube video links
              if ((file.source === 'link' && file.url && isYouTubeUrl(file.url)) || 
                  file.doc_type?.toLowerCase() === 'youtube_video') {
                return (
                  <YouTubeCard
                    key={file.id}
                    file={file}
                    onDelete={(fileId) => {
                      setIsDeletingFile(fileId);
                      removeFileMetadataFromLocalStorage(fileId);
                      const result = onFileDeleted?.(fileId);
                      if (result && typeof (result as any).then === 'function') {
                        (result as Promise<any>).finally(() => {
                          setIsDeletingFile(null);
                        });
                      } else {
                        setTimeout(() => setIsDeletingFile(null), 500);
                      }
                    }}
                    onSelect={handleFileSelection}
                    isDeletingFile={isDeletingFile}
                  />
                );
              }
              
              // Handle regular web links - Fix webpage detection logic
              if ((file.source === 'link' && (!file.url || !isYouTubeUrl(file.url))) ||
                  file.doc_type?.toLowerCase() === 'webpage') {
                return (
                  <WebpageCard
                    key={file.id}
                    file={file}
                    onDelete={(fileId) => {
                      setIsDeletingFile(fileId);
                      removeFileMetadataFromLocalStorage(fileId);
                      const result = onFileDeleted?.(fileId);
                      if (result && typeof (result as any).then === 'function') {
                        (result as Promise<any>).finally(() => {
                          setIsDeletingFile(null);
                        });
                      } else {
                        setTimeout(() => setIsDeletingFile(null), 500);
                      }
                    }}
                    onSelect={handleFileSelection}
                    isDeletingFile={isDeletingFile}
                  />
                );
              }
              
              // Default file card for regular files
              return (
                <FileCard
                  key={file.id}
                  file={file}
                  onDelete={(fileId) => {
                    setIsDeletingFile(fileId);
                    removeFileMetadataFromLocalStorage(fileId);
                    const result = onFileDeleted?.(fileId);
                    if (result && typeof (result as any).then === 'function') {
                      (result as Promise<any>).finally(() => {
                        setIsDeletingFile(null);
                      });
                    } else {
                      setTimeout(() => setIsDeletingFile(null), 500);
                    }
                  }}
                  onSelect={handleFileSelection}
                  isDeletingFile={isDeletingFile}
                />
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

  // Add event listener for link uploads coming from the chat
  useEffect(() => {
    // Handle when a link upload starts from the chat area
    const handleLinkUploadStarted = (event: CustomEvent) => {
      const { url, name, domain, uploadId, timestamp } = event.detail;
      
      // Create a new virtual upload entry
      const newUpload: FileUploadStatus = {
        id: uploadId,
        name: name || domain,
        url: url,
        status: 'processing',
        fileName: name || domain,
        errorMessage: '',
        metadata: {
          domain,
          source: 'chat_link'
        }
      };
      
      // Add to uploads list
      setFileUploads(prevUploads => [newUpload, ...prevUploads]);
    };
    
    // Handle when a link upload completes
    const handleLinkUploadCompleted = (event: CustomEvent) => {
      const { url, status } = event.detail;
      
      // Update the upload entry with completed status
      setFileUploads(prevUploads => 
        prevUploads.map(upload => {
          if (upload.url === url) {
            return {
              ...upload,
              status: 'completed'
            };
          }
          return upload;
        })
      );
      
      // After a while, remove the upload entry as the file should appear in the files list
      setTimeout(() => {
        setFileUploads(prevUploads => 
          prevUploads.filter(upload => upload.url !== url)
        );
      }, 3000);
    };
    
    // Handle when a link upload errors
    const handleLinkUploadError = (event: CustomEvent) => {
      const { url, status, errorMessage } = event.detail;
      
      // Update the upload entry with error status
      setFileUploads(prevUploads => 
        prevUploads.map(upload => {
          if (upload.url === url) {
            return {
              ...upload,
              status: 'error',
              errorMessage: errorMessage || 'Failed to process link'
            };
          }
          return upload;
        })
      );
    };
    
    // Add event listeners
    window.addEventListener('link-upload-started', handleLinkUploadStarted as EventListener);
    window.addEventListener('link-upload-completed', handleLinkUploadCompleted as EventListener);
    window.addEventListener('link-upload-error', handleLinkUploadError as EventListener);
    
    // Clean up listeners on unmount
    return () => {
      window.removeEventListener('link-upload-started', handleLinkUploadStarted as EventListener);
      window.removeEventListener('link-upload-completed', handleLinkUploadCompleted as EventListener);
      window.removeEventListener('link-upload-error', handleLinkUploadError as EventListener);
    };
  }, []);

  // Add this useEffect to clean up duplicate uploads when files are successfully processed
  useEffect(() => {
    if (uploadedFiles.length > 0) {
      // Create a set of URLs from all completed files
      const completedFileUrls = new Set(
        uploadedFiles
          .filter(file => file.source === 'link' && file.url && file.status === 'completed')
          .map(file => file.url)
      );
      
      // Remove any temporary uploads that correspond to completed files
      if (completedFileUrls.size > 0) {
        setFileUploads(prev => 
          prev.filter(upload => {
            // If this is a link upload and we have a completed file with the same URL, remove it
            if (upload.url && completedFileUrls.has(upload.url)) {
              return false; // Remove this temporary upload
            }
            return true; // Keep other uploads
          })
        );
      }
    }
  }, [uploadedFiles]);

  // New useEffect to auto-remove error uploads after a short delay
  useEffect(() => {
    // Check if there are any uploads with error status
    const errorUploads = fileUploads.filter(upload => upload.status === 'error');
    
    if (errorUploads.length > 0) {
      // Show a notification for the first error
      if (errorUploads[0].errorMessage) {
        setNotification(`Error: ${errorUploads[0].errorMessage}`);
        setTimeout(() => setNotification(null), 3000);
      }
      
      // Automatically remove error uploads after a short delay
      const timer = setTimeout(() => {
        setFileUploads(prev => prev.filter(upload => upload.status !== 'error'));
      }, 500); // Remove after 500ms
      
      return () => clearTimeout(timer);
    }
  }, [fileUploads]);

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
                disabled={!defaultVectorStoreId}
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
                disabled={!defaultVectorStoreId}
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
                    disabled={!defaultVectorStoreId}
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
                  disabled={!defaultVectorStoreId || !linkUrl}
                  onClick={handleLinkSubmit}
                >
                  {linkTempState.isAdded ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" strokeWidth={2} />
                  ) : (
                    <Link className="h-4 w-4" strokeWidth={2} />
                  )}
                  <span>
                    {linkTempState.isAdded ? 'Added!' : 'Submit Link'}
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
"use client";

import { useRef, useState, useEffect } from 'react';
import { 
  Copy, 
  RefreshCw,
  AlertTriangle, CheckCircle2, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DeleteIcon } from '@/components/icons';
import type { FileSidebarProps, UploadedFile } from '@/types/chat';
import { WebPageIcon } from './WebPageIcon';
import { FileDetailModal } from './FileDetailModal';
import { useFileContext } from '@/contexts/FileContext';
import { FileStatusBadge } from './FileStatusBadge';
import { SessionInfoCard } from './SessionInfoCard';
import { UploadArea } from './UploadArea';
import { FileList } from './FileList';
import type { FileUploadStatus } from './cards';
import {
  getBackendUrl,
  isFileFormatSupported,
  saveFileMetadataToLocalStorage,
  getFileMetadataFromLocalStorage,
  removeFileMetadataFromLocalStorage,
  loadAndSaveFileContent,
  getDocumentMetadata
} from '@/utils/fileHelpers';
import {
  isYouTubeUrl,
  isNonVideoYouTubeUrl,
  extractUrlsFromText,
  cleanUrl,
  normalizeUrl,
  isUrlAlreadyInSession
} from '@/utils/urlHelpers';
import { useDragAndDrop } from '@/hooks/useDragAndDrop';


// Define MSD global interface type
declare global {
  interface Window {
    MSD?: {
      getUser: () => Promise<{ 
        user?: { 
          subscription?: boolean | string;
          subscription_type?: string;
          is_subscription_cancelled?: boolean;
          subscription_valid_until?: string;
          has_paid?: boolean;
          [key: string]: any;  // Allow for any other properties
        } 
      }>;
      openSubscriptionDialog: (options: {
        isClosable: boolean;
        shouldVerifySubscriptionRetrieval: boolean;
        type: string;
        promoMode?: string;
        source?: string;
      }) => Promise<void>;
      sendAmpEvent?: (eventName: string, eventProperties?: Record<string, any>) => void;
    };
    // Add debug utilities
    show_limits_as_for_unsubscribed?: () => void;
    restore_subscription_state?: () => void;
    unlock_unlimited_messages?: (secretKey: string) => boolean;
    toggle_debug_info?: () => void;
  }
}

// Function to get the reason why FileSidebar might be disabled
const getDisabledReason = (props: FileSidebarProps): { disabled: boolean; reason: string } => {
  if (!props.userId) {
    return { disabled: true, reason: 'No user ID available' };
  }
  
  if (!props.currentConversationId) {
    return { disabled: true, reason: 'No conversation ID available' };
  }
  
  if (!props.defaultVectorStoreId) {
    return { disabled: true, reason: 'No vector store ID available' };
  }
  
  return { disabled: false, reason: 'FileSidebar is fully enabled' };
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
  onFileQuickAction,
  onShowAnalysis,
  onFileSelect,
  isMobile: isMobileProp,
  autoAddSources: autoAddSourcesProp,
  setAutoAddSources: setAutoAddSourcesProp,
  isExpanded = false,
  onToggleExpand
}: FileSidebarProps) {
  // Get disabled status and reason
  const { disabled, reason } = getDisabledReason({
    uploadedFiles, isUploadingFile, showFileInfo, userId, currentConversationId, 
    defaultVectorStoreId, onFileUpload, onLinkSubmit, onToggleFileInfo, onFileDeleted,
    onVectorStoreCreated, onRefreshFiles, isRefreshing, onSendMessage,
    onFileQuickAction, onShowAnalysis, onFileSelect, isMobile: isMobileProp
  });

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
  // Use the context for selectedFile instead of local state
  const { selectedFile: contextSelectedFile, setSelectedFile: contextSetSelectedFile } = useFileContext();
  const [isUploadAreaExpanded, setIsUploadAreaExpanded] = useState(true);
  const [hasUserManuallyExpanded, setHasUserManuallyExpanded] = useState(false);
  
  // Track multiple file uploads with their progress
  const [fileUploads, setFileUploads] = useState<FileUploadStatus[]>([]);
  const [linkTempState, setLinkTempState] = useState<{ isAdded: boolean, url: string }>({ isAdded: false, url: '' });

  // Get the setUploadedFiles function from the FileContext
  const { setUploadedFiles } = useFileContext();

  // Auto add sources toggle state - use props if provided, otherwise fallback to local state
  const [localAutoAddSources, setLocalAutoAddSources] = useState(() => {
    // Load from localStorage on initialization
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('autoAddSources');
      return saved ? JSON.parse(saved) : true;
    }
    return true;
  });

  // Use props if provided, otherwise use local state
  const autoAddSources = autoAddSourcesProp !== undefined ? autoAddSourcesProp : localAutoAddSources;
  const setAutoAddSources = setAutoAddSourcesProp || setLocalAutoAddSources;

  // Automatically collapse upload area when files are added (but respect manual expansion)
  useEffect(() => {
    const hasFiles = uploadedFiles.length > 0 || fileUploads.filter(upload => upload.status !== 'error').length > 0;
    if (hasFiles && isUploadAreaExpanded && !hasUserManuallyExpanded) {
      setIsUploadAreaExpanded(false);
    }
  }, [uploadedFiles.length, fileUploads, isUploadAreaExpanded, hasUserManuallyExpanded]);

  // Save auto add sources preference to localStorage (only if using local state)
  useEffect(() => {
    if (autoAddSourcesProp === undefined && typeof window !== 'undefined') {
      localStorage.setItem('autoAddSources', JSON.stringify(localAutoAddSources));
    }
  }, [localAutoAddSources, autoAddSourcesProp]);

  // Note: useAutoAddLinks hook is now called in Home component so it works regardless of sidebar visibility

  // Detect mobile screen size or use prop
  useEffect(() => {
    if (isMobileProp !== undefined) {
      // Use the prop if provided (this is the primary source of truth)
      setIsMobile(isMobileProp);
    } else {
      // Fall back to window size detection only if prop is not provided
      const checkIfMobile = () => {
        setIsMobile(window.innerWidth < 768);
      };
      
      // Initial check
      checkIfMobile();
      
      // Add resize listener
      window.addEventListener('resize', checkIfMobile);
      
      return () => window.removeEventListener('resize', checkIfMobile);
    }
  }, [isMobileProp]);

  // Also update mobile state immediately when prop changes
  useEffect(() => {
    if (isMobileProp !== undefined) {
      setIsMobile(isMobileProp);
    }
  }, [isMobileProp]);

  // Debug logging for mobile issues
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).debugFileSidebar = () => {
        console.log('FileSidebar Debug Info:', {
          isMobile,
          isMobileProp,
          uploadedFiles: uploadedFiles.length,
          fileUploads: fileUploads.length,
          disabled,
          reason,
          userId: !!userId,
          currentConversationId: !!currentConversationId,
          defaultVectorStoreId: !!defaultVectorStoreId
        });
      };
    }
  }, [isMobile, isMobileProp, uploadedFiles.length, fileUploads.length, disabled, reason, userId, currentConversationId, defaultVectorStoreId]);

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
      // Silent error handling
    }
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

  // Use the drag and drop hook
  useDragAndDrop({
    dropAreaRef,
    isDragging,
    setIsDragging,
    isLinkMode,
    handleMultipleFileUpload
  });

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

    // Clean the URL before processing
    const cleanedUrl = cleanUrl(linkUrl);
    
    if (!cleanedUrl) {
      setNotification('Please enter a valid URL');
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    // Check if it's a non-video YouTube URL and reject it
    if (isNonVideoYouTubeUrl(cleanedUrl)) {
      setNotification('YouTube channel, playlist, and user URLs are not supported. Please use a direct video link.');
      setTimeout(() => setNotification(null), 4000);
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
      // Use the enhanced duplicate detection function
      if (isUrlAlreadyInSession(cleanedUrl, uploadedFiles, fileUploads)) {
        // Silently ignore duplicate links
        return;
      }
      
      // Add link to uploads with uploading status
      const uploadId = Math.random().toString(36).substring(2, 11);
      const isYouTube = isYouTubeUrl(cleanedUrl);
      const domain = isYouTube ? 'YouTube Video' : new URL(cleanedUrl).hostname;
      
      setFileUploads(prev => [
        ...prev, 
        {
          id: uploadId,
          name: domain,
          fileName: domain, // Add fileName for deduplication
          status: 'uploading' as const,
          url: cleanedUrl,
          errorMessage: ''
        }
      ]);

      // Show temporary "Added!" in button
      const currentLinkUrl = cleanedUrl;
      const tempButtonRef = { isAdded: true, url: currentLinkUrl };
      setLinkTempState(tempButtonRef);
      
      // Clear the input immediately to allow adding more links
      setLinkUrl('');
      
      // Reset button after a brief delay
      setTimeout(() => {
        setLinkTempState(prev => prev.url === tempButtonRef.url ? { isAdded: false, url: '' } : prev);
      }, 1000);

      try {
        // Call the onLinkSubmit function with cleaned URL
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
        const isNetworkError = (error instanceof TypeError && error.message.includes('fetch')) || 
                              (error instanceof Error && (error.name === 'NetworkError' || error.message.includes('Network error')));
        
        // Mark as error but keep it visible
        setFileUploads(prev => 
          prev.map(upload => 
            upload.id === uploadId && upload.url === currentLinkUrl
              ? { 
                  ...upload, 
                  status: 'error',
                  errorMessage: errorMessage,
                  metadata: {
                    ...upload.metadata,
                    isNetworkError: isNetworkError
                  }
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
      
      contextSetSelectedFile(enhancedFile as UploadedFile);
      
      // Also call the parent component's onFileSelect if provided
      if (onFileSelect) {
        onFileSelect(enhancedFile as UploadedFile);
      }
    } else {
      // No stored metadata, just use the file as is
      contextSetSelectedFile(file);
      
      // Also call the parent component's onFileSelect if provided
      if (onFileSelect) {
        onFileSelect(file);
      }
      
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
      const { url, status, errorMessage, isNetworkError } = event.detail;
      
      // Update the upload entry with error status
      setFileUploads(prevUploads => 
        prevUploads.map(upload => {
          if (upload.url === url) {
            return {
              ...upload,
              status: 'error',
              errorMessage: errorMessage || 'Failed to process link',
              metadata: {
                ...upload.metadata,
                isNetworkError: isNetworkError || false
              }
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
      // Only show notification for manual errors (not auto-add errors)
      const manualErrorUploads = errorUploads.filter(upload => 
        !upload.metadata?.source || upload.metadata.source !== 'auto_add'
      );
      
      // Show a notification for the first manual error only
      if (manualErrorUploads.length > 0 && manualErrorUploads[0].errorMessage) {
        setNotification(`Error: ${manualErrorUploads[0].errorMessage}`);
        setTimeout(() => setNotification(null), 3000);
      }
      
      // Separate network errors from other errors
      const networkErrors = errorUploads.filter(upload => 
        upload.metadata?.isNetworkError === true
      );
      const otherErrors = errorUploads.filter(upload => 
        upload.metadata?.isNetworkError !== true
      );
      
      // Remove non-network errors quickly (500ms)
      if (otherErrors.length > 0) {
        const timer = setTimeout(() => {
          setFileUploads(prev => prev.filter(upload => 
            upload.status !== 'error' || upload.metadata?.isNetworkError === true
          ));
        }, 500);
        
        // Clean up timer if component unmounts
        return () => clearTimeout(timer);
      }
      
      // Remove network errors more slowly (5 seconds) to give user time to see the issue
      if (networkErrors.length > 0) {
        const networkTimer = setTimeout(() => {
          setFileUploads(prev => prev.filter(upload => 
            !(upload.status === 'error' && upload.metadata?.isNetworkError === true)
          ));
        }, 5000);
        
        // Clean up timer if component unmounts
        return () => clearTimeout(networkTimer);
      }
    }
  }, [fileUploads]);

  // Add effect to specifically track critical changes to disabled status
  useEffect(() => {
    // Store this in localStorage for debugging across page refreshes
    try {
      // Get existing logs or initialize
      const storedLogs = localStorage.getItem('fileSidebarDebugLogs') || '[]';
      const logs = JSON.parse(storedLogs);
      
      // Add new log entry with timestamp
      logs.push({
        timestamp: new Date().toISOString(),
        disabled,
        reason,
        userId,
        currentConversationId,
        defaultVectorStoreId
      });
      
      // Keep only the last 20 logs
      const trimmedLogs = logs.slice(-20);
      
      // Save back to localStorage
      localStorage.setItem('fileSidebarDebugLogs', JSON.stringify(trimmedLogs));
    } catch (e) {
      // Silent error handling
    }
    
  }, [disabled, reason, userId, currentConversationId, defaultVectorStoreId]);

  if (contextSelectedFile) {
    return (
      <div className={`w-full bg-white border-light h-full flex flex-col relative transition-all duration-300`}>
        <FileDetailModal
          file={contextSelectedFile}
          onClose={() => {
            contextSetSelectedFile(null);
            
            // Also call the parent component's onFileSelect if provided
            if (onFileSelect) {
              onFileSelect(null);
            }
          }}
          onSendMessage={onSendMessage}
          onFileQuickAction={onFileQuickAction}
        />
      </div>
    );
  }

  return (
    <div className={`w-full bg-white border-light h-full flex flex-col transition-all duration-300`}>
      {/* Header - Show on desktop, hide on mobile */}
      {!isMobile && (
        <div 
          className="sticky top-0 z-10 flex justify-between items-center h-[60px] px-4 bg-white"
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
              fontSize: '17px',
              fontStyle: 'normal',
              fontWeight: 500,
              lineHeight: '28px'
            }}
            className="flex items-center gap-3"
          >
            Project Sources ({uploadedFiles.length + fileUploads.filter(upload => upload.status !== 'error').length}/50)
          </h2>
          <div className="flex items-center gap-2">
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
        </div>
      )}
      
      {/* Mobile header - Show only on mobile */}
      {isMobile && (
        <div className="flex justify-between items-center h-[50px] px-3 bg-white border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            Project Sources ({uploadedFiles.length + fileUploads.filter(upload => upload.status !== 'error').length}/50)
          </h2>
          {defaultVectorStoreId && (
            <Button
              onClick={() => onRefreshFiles?.()}
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={isRefreshing}
              title="Refresh files"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>
      )}
      
      <div className={`${isMobile ? 'p-3' : 'p-4'} ${isMobile ? 'pt-3' : 'pt-4'} overflow-y-auto flex-1`}>
        {showSessionInfo && (
          <SessionInfoCard
            currentConversationId={currentConversationId || undefined}
            defaultVectorStoreId={defaultVectorStoreId || undefined}
            onCopyId={onCopyId}
          />
        )}

        <div className={`${isMobile ? 'mb-3' : 'mb-4 sm:mb-6'}`}>
          {/* Collapsible upload area */}
          <UploadArea
            uploadedFiles={uploadedFiles}
            fileUploads={fileUploads}
            isUploadAreaExpanded={isUploadAreaExpanded}
            setIsUploadAreaExpanded={setIsUploadAreaExpanded}
            hasUserManuallyExpanded={hasUserManuallyExpanded}
            setHasUserManuallyExpanded={setHasUserManuallyExpanded}
            dropAreaRef={dropAreaRef}
            defaultVectorStoreId={defaultVectorStoreId}
            isDragging={isDragging}
            isLinkMode={isLinkMode}
            setIsLinkMode={setIsLinkMode}
            linkUrl={linkUrl}
            setLinkUrl={setLinkUrl}
            linkTempState={linkTempState}
            handleLinkSubmit={handleLinkSubmit}
            fileInputRef={fileInputRef}
            handleFileButtonClick={handleFileButtonClick}
            handleMultipleFileUpload={handleMultipleFileUpload}
            autoAddSources={autoAddSources}
            setAutoAddSources={setAutoAddSources}
          />
        </div>
        
        {/* Render both active uploads and uploaded files in one unified list */}
        <div className="flex-1 min-h-0">
          <FileList
            uploadedFiles={uploadedFiles}
            fileUploads={fileUploads}
            isDeletingFile={isDeletingFile}
            setIsDeletingFile={setIsDeletingFile}
            onFileDeleted={onFileDeleted}
            onFileSelect={handleFileSelection}
            removeUpload={removeUpload}
          />
        </div>
        

        
        {notification && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-[#232323] bg-opacity-80 text-white px-4 py-2 rounded shadow-lg z-50 text-sm">
            {notification}
          </div>
        )}
      </div>
    </div>
  );
} 
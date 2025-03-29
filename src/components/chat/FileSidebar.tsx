import { useRef, useState, useEffect } from 'react';
import { 
  Upload, FileText, Info, Copy, 
  Maximize2, CheckCircle2, Clock, AlertTriangle,
  RefreshCw, ChevronDown, ChevronRight, BookOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DeleteIcon } from '@/components/icons';
import type { FileSidebarProps, UploadedFile, DocumentMetadata } from '@/types/chat';

// Add a helper function to get the backend URL at the top of the file
const getBackendUrl = () => {
  return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5002';
};

export function FileSidebar({
  uploadedFiles,
  isUploadingFile,
  showFileInfo,
  userId,
  currentConversationId,
  defaultVectorStoreId,
  onFileUpload,
  onToggleFileInfo,
  onFileDeleted,
  onVectorStoreCreated,
  onRefreshFiles,
  isRefreshing = false
}: FileSidebarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropAreaRef = useRef<HTMLDivElement>(null);
  const [isDeletingFile, setIsDeletingFile] = useState<string | null>(null);
  const [isCreatingVectorStore, setIsCreatingVectorStore] = useState(false);
  const lastVectorStoreIdRef = useRef<string | null>(null);
  const [showSessionInfo, setShowSessionInfo] = useState(false);
  const [expandedFileId, setExpandedFileId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

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
  }, [defaultVectorStoreId, onRefreshFiles]);

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
        handleFileUpload(e.dataTransfer.files[0]);
      }
    };

    const dropArea = dropAreaRef.current;
    if (dropArea) {
      dropArea.addEventListener('dragover', handleDragOver);
      dropArea.addEventListener('dragenter', handleDragEnter);
      dropArea.addEventListener('dragleave', handleDragLeave);
      dropArea.addEventListener('drop', handleDrop);
    }

    return () => {
      if (dropArea) {
        dropArea.removeEventListener('dragover', handleDragOver);
        dropArea.removeEventListener('dragenter', handleDragEnter);
        dropArea.removeEventListener('dragleave', handleDragLeave);
        dropArea.removeEventListener('drop', handleDrop);
      }
    };
  }, [isDragging]);

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

  const onCopyId = async (text: string) => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
  };
  
  const handleDeleteFile = async (fileId: string) => {
    // Show confirmation dialog
    const confirmed = window.confirm('Are you sure you want to delete this file? This action cannot be undone.');
    
    if (!confirmed) {
      return;
    }
    
    try {
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/files/${fileId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete file: ${response.status}`);
      }
      
      // Call the parent's onFileDeleted handler
      if (onFileDeleted) {
        onFileDeleted(fileId);
      }
      
      setNotification('File deleted successfully');
      setTimeout(() => setNotification(null), 2000);
    } catch (error) {
      console.error('Error deleting file:', error);
      setNotification('Error deleting file');
      setTimeout(() => setNotification(null), 2000);
    }
  };
  
  const handleCreateVectorStore = async () => {
    if (!userId || !currentConversationId) {
      setNotification('User ID and conversation ID are required to create a vector store');
      setTimeout(() => setNotification(null), 2000);
      return;
    }
    
    setIsCreatingVectorStore(true);
    
    try {
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/vector-store`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          chat_id: currentConversationId
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create vector store: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data && data.vectorStoreId) {
        // Call the parent's onVectorStoreCreated handler
        if (onVectorStoreCreated) {
          onVectorStoreCreated(data.vectorStoreId);
        }
        
        setNotification('Vector store created successfully');
        setTimeout(() => setNotification(null), 2000);
      } else {
        throw new Error('No vector store ID returned');
      }
    } catch (error) {
      console.error('Error creating vector store:', error);
      setNotification('Error creating vector store');
      setTimeout(() => setNotification(null), 2000);
    } finally {
      setIsCreatingVectorStore(false);
    }
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

  const handleFileUpload = async (file: File) => {
    if (!file || !defaultVectorStoreId) {
      setNotification(defaultVectorStoreId ? 'No file selected' : 'No vector store available');
      setTimeout(() => setNotification(null), 2000);
      return;
    }
    
    try {
      await onFileUpload(file);
      
      // Show success notification
      setNotification('File uploaded successfully');
      setTimeout(() => setNotification(null), 2000);
      
      if (onRefreshFiles) {
        // Let's refresh files after a brief delay to give the server time to process
        setTimeout(() => {
          onRefreshFiles();
        }, 2000);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      setNotification(error instanceof Error ? `Error: ${error.message}` : 'Error uploading file');
      setTimeout(() => setNotification(null), 2000);
    }
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

  return (
    <div className={`${isMobile ? 'w-full' : 'w-64 border-r'} bg-white border-light h-full overflow-y-auto`}>
      <div 
        className={`flex justify-between items-center h-[60px] px-4 ${isMobile ? 'hidden' : ''}`}
        style={{ 
          borderBottom: '1px solid var(--light)',
          alignSelf: 'stretch'
        }}
      >
        <h2 className="text-lg font-bold text-foreground">File Upload</h2>
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
      
      <div className={`${isMobile ? 'p-2' : 'p-4'} pt-4`}>
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
                    <code className="bg-slate-100 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-emerald-600 font-mono text-[10px] sm:text-xs max-w-[150px] truncate">
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
          <input 
            type="file"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                handleFileUpload(e.target.files[0]);
              }
            }}
            className="hidden"
            id="file-upload"
            accept=".txt,.md,.csv,.json,.jsonl,.html,.xml,.py,.js,.java,.c,.cpp,.pdf,.jpg,.jpeg,.png,.gif,.webp"
            ref={fileInputRef}
          />
          
          <div 
            ref={dropAreaRef}
            className={`
              relative overflow-hidden rounded-[16px] p-8
              flex flex-col items-center justify-center text-center
              transition-all duration-300 ease-in-out
              ${!defaultVectorStoreId 
                ? 'cursor-not-allowed opacity-60' 
                : isDragging 
                  ? 'shadow-[0px_0px_20px_0px_rgba(35,35,35,0.20)]' 
                  : 'hover:shadow-[0px_0px_20px_0px_rgba(35,35,35,0.10)]'}
            `}
            style={{ 
              border: '1px dashed var(--normal)',
              background: 'var(--ultralight)'
            }}
            onClick={defaultVectorStoreId ? handleFileButtonClick : undefined}
          >            
            <h3 className="text-base font-medium text-foreground mb-2">
              {isUploadingFile ? 'Uploading file...' : 'Drop your file here'}
            </h3>
            
            <p className="text-sm text-muted-foreground mb-3">
              {isUploadingFile 
                ? `Processing ${isUploadingFile ? '...' : ''}`
                : 'or browse from your computer'}
            </p>
            
            {!isUploadingFile && (
              <button 
                className="
                  w-full flex justify-center items-center gap-1 py-3 px-4
                  rounded-[8px] border border-light
                  text-foreground text-sm font-medium
                  transition-colors duration-200 ease-in-out
                  disabled:opacity-70 disabled:cursor-not-allowed
                "
                style={{ background: 'var(--superlight)' }}
                disabled={!defaultVectorStoreId}
                onClick={(e) => {
                  e.stopPropagation();
                  handleFileButtonClick();
                }}
              >
                <Upload className="h-4 w-4" strokeWidth={2} />
                <span>Select File</span>
              </button>
            )}
            
            {isUploadingFile && (
              <div className="w-full max-w-[240px] bg-muted rounded-full h-1.5 mt-3 overflow-hidden">
                <div className="h-full bg-primary rounded-full animate-progress"></div>
              </div>
            )}
            
            <div className="mt-4 text-xs text-muted-foreground/70">
              PDF, TXT, CSV, JSON, and code files supported
            </div>
          </div>
          
          {!defaultVectorStoreId && (
            <div className="mt-2">
              <div className="p-2 bg-amber-50 border border-amber-200 rounded-md">
                <p className="text-xs text-amber-700">
                  {isCreatingVectorStore ? (
                    "Creating vector store..."
                  ) : (
                    <>
                      No vector store available.{" "}
                      <button
                        onClick={handleCreateVectorStore}
                        className="text-blue-600 hover:underline"
                        disabled={isCreatingVectorStore || !userId}
                      >
                        Create one
                      </button>
                    </>
                  )}
                </p>
              </div>
            </div>
          )}
        </div>
        
        {uploadedFiles.length > 0 && (
          <div className="mt-3 sm:mt-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-xs sm:text-sm font-semibold text-foreground">Uploaded Files</h3>
            </div>
            <div className="space-y-3 w-full">
              {uploadedFiles.map((file) => (
                <div 
                  key={file.id}
                  className="flex w-full max-w-full p-4 items-start gap-3 relative group"
                  style={{
                    borderRadius: '16px',
                    border: '1px solid var(--superlight)',
                    background: 'var(--ultralight)'
                  }}
                >
                  <div className="flex flex-col flex-grow min-w-0 overflow-hidden">
                    <div className="flex items-start w-full">
                      <span className="truncate text-sm font-medium text-foreground">{file.name}</span>
                    </div>
                    
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
                      {/* File format */}
                      {file.name && (
                        <span>
                          {file.name.split('.').pop()?.toUpperCase() || 'FILE'}
                        </span>
                      )}
                      
                      {/* Dot divider */}
                      {file.name && file.doc_type && file.doc_type !== "Unknown" && (
                        <span className="text-slate-400">•</span>
                      )}
                      
                      {/* Document type */}
                      {file.doc_type && file.doc_type !== "Unknown" && (
                        <span>
                          {file.doc_type}
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
                    </div>

                    {file.status && file.status !== 'completed' && (
                      <div className="mt-1 text-[10px] text-amber-600 bg-amber-50 p-1.5 rounded">
                        This file is still being processed and may not be available for search yet.
                      </div>
                    )}
                  </div>
                  
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteFile(file.id);
                    }}
                    variant="ghost"
                    size="icon"
                    className="flex items-center gap-2.5 p-2 absolute right-2 top-2 h-auto w-auto invisible group-hover:visible"
                    style={{
                      borderRadius: '8px',
                      border: '1px solid var(--light)',
                      background: 'var(--white)'
                    }}
                    title="Delete file"
                    disabled={isDeletingFile === file.id}
                  >
                    {isDeletingFile === file.id ? (
                      <div className="animate-spin h-3.5 w-3.5 border-2 border-destructive border-t-transparent rounded-full"></div>
                    ) : (
                      <DeleteIcon className="h-4 w-4 text-black" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 
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

// Add a helper function to get the backend URL at the top of the file
const getBackendUrl = () => {
  return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5002';
};

// Define an interface for tracking file uploads
interface FileUploadStatus {
  id: string;
  name: string;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
}

// Helper to get the appropriate icon for a file extension
const getFileIcon = (fileName: string, file: UploadedFile) => {
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

  // Auto-collapse upload area when files are uploaded
  useEffect(() => {
    if (uploadedFiles.length > 0 && !isUploadingFile) {
      setIsUploadAreaExpanded(false);
    } else if (uploadedFiles.length === 0) {
      setIsUploadAreaExpanded(true);
    }
  }, [uploadedFiles.length, isUploadingFile]);

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
        // Convert FileList to array and upload all files
        const files = Array.from(e.dataTransfer.files);
        handleMultipleFileUpload(files);
      }
    };

    const dropArea = dropAreaRef.current;
    if (dropArea && !isLinkMode) {
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
    setTimeout(() => setNotification(null), 2000);
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

  // New function to handle multiple file uploads
  const handleMultipleFileUpload = async (files: File[]) => {
    if (!files.length || !defaultVectorStoreId) {
      setNotification(defaultVectorStoreId ? 'No files selected' : 'No vector store available');
      setTimeout(() => setNotification(null), 2000);
      return;
    }
    
    // Add each file to the uploads state with initial status
    const newUploads = files.map(file => ({
      id: Math.random().toString(36).substring(2, 11), // Generate a temporary ID
      name: file.name,
      status: 'uploading' as const, 
      progress: 0
    }));
    
    setFileUploads(prev => [...prev, ...newUploads]);
    
    // Process each file upload one by one
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const uploadId = newUploads[i].id;
      
      try {
        // Update progress to 50% - upload started
        setFileUploads(prev => 
          prev.map(upload => 
            upload.id === uploadId 
              ? { ...upload, progress: 50 } 
              : upload
          )
        );
        
        // Call the original onFileUpload function
        await onFileUpload(file);
        
        // Mark as processing
        setFileUploads(prev => 
          prev.map(upload => 
            upload.id === uploadId 
              ? { ...upload, status: 'processing', progress: 75 } 
              : upload
          )
        );
        
        // Show success notification only for the last file
        if (i === files.length - 1) {
          setNotification(`${files.length} ${files.length === 1 ? 'file' : 'files'} uploaded successfully`);
          setTimeout(() => setNotification(null), 2000);
        }
        
        // Mark as completed
        setTimeout(() => {
          setFileUploads(prev => 
            prev.map(upload => 
              upload.id === uploadId 
                ? { ...upload, status: 'completed', progress: 100 } 
                : upload
            )
          );
          
          // Remove completed upload after a delay
          setTimeout(() => {
            setFileUploads(prev => prev.filter(upload => upload.id !== uploadId));
          }, 3000);
        }, 1000);
        
      } catch (error) {
        console.error('Error uploading file:', error);
        
        // Mark as error
        setFileUploads(prev => 
          prev.map(upload => 
            upload.id === uploadId 
              ? { ...upload, status: 'error', progress: 100 } 
              : upload
          )
        );
        
        setNotification(error instanceof Error ? `Error: ${error.message}` : 'Error uploading file');
        setTimeout(() => setNotification(null), 2000);
        
        // Remove error upload after a delay
        setTimeout(() => {
          setFileUploads(prev => prev.filter(upload => upload.id !== uploadId));
        }, 5000);
      }
    }
    
    // Refresh files after all uploads are done or after 2 seconds
    if (onRefreshFiles) {
      setTimeout(() => {
        onRefreshFiles();
      }, 2000);
    }
  };

  // Update the single file upload handler to use the multiple handler
  const handleFileUpload = async (file: File) => {
    handleMultipleFileUpload([file]);
  };

  const handleLinkSubmit = async () => {
    if (!linkUrl || !defaultVectorStoreId || !onLinkSubmit) {
      setNotification(defaultVectorStoreId ? 'No URL entered' : 'No vector store available');
      setTimeout(() => setNotification(null), 2000);
      return;
    }

    try {
      // Validate URL
      new URL(linkUrl); // This will throw an error if the URL is invalid
      
      await onLinkSubmit(linkUrl);
      
      // Show success notification
      setNotification('Link submitted successfully');
      setTimeout(() => setNotification(null), 2000);
      
      // Clear the input
      setLinkUrl('');
      
      if (onRefreshFiles) {
        // Refresh files after a brief delay
        setTimeout(() => {
          onRefreshFiles();
        }, 2000);
      }
    } catch (error) {
      if (error instanceof TypeError) {
        setNotification('Please enter a valid URL');
      } else {
        console.error('Error submitting link:', error);
        setNotification(error instanceof Error ? `Error: ${error.message}` : 'Error submitting link');
      }
      setTimeout(() => setNotification(null), 2000);
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

  // Render function for in-progress uploads
  const renderFileUploads = () => {
    if (fileUploads.length === 0) return null;
    
    return (
      <div className="space-y-3 mb-4 w-full">
        {fileUploads.map((upload) => (
          <div 
            key={upload.id}
            className="flex w-full p-3 items-start gap-3 relative border border-light rounded-lg bg-white"
          >
            <div className="flex flex-col flex-grow min-w-0 overflow-hidden">
              <div className="flex items-center justify-between w-full mb-1">
                <span className="truncate text-sm font-medium text-foreground">{upload.name}</span>
                {upload.status === 'uploading' && <Clock className="h-4 w-4 text-amber-500 animate-pulse" />}
                {upload.status === 'processing' && <Clock className="h-4 w-4 text-amber-500" />}
                {upload.status === 'completed' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                {upload.status === 'error' && <AlertTriangle className="h-4 w-4 text-red-500" />}
              </div>
              
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div 
                  className={`h-full rounded-full ${
                    upload.status === 'error' 
                      ? 'bg-red-500' 
                      : upload.status === 'completed'
                        ? 'bg-green-500'
                        : 'bg-blue-500'
                  }`}
                  style={{ width: `${upload.progress}%`, transition: 'width 0.5s ease' }}
                ></div>
              </div>
              
              <div className="mt-1">
                <span className="text-xs text-slate-500">
                  {upload.status === 'uploading' && 'Uploading...'}
                  {upload.status === 'processing' && 'Processing...'}
                  {upload.status === 'completed' && 'Upload complete'}
                  {upload.status === 'error' && 'Upload failed'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
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
            className="h-8 w-8"
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
          {/* Collapsed upload area - just shows buttons */}
          {!isUploadAreaExpanded && uploadedFiles.length > 0 && fileUploads.length === 0 ? (
            <div className="flex gap-2 w-full">
              <button 
                className="flex-1 py-2 px-3 text-sm font-medium flex items-center justify-center gap-1 rounded-md border border-light hover:bg-gray-50"
                style={{ background: 'var(--ultralight)' }}
                onClick={() => {
                  setIsLinkMode(false);
                  setIsUploadAreaExpanded(true);
                }}
                disabled={!defaultVectorStoreId}
              >
                <Upload className="h-4 w-4" />
                <span>Upload</span>
              </button>
              <button 
                className="flex-1 py-2 px-3 text-sm font-medium flex items-center justify-center gap-1 rounded-md border border-light hover:bg-gray-50"
                style={{ background: 'var(--ultralight)' }}
                onClick={() => {
                  setIsLinkMode(true);
                  setIsUploadAreaExpanded(true);
                }}
                disabled={!defaultVectorStoreId}
              >
                <Link className="h-4 w-4" />
                <span>Add Link</span>
              </button>
            </div>
          ) : (
            <div 
              className={`
                relative overflow-hidden rounded-[16px] p-6
                flex flex-col items-center justify-center text-center
                transition-all duration-300 ease-in-out
                ${!defaultVectorStoreId ? 'cursor-not-allowed opacity-60' : ''}
              `}
              style={{ 
                border: '1px dashed var(--normal)',
                background: 'var(--ultralight)'
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
                    <Link className="h-4 w-4" strokeWidth={2} />
                    <span>Submit Link</span>
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
                    accept=".txt,.md,.csv,.json,.jsonl,.html,.xml,.py,.js,.java,.c,.cpp,.pdf,.jpg,.jpeg,.png,.gif,.webp"
                    ref={fileInputRef}
                  />
                  
                  <div 
                    ref={dropAreaRef}
                    className={`
                      w-full flex flex-col items-center justify-center text-center
                      ${isDragging ? 'opacity-70' : ''}
                    `}
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
                      PDF, TXT, CSV, JSON, and code files supported
                    </div>
                  </div>
                </>
              )}
              
              {/* Collapse button when upload area is expanded and files exist */}
              {uploadedFiles.length > 0 && fileUploads.length === 0 && (
                <button
                  className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
                  onClick={() => setIsUploadAreaExpanded(false)}
                  title="Collapse upload area"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>
        
        {/* Show active file uploads with progress */}
        {renderFileUploads()}
        
        {notification && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-80 text-white px-4 py-2 rounded shadow-lg z-50 text-sm">
            {notification}
          </div>
        )}
        
        {uploadedFiles.length > 0 && (
          <div className="mt-3 sm:mt-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-xs sm:text-sm font-semibold text-foreground">Uploaded Files</h3>
            </div>
            <div className="space-y-3 w-full">
              {uploadedFiles.map((file) => (
                <div 
                  key={file.id}
                  className="flex w-full max-w-full p-4 items-start gap-3 relative group cursor-pointer hover:bg-gray-50"
                  style={{
                    borderRadius: '16px',
                    border: '1px solid var(--superlight)',
                    background: 'var(--ultralight)'
                  }}
                  onClick={() => setSelectedFile(file)}
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
                      {/* File format with link icon for URLs */}
                      {file.source === 'link' ? (
                        <span className="flex items-center gap-1">
                          <WebPageIcon file={file} />
                          Website
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
                      {file.doc_type && file.doc_type !== "Unknown" && (
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
                    {/* Delete button */}
                    <Button
                      onClick={() => onFileDeleted?.(file.id)}
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Delete file"
                      disabled={isDeletingFile === file.id}
                    >
                      <DeleteIcon className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
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
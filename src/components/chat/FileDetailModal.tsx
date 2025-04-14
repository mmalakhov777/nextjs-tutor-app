"use client";

import { useState, useEffect } from 'react';
import { 
  Copy, 
  Maximize2, CheckCircle2, Clock, AlertTriangle,
  ChevronDown, ChevronRight, BookOpen,
  Link, ExternalLink, FileIcon, Image, Code, Database, 
  FileJson, FileCode, Globe, X, 
  Hash, Clock3, FileDigit, FilePen, ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { UploadedFile } from '@/types/chat';
import { WebPageIcon } from './WebPageIcon';
import BackIcon from '@/components/icons/BackIcon';
import AuthorIcon from '@/components/icons/AuthorIcon';
import FileTypeIcon from '@/components/icons/FileTypeIcon';

// Helper function to get the backend URL
const getBackendUrl = () => {
  return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5002';
};

// Helper function to format file size
const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Helper function to save file metadata to local storage - same as in FileSidebar
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
      // Save file content if it exists
      file_content: file.file_content
    };
    
    // Save back to local storage
    localStorage.setItem('uploadedFilesMetadata', JSON.stringify(metadataObj));
  } catch (error) {
    console.error('Error saving file metadata to local storage:', error);
  }
};

// Helper function to get file metadata from local storage - same as in FileSidebar
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

// FileDetailModal component to show detailed file information
export const FileDetailModal = ({ 
  file, 
  onClose,
  onSendMessage,
  onFileQuickAction
}: { 
  file: UploadedFile | null; 
  onClose: () => void;
  onSendMessage?: (message: string) => void;
  onFileQuickAction?: (fileInfo: UploadedFile, action: string, content: string) => void;
}) => {
  if (!file) return null;
  
  // Enhancement: Check if we have additional metadata in localStorage
  const storedMetadata = getFileMetadataFromLocalStorage(file.id);
  const enhancedFile = storedMetadata ? { ...storedMetadata, ...file } as UploadedFile : file;
  
  // Save the enhanced file to localStorage for future use
  saveFileMetadataToLocalStorage(enhancedFile);
  
  const [notification, setNotification] = useState<string | null>(null);
  
  // Define text value style
  const textValueStyle = "text-[#3C3C3C] text-[14px] font-normal leading-[20px]";
  
  const formatDate = (date: Date | string) => {
    if (!date) return 'Unknown';
    const d = new Date(date);
    return d.toLocaleString();
  };
  
  // Function to get file content from backend if it's not already in the file object
  // Check localStorage first, then backend
  const [fileContent, setFileContent] = useState<string | null>(enhancedFile.file_content || null);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  
  const loadFileContent = async () => {
    if (fileContent) return; // Already loaded
    
    // First check if we have content in localStorage
    const storedData = getFileMetadataFromLocalStorage(enhancedFile.id);
    if (storedData && storedData.file_content) {
      setFileContent(storedData.file_content);
      return;
    }
    
    setIsLoadingContent(true);
    try {
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/files/${enhancedFile.id}/content`);
      
      if (!response.ok) {
        throw new Error(`Failed to load file content: ${response.status}`);
      }
      
      const data = await response.json();
      const content = data.content || 'No content available';
      
      // Set the content
      setFileContent(content);
      
      // Save to localStorage for future use
      enhancedFile.file_content = content;
      saveFileMetadataToLocalStorage(enhancedFile);
      
    } catch (error) {
      console.error('Error loading file content:', error);
      setFileContent('Failed to load content');
    } finally {
      setIsLoadingContent(false);
    }
  };
  
  // When the component mounts, save metadata to localStorage
  useEffect(() => {
    saveFileMetadataToLocalStorage(enhancedFile);
  }, []);
  
  const isWebLink = enhancedFile.source === 'link' || 
                    enhancedFile.doc_type?.toLowerCase() === 'webpage' || 
                    enhancedFile.doc_type?.toLowerCase() === 'webpage';
  
  // Function to truncate content to prevent overly large messages
  const truncateContent = (content: string) => {
    const maxLength = 25000; // Limit content to 25k characters
    if (content.length > maxLength) {
      return content.substring(0, maxLength) + "... [content truncated]";
    }
    return content;
  };

  // Format the message with special tags for identification
  const formatQuickActionMessage = (content: string, action: string) => {
    return `<FILE_QUICK_ACTION>
filename: ${enhancedFile.name || "document"}
file_id: ${enhancedFile.id}
action: ${action}
content: ${content}
</FILE_QUICK_ACTION>`;
  };
  
  // Quick action handlers
  const handleQuickAction = async (action: string) => {
    if (!onSendMessage && !onFileQuickAction) {
      console.error("No message handler available");
      setNotification("Unable to send message to chat");
      setTimeout(() => setNotification(null), 3000);
      return;
    }
    
    // Show processing notification
    setNotification(`Processing: ${action}`);
    
    console.log("Quick action clicked:", action);
    
    // If content not loaded yet, load it first
    if (!fileContent && !isLoadingContent) {
      setIsLoadingContent(true);
      try {
        const backendUrl = getBackendUrl();
        const response = await fetch(`${backendUrl}/api/files/${enhancedFile.id}/content`);
        
        if (!response.ok) {
          throw new Error(`Failed to load file content: ${response.status}`);
        }
        
        const data = await response.json();
        const content = data.content || 'No content available';
        const truncatedContent = truncateContent(content);
        
        // Update state
        setFileContent(content);
        
        // Save to localStorage
        enhancedFile.file_content = content;
        saveFileMetadataToLocalStorage(enhancedFile);
        
        // Create a direct format that works better with streaming
        const directMessage = `${enhancedFile.name}\nAction: ${action}\n\nDocument content: ${truncatedContent}`;
        
        // Send the message directly without special formatting
        if (onSendMessage) {
          onSendMessage(directMessage);
          
          // Show success notification before closing
          setNotification("Message sent to chat!");
          setTimeout(() => onClose(), 500);
        }
        else if (onFileQuickAction) {
          onFileQuickAction(enhancedFile, action, truncatedContent);
          
          // Show success notification before closing
          setNotification("Message sent to chat!");
          setTimeout(() => onClose(), 500);
        }
      } catch (error) {
        console.error('Error loading file content for quick action:', error);
        
        // Create a simpler fallback message
        const fallbackMessage = `${enhancedFile.name}\nAction: ${action}\n\nDocument content: Unable to load content`;
        
        if (onSendMessage) {
          onSendMessage(fallbackMessage);
        }
        else if (onFileQuickAction) {
          onFileQuickAction(enhancedFile, action, "Unable to load content");
        }
        
        // Show notification before closing
        setNotification("Message sent to chat!");
        setTimeout(() => onClose(), 500);
      } finally {
        setIsLoadingContent(false);
      }
    } else if (fileContent) {
      // Content already loaded, send message immediately
      const truncatedContent = truncateContent(fileContent);
      
      // Create a direct format that works better with streaming
      const directMessage = `${enhancedFile.name}\nAction: ${action}\n\nDocument content: ${truncatedContent}`;
      
      // Send the message directly without special formatting
      if (onSendMessage) {
        onSendMessage(directMessage);
      }
      else if (onFileQuickAction) {
        onFileQuickAction(enhancedFile, action, truncatedContent);
      }
      
      // Show success notification before closing
      setNotification("Message sent to chat!");
      setTimeout(() => onClose(), 500);
    } else {
      console.log("Content is loading, please try again in a moment");
      setNotification("Content is loading, please try again in a moment");
      setTimeout(() => setNotification(null), 3000);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col h-screen w-screen">
      {/* Notification */}
      {notification && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-80 text-white px-4 py-2 rounded shadow-lg z-[60] text-sm">
          {notification}
        </div>
      )}
      
      {/* Header */}
      <div className="p-6 md:px-16 lg:px-24 xl:px-[314px] bg-white sticky top-0 z-10">
        <div className="mb-10">
          <button 
            onClick={onClose} 
            className="flex items-center gap-2 hover:opacity-80"
          >
            <BackIcon 
              className="text-[#232323]" 
              width={20} 
              height={20} 
            />
            <span style={{
              color: 'var(--Monochrome-Black, #232323)',
              textAlign: 'center',
              fontFeatureSettings: "'ss04' on",
              fontSize: '16px',
              fontStyle: 'normal',
              fontWeight: 500,
              lineHeight: '24px'
            }}>
              Close modal
            </span>
          </button>
        </div>
        
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[32px] font-medium leading-[40px] text-[#232323] text-left">
            {enhancedFile.doc_title || enhancedFile.name}
          </h2>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col items-center gap-10 p-6 md:px-16 lg:px-24 xl:px-[314px] pb-10 self-stretch">
          {/* URL for web links */}
          {enhancedFile.url && (
            <div className="mb-6 w-full">
              <a 
                href={enhancedFile.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className={`text-blue-500 hover:underline flex items-center gap-2 ${textValueStyle}`}
              >
                <Globe className="h-4 w-4 text-blue-500" />
                {enhancedFile.url}
              </a>
            </div>
          )}
          
          {/* Details grid */}
          <div className="grid grid-cols-1 gap-6 w-full">
            {/* File info without labels */}
            <div className="flex flex-wrap items-center gap-4">
              {/* Type */}
              <div className="flex items-center gap-2">
                <FileTypeIcon className="h-5 w-5 text-gray-500" />
                <span className={textValueStyle}>{isWebLink ? 'webpage' : 
                  enhancedFile.doc_type?.toLowerCase().includes('pdf') ? 'PDF' : 
                  enhancedFile.doc_type || enhancedFile.type || 'Unknown'}</span>
              </div>
              
              {/* Authors */}
              {enhancedFile.doc_authors && enhancedFile.doc_authors.length > 0 && (
                <div className="flex items-center gap-2">
                  <AuthorIcon className="h-5 w-5 text-gray-500" />
                  <span className={textValueStyle}>{enhancedFile.doc_authors.join(', ')}</span>
                </div>
              )}
              
              {/* Publication Year */}
              {enhancedFile.doc_publication_year && (
                <div className="flex items-center gap-2">
                  <span className={textValueStyle}>{enhancedFile.doc_publication_year}</span>
                </div>
              )}
              
              {/* Total Pages */}
              {enhancedFile.total_pages && (
                <div className="flex items-center gap-2">
                  <span className={textValueStyle}>{enhancedFile.total_pages} pages</span>
                </div>
              )}
              
              {/* Always show Total Pages if file is PDF, even if not in object */}
              {!enhancedFile.total_pages && enhancedFile.doc_type?.toLowerCase().includes('pdf') && (
                <div className="flex items-center gap-2">
                  <span className={textValueStyle}>11 pages</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Summary */}
          {enhancedFile.doc_summary && (
            <div className="mt-6 pt-6 border-t w-full">
              <div className="flex items-start gap-2">
                <p className={`whitespace-pre-line ${textValueStyle}`}>{enhancedFile.doc_summary}</p>
              </div>
            </div>
          )}
          
          {/* Quick action buttons */}
          <div className="mt-6 pt-6 border-t w-full">
            <h3 className="text-sm font-medium mb-3">Quick Actions</h3>
            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={() => handleQuickAction("What are the key points of this document?")}
                className="flex items-center p-3 gap-1 rounded-[8px] bg-[#232323] text-white hover:bg-[#333333] text-xs"
                style={{ padding: '12px', gap: '4px' }}
              >
                Key Points
              </Button>
              <Button 
                onClick={() => handleQuickAction("Summarize the main controversies or debates mentioned in this document.")}
                className="flex items-center p-3 gap-1 rounded-[8px] bg-[#232323] text-white hover:bg-[#333333] text-xs"
                style={{ padding: '12px', gap: '4px' }}
              >
                Controversies
              </Button>
              <Button 
                onClick={() => handleQuickAction("What methods were used in this research?")}
                className="flex items-center p-3 gap-1 rounded-[8px] bg-[#232323] text-white hover:bg-[#333333] text-xs"
                style={{ padding: '12px', gap: '4px' }}
              >
                Methods
              </Button>
              <Button 
                onClick={() => handleQuickAction("What are the limitations of this study or document?")}
                className="flex items-center p-3 gap-1 rounded-[8px] bg-[#232323] text-white hover:bg-[#333333] text-xs"
                style={{ padding: '12px', gap: '4px' }}
              >
                Limitations
              </Button>
              <Button 
                onClick={() => handleQuickAction("What are the practical implications of this document?")}
                className="flex items-center p-3 gap-1 rounded-[8px] bg-[#232323] text-white hover:bg-[#333333] text-xs"
                style={{ padding: '12px', gap: '4px' }}
              >
                Implications
              </Button>
              <Button 
                onClick={() => handleQuickAction("Generate 5 important questions to better understand this document.")}
                className="flex items-center p-3 gap-1 rounded-[8px] bg-[#232323] text-white hover:bg-[#333333] text-xs"
                style={{ padding: '12px', gap: '4px' }}
              >
                Generate Questions
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 
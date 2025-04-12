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
  
  const [notification, setNotification] = useState<string | null>(null);
  
  // Define text value style
  const textValueStyle = "text-[#3C3C3C] text-[14px] font-normal leading-[20px]";
  
  const formatDate = (date: Date | string) => {
    if (!date) return 'Unknown';
    const d = new Date(date);
    return d.toLocaleString();
  };
  
  // Function to get file content from backend if it's not already in the file object
  const [fileContent, setFileContent] = useState<string | null>(file.file_content || null);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  
  const loadFileContent = async () => {
    if (fileContent) return; // Already loaded
    
    setIsLoadingContent(true);
    try {
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/files/${file.id}/content`);
      
      if (!response.ok) {
        throw new Error(`Failed to load file content: ${response.status}`);
      }
      
      const data = await response.json();
      setFileContent(data.content || 'No content available');
    } catch (error) {
      console.error('Error loading file content:', error);
      setFileContent('Failed to load content');
    } finally {
      setIsLoadingContent(false);
    }
  };
  
  const isWebLink = file.source === 'link' || 
                    file.doc_type?.toLowerCase() === 'webpage' || 
                    file.doc_type?.toLowerCase() === 'webpage';
  
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
filename: ${file.name || "document"}
file_id: ${file.id}
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
        const response = await fetch(`${backendUrl}/api/files/${file.id}/content`);
        
        if (!response.ok) {
          throw new Error(`Failed to load file content: ${response.status}`);
        }
        
        const data = await response.json();
        const content = data.content || 'No content available';
        const truncatedContent = truncateContent(content);
        
        // Update state
        setFileContent(content);
        
        // Create a direct format that works better with streaming
        const directMessage = `${file.name}\nAction: ${action}\n\nDocument content: ${truncatedContent}`;
        
        // Send the message directly without special formatting
        if (onSendMessage) {
          onSendMessage(directMessage);
          
          // Show success notification before closing
          setNotification("Message sent to chat!");
          setTimeout(() => onClose(), 500);
        }
        else if (onFileQuickAction) {
          onFileQuickAction(file, action, truncatedContent);
          
          // Show success notification before closing
          setNotification("Message sent to chat!");
          setTimeout(() => onClose(), 500);
        }
      } catch (error) {
        console.error('Error loading file content for quick action:', error);
        
        // Create a simpler fallback message
        const fallbackMessage = `${file.name}\nAction: ${action}\n\nDocument content: Unable to load content`;
        
        if (onSendMessage) {
          onSendMessage(fallbackMessage);
        }
        else if (onFileQuickAction) {
          onFileQuickAction(file, action, "Unable to load content");
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
      const directMessage = `${file.name}\nAction: ${action}\n\nDocument content: ${truncatedContent}`;
      
      // Send the message directly without special formatting
      if (onSendMessage) {
        onSendMessage(directMessage);
      }
      else if (onFileQuickAction) {
        onFileQuickAction(file, action, truncatedContent);
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
            {file.doc_title || file.name}
          </h2>
          
          {file.url && (
            <a 
              href={file.url}
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline flex items-center gap-1 text-sm"
            >
              <ExternalLink className="h-3 w-3" />
              Open Source
            </a>
          )}
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col items-center gap-10 p-6 md:px-16 lg:px-24 xl:px-[314px] pb-10 self-stretch">
          {/* URL for web links */}
          {file.url && (
            <div className="mb-6 w-full">
              <a 
                href={file.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className={`text-blue-500 hover:underline flex items-center gap-2 ${textValueStyle}`}
              >
                <Globe className="h-4 w-4 text-blue-500" />
                {file.url}
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
                  file.doc_type?.toLowerCase().includes('pdf') ? 'PDF' : 
                  file.doc_type || file.type || 'Unknown'}</span>
              </div>
              
              {/* Authors */}
              {file.doc_authors && file.doc_authors.length > 0 && (
                <div className="flex items-center gap-2">
                  <AuthorIcon className="h-5 w-5 text-gray-500" />
                  <span className={textValueStyle}>{file.doc_authors.join(', ')}</span>
                </div>
              )}
              
              {/* Publication Year */}
              {file.doc_publication_year && (
                <div className="flex items-center gap-2">
                  <span className={textValueStyle}>{file.doc_publication_year}</span>
                </div>
              )}
              
              {/* Total Pages */}
              {file.total_pages && (
                <div className="flex items-center gap-2">
                  <span className={textValueStyle}>{file.total_pages} pages</span>
                </div>
              )}
              
              {/* Always show Total Pages if file is PDF, even if not in object */}
              {!file.total_pages && file.doc_type?.toLowerCase().includes('pdf') && (
                <div className="flex items-center gap-2">
                  <span className={textValueStyle}>11 pages</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Summary */}
          {file.doc_summary && (
            <div className="mt-6 pt-6 border-t w-full">
              <div className="flex items-start gap-2">
                <p className={`whitespace-pre-line ${textValueStyle}`}>{file.doc_summary}</p>
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
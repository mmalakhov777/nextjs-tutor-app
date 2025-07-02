"use client";

import { useState, useEffect } from 'react';
import { 
  Copy, 
  Maximize2, CheckCircle2, Clock, AlertTriangle,
  ChevronDown, ChevronRight, BookOpen,
  Link, ExternalLink, FileIcon, Image, Code, Database, 
  FileJson, FileCode, Globe, X, 
  Hash, Clock3, FileDigit, FilePen, ChevronUp,
  Calendar, Eye, EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { UploadedFile } from '@/types/chat';
import { WebPageIcon } from './WebPageIcon';
import BackIcon from '@/components/icons/BackIcon';
import AuthorIcon from '@/components/icons/AuthorIcon';
import FileTypeIcon from '@/components/icons/FileTypeIcon';
import { PlusIcon } from '@/components/icons/PlusIcon';

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

// Helper function to extract domain from URL
const extractDomain = (url: string): string => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '');
  } catch (e) {
    return "Website";
  }
};

// Helper function to get URL from file object
const getFileUrl = (file: UploadedFile): string => {
  // First check if URL is directly available
  if (file.url) return file.url;
  
  // Then check if URL is in metadata.original_url
  if (file.metadata && typeof file.metadata === 'object' && 'original_url' in file.metadata) {
    return file.metadata.original_url as string;
  }
  
  return "";
};

// Helper function to check if a URL is a YouTube video URL
const isYouTubeUrl = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url);
    
    // Check for youtube.com with video parameter
    if (parsedUrl.hostname.includes('youtube.com')) {
      // Must have 'v' parameter for video ID
      return parsedUrl.searchParams.has('v') && parsedUrl.searchParams.get('v') !== '';
    }
    
    // Check for youtu.be format (shortened YouTube links)
    if (parsedUrl.hostname.includes('youtu.be')) {
      // For youtu.be, the video ID is in the pathname (e.g., youtu.be/VIDEO_ID)
      const pathname = parsedUrl.pathname;
      return pathname.length > 1 && pathname !== '/'; // Must have a video ID after the slash
    }
    
    return false;
  } catch {
    return false;
  }
};

// Helper function to extract YouTube video ID
const getYouTubeVideoId = (url: string): string | null => {
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.hostname.includes('youtube.com')) {
      return parsedUrl.searchParams.get('v');
    } else if (parsedUrl.hostname.includes('youtu.be')) {
      return parsedUrl.pathname.slice(1);
    }
    return null;
  } catch {
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
  onSendMessage?: (message: string, agent?: string) => void;
  onFileQuickAction?: (fileInfo: UploadedFile, action: string, content: string) => void;
}) => {
  if (!file) return null;
  
  // Enhancement: Check if we have additional metadata in localStorage
  const storedMetadata = getFileMetadataFromLocalStorage(file.id);
  const enhancedFile = storedMetadata ? { ...storedMetadata, ...file } as UploadedFile : file;
  
  // Save the enhanced file to localStorage for future use
  saveFileMetadataToLocalStorage(enhancedFile);
  
  const [notification, setNotification] = useState<string | null>(null);
  const [webMetadata, setWebMetadata] = useState<{
    title?: string;
    description?: string;
    favicon?: string;
    domain?: string;
  } | null>(null);
  
  // Define text value style
  const textValueStyle = "text-[#3C3C3C] text-[14px] font-normal leading-[20px]";
  
  const formatDate = (date: Date | string) => {
    if (!date) return 'Unknown';
    const d = new Date(date);
    return d.toLocaleString();
  };
  
  // Get the URL using the helper function
  const fileUrl = getFileUrl(enhancedFile);
  
  // Function to get file content from backend if it's not already in the file object
  // Check localStorage first, then backend
  const [fileContent, setFileContent] = useState<string | null>(enhancedFile.file_content || null);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  


  // When the component mounts, save metadata to localStorage
  useEffect(() => {
    saveFileMetadataToLocalStorage(enhancedFile);
  }, []);
  
  const isWebLink = enhancedFile.source === 'link' || 
                    enhancedFile.doc_type?.toLowerCase() === 'webpage' || 
                    enhancedFile.doc_type?.toLowerCase() === 'webpage';
  
  // Check if this is a YouTube video
  const isYouTubeVideo = fileUrl && isYouTubeUrl(fileUrl);
  const youTubeVideoId = isYouTubeVideo ? getYouTubeVideoId(fileUrl) : null;
  

  
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
  
  // Quick action handlers - enhanced for web links
  const handleQuickAction = async (action: string, agent?: string) => {
    if (!onSendMessage && !onFileQuickAction) {
      console.error("No message handler available");
      setNotification("Unable to send message to chat");
      setTimeout(() => setNotification(null), 3000);
      return;
    }
    
    // Show processing notification
    setNotification(`Processing: ${action}`);
    
    console.log("Quick action clicked:", action);
    
    // For web links, we can send the URL directly for some actions
    if (isWebLink && fileUrl) {
      let message = '';
      
      if (action.includes('Summarize')) {
        message = `Summarize this webpage: ${fileUrl}`;
      } else if (action.includes('Extract Key Points') || action.includes('key points')) {
        message = `Extract key points from: ${fileUrl}`;
      } else if (action.includes('Find Contacts')) {
        message = `Please use multiple search queries to find the contacts of this website owner: ${fileUrl}`;
      } else if (action.includes('controversies')) {
        message = `Summarize the main controversies or debates mentioned in this webpage: ${fileUrl}`;
      } else if (action.includes('methods')) {
        message = `What methods were used in this research? URL: ${fileUrl}`;
      } else if (action.includes('limitations')) {
        message = `What are the limitations of this study or document? URL: ${fileUrl}`;
      } else if (action.includes('implications')) {
        message = `What are the practical implications of this document? URL: ${fileUrl}`;
      } else if (action.includes('questions')) {
        message = `Generate 5 important questions to better understand this document: ${fileUrl}`;
      } else {
        message = `${action} - URL: ${fileUrl}`;
      }
      
      // Send the message with appropriate agent
      if (onSendMessage) {
        onSendMessage(message, agent || (isWebLink ? 'Web Researcher' : undefined));
        
        // Show success notification but don't close
        setNotification("Message sent to chat!");
        setTimeout(() => setNotification(null), 3000);
      }
      return;
    }
    
    // For non-web files, use the existing content-based approach
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
          onSendMessage(directMessage, agent);
          
          // Show success notification but don't close
          setNotification("Message sent to chat!");
          setTimeout(() => setNotification(null), 3000);
        }
        else if (onFileQuickAction) {
          onFileQuickAction(enhancedFile, action, truncatedContent);
          
          // Show success notification but don't close
          setNotification("Message sent to chat!");
          setTimeout(() => setNotification(null), 3000);
        }
      } catch (error) {
        console.error('Error loading file content for quick action:', error);
        
        // Create a simpler fallback message
        const fallbackMessage = `${enhancedFile.name}\nAction: ${action}\n\nDocument content: Unable to load content`;
        
        if (onSendMessage) {
          onSendMessage(fallbackMessage, agent);
        }
        else if (onFileQuickAction) {
          onFileQuickAction(enhancedFile, action, "Unable to load content");
        }
        
        // Show notification but don't close
        setNotification("Message sent to chat!");
        setTimeout(() => setNotification(null), 3000);
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
        onSendMessage(directMessage, agent);
      }
      else if (onFileQuickAction) {
        onFileQuickAction(enhancedFile, action, truncatedContent);
      }
      
      // Show success notification but don't close
      setNotification("Message sent to chat!");
      setTimeout(() => setNotification(null), 3000);
    } else {
      console.log("Content is loading, please try again in a moment");
      setNotification("Content is loading, please try again in a moment");
      setTimeout(() => setNotification(null), 3000);
    }
  };
  
  return (
    <div className="bg-white h-full w-full overflow-auto flex flex-col">
      {/* Notification */}
      {notification && (
        <div className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-[#232323] bg-opacity-80 text-white px-4 py-2 rounded shadow-lg z-[60] text-sm">
          {notification}
        </div>
      )}
      
      {/* Header */}
      <div className="p-4 bg-white sticky top-0 z-10 border-b border-gray-200">
        <div className="mb-4">
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
              Back to files
            </span>
          </button>
        </div>
        
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-medium text-[#232323] text-left">
              {webMetadata?.title || enhancedFile.doc_title || enhancedFile.name}
            </h2>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-col w-full">
          {/* YouTube Video Embed */}
          {isYouTubeVideo && youTubeVideoId && (
            <div className="w-full mb-0">
              <div className="relative w-full" style={{ paddingBottom: '56.25%' /* 16:9 aspect ratio */ }}>
                <iframe
                  className="absolute top-0 left-0 w-full h-full rounded-lg"
                  src={`https://www.youtube.com/embed/${youTubeVideoId}`}
                  title="YouTube video player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            </div>
          )}
          

          
          {/* Content sections with conditional spacing */}
          <div className={`flex flex-col w-full ${isYouTubeVideo ? 'gap-6' : 'gap-6'}`}>
            {/* Details grid - Hide webpage metadata for YouTube videos */}
            {!isYouTubeVideo && (
              <div className="grid grid-cols-1 gap-6 w-full">
                {/* File info without labels */}
                <div className="flex flex-wrap items-center gap-4">
                  {/* Type - Hide for YouTube videos */}
                  {!isYouTubeVideo && (
                    <div className="flex items-center gap-2">
                      <FileTypeIcon className="h-5 w-5 text-gray-500" />
                      <span className={textValueStyle}>{isWebLink ? 'webpage' : 
                        enhancedFile.doc_type?.toLowerCase().includes('pdf') ? 'PDF' : 
                        enhancedFile.doc_type || enhancedFile.type || 'Unknown'}</span>
                    </div>
                  )}
                  
                  {/* Authors */}
                  {enhancedFile.doc_authors && enhancedFile.doc_authors.length > 0 && (
                    <div className="flex items-center gap-2">
                      <AuthorIcon className="h-5 w-5 text-gray-500" />
                      <span className={textValueStyle}>{enhancedFile.doc_authors.join(', ')}</span>
                    </div>
                  )}
                  
                  
                  {/* Publication Year - Hide for YouTube videos AND web links */}
                  {!isYouTubeVideo && !isWebLink && enhancedFile.doc_publication_year && (
                    <div className="flex items-center gap-2">
                      <span className={textValueStyle}>{enhancedFile.doc_publication_year}</span>
                    </div>
                  )}
                  
                  {/* URL for web links */}
                  {fileUrl && !isYouTubeVideo && isWebLink && (
                    <div className="flex items-center gap-2">
                      <Link className="h-4 w-4 text-gray-500" />
                      <a 
                        href={fileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className={`${textValueStyle} truncate max-w-xs`}
                        style={{ color: '#70D6FF' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = '#5BB8E8';
                          e.currentTarget.style.textDecoration = 'underline';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = '#70D6FF';
                          e.currentTarget.style.textDecoration = 'none';
                        }}
                      >
                        {extractDomain(fileUrl)}
                      </a>
                    </div>
                  )}
                  
                  {/* Total Pages - Hide for YouTube videos AND web links */}
                  {!isYouTubeVideo && !isWebLink && enhancedFile.total_pages && (
                    <div className="flex items-center gap-2">
                      <span className={textValueStyle}>{enhancedFile.total_pages} pages</span>
                    </div>
                  )}
                  
                  {/* Always show Total Pages if file is PDF, even if not in object - Hide for YouTube videos AND web links */}
                  {!isYouTubeVideo && !isWebLink && !enhancedFile.total_pages && enhancedFile.doc_type?.toLowerCase().includes('pdf') && (
                    <div className="flex items-center gap-2">
                      <span className={textValueStyle}>11 pages</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Web Description */}
            {isWebLink && webMetadata?.description && (
              <div className="pt-6 border-t w-full">
                <div className="flex items-start gap-2">
                  <p className={`whitespace-pre-line ${textValueStyle}`}>{webMetadata.description}</p>
                </div>
              </div>
            )}
            
            {/* Summary */}
            {enhancedFile.doc_summary && (
              <div className="pt-6 border-t w-full">
                <div className="flex items-start gap-2">
                  <p className={`whitespace-pre-line ${textValueStyle}`}>{enhancedFile.doc_summary}</p>
                </div>
              </div>
            )}
            
            {/* Quick action buttons - Enhanced for web links */}
            <div className="pt-6 border-t w-full">
              <h3 className="text-sm font-medium mb-3">Quick Actions</h3>
              <div className="flex flex-wrap gap-2">
                {(isWebLink ? [
                  'Summarize this webpage',
                  'Extract Key Points', 
                  'Find Contacts',
                  'What are the main controversies or debates mentioned?',
                  'What methods were used in this research?',
                  'What are the practical implications?'
                ] : [
                  'What are the key points of this document?', 
                  'Summarize the main controversies or debates mentioned in this document.',
                  'What methods were used in this research?',
                  'What are the limitations of this study or document?',
                  'What are the practical implications of this document?',
                  'Generate 5 important questions to better understand this document.'
                ]).map((action, index) => (
                  <button 
                    key={index}
                    onClick={() => handleQuickAction(action, isWebLink ? 'Web Researcher' : undefined)}
                    className="text-left text-sm transition-colors text-[#232323]"
                    style={{
                      display: 'flex',
                      padding: '16px',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      gap: '12px',
                      alignSelf: 'stretch',
                      borderRadius: '8px',
                      border: '1px solid var(--Monochrome-Light, #E8E8E5)',
                      background: '#FFF',
                      boxShadow: '0px 15px 40px 0px rgba(203, 203, 203, 0.25)',
                      cursor: 'pointer'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.border = '1px solid var(--Monochrome-Light, #E8E8E5)';
                      e.currentTarget.style.background = 'var(--Monochrome-Light, #E8E8E5)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.border = '1px solid var(--Monochrome-Light, #E8E8E5)';
                      e.currentTarget.style.background = '#FFF';
                    }}
                  >
                    <div className="flex items-center w-full">
                      <PlusIcon className="h-4 w-4 mr-2 text-inherit" />
                      <span style={{
                        color: 'var(--Monochrome-Black, #232323)',
                        fontFamily: '"Aeonik Pro", sans-serif',
                        fontSize: '14px',
                        fontStyle: 'normal',
                        fontWeight: 400,
                        lineHeight: '20px'
                      }}>
                        {isWebLink ? (
                          action === 'Summarize this webpage' ? 'Summarize' :
                          action === 'Extract Key Points' ? 'Key Points' :
                          action === 'Find Contacts' ? 'Find Contacts' :
                          action === 'What are the main controversies or debates mentioned?' ? 'Controversies' :
                          action === 'What methods were used in this research?' ? 'Methods' :
                          action === 'What are the practical implications?' ? 'Implications' :
                          action
                        ) : (
                          action === 'What are the key points of this document?' ? 'Key Points' : 
                          action === 'Summarize the main controversies or debates mentioned in this document.' ? 'Controversies' :
                          action === 'What methods were used in this research?' ? 'Methods' :
                          action === 'What are the limitations of this study or document?' ? 'Limitations' :
                          action === 'What are the practical implications of this document?' ? 'Implications' :
                          action === 'Generate 5 important questions to better understand this document.' ? 'Generate Questions' : 
                          action
                        )}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 
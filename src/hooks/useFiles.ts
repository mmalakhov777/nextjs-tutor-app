import { useState } from 'react';
import type { UploadedFile } from '@/types/chat';

const getBackendUrl = () => {
  return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5002';
};

// Function to normalize URLs for comparison (same as in FileSidebar)
const normalizeUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    // Remove trailing slash, convert to lowercase, remove www
    let normalized = urlObj.href.toLowerCase().replace(/\/$/, '');
    normalized = normalized.replace(/^https?:\/\/www\./, urlObj.protocol + '//');
    return normalized;
  } catch {
    return url.toLowerCase().trim();
  }
};

// Function to check if a URL is already processed (same logic as FileSidebar)
const isUrlAlreadyProcessed = (url: string, uploadedFiles: UploadedFile[]): boolean => {
  const normalizedUrl = normalizeUrl(url);
  
  console.log(`[USEFILES DUPLICATE CHECK] Starting duplicate check for URL: ${url}`);
  console.log(`[USEFILES DUPLICATE CHECK] Normalized URL: ${normalizedUrl}`);
  
  // Check in current uploaded files
  const inUploadedFiles = uploadedFiles.some(file => {
    // Direct URL match
    if (file.url && normalizeUrl(file.url) === normalizedUrl) {
      console.log(`[USEFILES DUPLICATE CHECK] Found duplicate in uploadedFiles (direct URL match): ${file.url} -> ${file.name}`);
      return true;
    }
    
    // Check metadata for original_url
    if (file.metadata && typeof file.metadata === 'object') {
      const metadata = file.metadata as any;
      if (metadata.original_url && normalizeUrl(metadata.original_url) === normalizedUrl) {
        console.log(`[USEFILES DUPLICATE CHECK] Found duplicate in uploadedFiles (metadata.original_url): ${metadata.original_url} -> ${file.name}`);
        return true;
      }
      if (metadata.url && normalizeUrl(metadata.url) === normalizedUrl) {
        console.log(`[USEFILES DUPLICATE CHECK] Found duplicate in uploadedFiles (metadata.url): ${metadata.url} -> ${file.name}`);
        return true;
      }
    }
    
    // Check if it's a link source with matching URL
    if (file.source === 'link' && file.url && normalizeUrl(file.url) === normalizedUrl) {
      console.log(`[USEFILES DUPLICATE CHECK] Found duplicate in uploadedFiles (link source): ${file.url} -> ${file.name}`);
      return true;
    }
    
    return false;
  });
  
  console.log(`[USEFILES DUPLICATE CHECK] Found in uploadedFiles: ${inUploadedFiles}`);
  
  // Check in local storage for previously processed links
  let inLocalStorage = false;
  try {
    const storedMetadata = localStorage.getItem('uploadedFilesMetadata');
    if (storedMetadata) {
      const metadataObj = JSON.parse(storedMetadata);
      console.log(`[USEFILES DUPLICATE CHECK] Checking ${Object.keys(metadataObj).length} items in localStorage`);
      
      for (const [fileId, fileData] of Object.entries(metadataObj)) {
        const file = fileData as any;
        
        // Check direct URL match
        if (file.url && normalizeUrl(file.url) === normalizedUrl) {
          console.log(`[USEFILES DUPLICATE CHECK] Found duplicate in localStorage (direct URL): ${file.url} -> ${file.name} (ID: ${fileId})`);
          inLocalStorage = true;
          break;
        }
        
        // Check if it's a link source with matching URL
        if (file.source === 'link' && file.url && normalizeUrl(file.url) === normalizedUrl) {
          console.log(`[USEFILES DUPLICATE CHECK] Found duplicate in localStorage (link source): ${file.url} -> ${file.name} (ID: ${fileId})`);
          inLocalStorage = true;
          break;
        }
        
        // Check metadata if it exists
        if (file.metadata && typeof file.metadata === 'object') {
          const metadata = file.metadata;
          if (metadata.original_url && normalizeUrl(metadata.original_url) === normalizedUrl) {
            console.log(`[USEFILES DUPLICATE CHECK] Found duplicate in localStorage (metadata.original_url): ${metadata.original_url} -> ${file.name} (ID: ${fileId})`);
            inLocalStorage = true;
            break;
          }
          if (metadata.url && normalizeUrl(metadata.url) === normalizedUrl) {
            console.log(`[USEFILES DUPLICATE CHECK] Found duplicate in localStorage (metadata.url): ${metadata.url} -> ${file.name} (ID: ${fileId})`);
            inLocalStorage = true;
            break;
          }
        }
      }
    } else {
      console.log(`[USEFILES DUPLICATE CHECK] No localStorage metadata found`);
    }
  } catch (error) {
    console.error(`[USEFILES DUPLICATE CHECK] Error checking localStorage:`, error);
  }
  
  console.log(`[USEFILES DUPLICATE CHECK] Found in localStorage: ${inLocalStorage}`);
  
  // Additional check: look for the domain in file names (for edge cases)
  let domainInFiles = false;
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace(/^www\./, '');
    
    domainInFiles = uploadedFiles.some(file => {
      // Check if file name contains the domain (for web pages)
      if (file.source === 'link' && file.name && file.name.includes(domain)) {
        console.log(`[USEFILES DUPLICATE CHECK] Found duplicate by domain match in uploadedFiles: ${domain} in ${file.name}`);
        return true;
      }
      return false;
    });
    
    // Also check localStorage for domain matches
    if (!domainInFiles) {
      try {
        const storedMetadata = localStorage.getItem('uploadedFilesMetadata');
        if (storedMetadata) {
          const metadataObj = JSON.parse(storedMetadata);
          for (const [fileId, fileData] of Object.entries(metadataObj)) {
            const file = fileData as any;
            if (file.source === 'link' && file.name && file.name.includes(domain)) {
              console.log(`[USEFILES DUPLICATE CHECK] Found duplicate by domain match in localStorage: ${domain} in ${file.name} (ID: ${fileId})`);
              domainInFiles = true;
              break;
            }
          }
        }
      } catch (error) {
        console.error(`[USEFILES DUPLICATE CHECK] Error checking localStorage for domain matches:`, error);
      }
    }
  } catch {
    // Invalid URL, continue with other checks
    console.log(`[USEFILES DUPLICATE CHECK] Invalid URL for domain check: ${url}`);
  }
  
  console.log(`[USEFILES DUPLICATE CHECK] Found by domain match: ${domainInFiles}`);
  
  const result = inUploadedFiles || inLocalStorage || domainInFiles;
  
  console.log(`[USEFILES DUPLICATE CHECK] Final result for ${url}: ${result} (uploadedFiles: ${inUploadedFiles}, localStorage: ${inLocalStorage}, domain: ${domainInFiles})`);
  
  return result;
};

export function useFiles(userId: string | null, currentConversationId: string | null, showToast?: (type: 'success' | 'error' | 'warning' | 'info', message: string, title?: string) => void) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [defaultVectorStoreId, setDefaultVectorStoreId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null);

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    if (!file || !currentConversationId || !userId) {
      return false;
    }
    
    setIsUploadingFile(true);
    
    try {
      // Direct file upload to the /api/files endpoint
      const backendUrl = getBackendUrl();
      const formData = new FormData();
      formData.append('file', file);
      formData.append('vector_store_id', defaultVectorStoreId || '');
      formData.append('user_id', userId);
      formData.append('chat_session_id', currentConversationId);
      
      const uploadResponse = await fetch(`${backendUrl}/api/files`, {
        method: 'POST',
        body: formData,
      });
      
      if (!uploadResponse.ok) {
        throw new Error(`Failed to upload file: ${uploadResponse.status}`);
      }
      
      const fileData = await uploadResponse.json();
      
      // Add file to the UI
      const newFile: UploadedFile = {
        id: fileData.id,
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        uploadDate: new Date(),
        format: file.type?.split('/')[1] || file.name?.split('.').pop() || 'unknown',
        vectorStoreId: defaultVectorStoreId || '',
        status: fileData.status || 'completed',
        source: 'upload',
        doc_title: fileData.document?.title || '',
        doc_authors: fileData.document?.authors || [],
        doc_publication_year: fileData.document?.publication_year || '',
        doc_type: fileData.document?.type || '',
        doc_summary: fileData.document?.summary || '',
        total_pages: fileData.document?.total_pages || 0,
        processed_at: fileData.processed_at || '',
        metadata: fileData.metadata || {
          vector_store_file_status: fileData.status || 'completed'
        }
      };
      
      setUploadedFiles(prev => [newFile, ...prev]);
      
      return true;
    } catch (error) {
      console.error('Error uploading file:', error);
      return false;
    } finally {
      setIsUploadingFile(false);
    }
  };

  // Handle link submission
  const handleLinkSubmit = async (url: string) => {
    if (!url) {
      throw new Error('URL is required');
    }
    
    // Clean and validate the URL before processing
    const cleanedUrl = url.trim().replace(/\x00/g, '').replace(/[\x00-\x1F\x7F]/g, '');
    
    if (!cleanedUrl) {
      throw new Error('Invalid URL after cleaning');
    }
    
    // Check for NUL characters or other problematic characters
    if (cleanedUrl.includes('\x00') || /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(cleanedUrl)) {
      throw new Error('URL contains invalid characters');
    }
    
    // Validate URL format
    try {
      new URL(cleanedUrl);
    } catch (error) {
      throw new Error('Invalid URL format');
    }
    
    // Check for duplicates BEFORE processing
    console.log(`[USEFILES] Checking for duplicates before processing: ${cleanedUrl}`);
    if (isUrlAlreadyProcessed(cleanedUrl, uploadedFiles)) {
      console.log(`[USEFILES] DUPLICATE DETECTED - Silently ignoring submission: ${cleanedUrl}`);
      return true; // Return success to indicate the operation completed (silently)
    }
    console.log(`[USEFILES] No duplicates found, proceeding with processing: ${cleanedUrl}`);
    
    if (!currentConversationId || !userId) {
      throw new Error('No active conversation or user ID');
    }

    if (!defaultVectorStoreId) {
      throw new Error('No vector store available. Please create one first.');
    }
    
    setIsUploadingFile(true);
    
    try {
      // Real backend implementation
      const backendUrl = getBackendUrl();
      
      // Create the request body with cleaned URL
      const requestBody = {
        url: cleanedUrl,
        vector_store_id: defaultVectorStoreId,
        user_id: userId,
        chat_session_id: currentConversationId
      };
      
      // Log the request for debugging
      console.log('Submitting link request:', requestBody);
      
      const response = await fetch(`${backendUrl}/api/links`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        // Silent error handling - don't log to console to avoid breaking the app
        // console.error('Link submission failed:', {
        //   status: response.status,
        //   statusText: response.statusText,
        //   errorData,
        //   originalUrl: url,
        //   cleanedUrl: cleanedUrl
        // });
        throw new Error(`Failed to process link: ${response.status}${errorData ? ` - ${errorData}` : ''}`);
      }
      
      const linkData = await response.json();
      
      // Create a file-like object from the response
      const newFile: UploadedFile = {
        id: linkData.id,
        name: linkData.name || new URL(cleanedUrl).hostname,
        size: linkData.size || 0,
        type: linkData.type || 'text/html',
        uploadDate: new Date(),
        format: linkData.format || 'html',
        vectorStoreId: defaultVectorStoreId,
        status: linkData.status || 'processing',
        source: 'link',
        url: cleanedUrl,
        doc_title: linkData.document?.title || new URL(cleanedUrl).hostname,
        doc_authors: linkData.document?.authors || [],
        doc_publication_year: linkData.document?.publication_year || new Date().getFullYear(),
        doc_type: linkData.document?.type || 'webpage',
        doc_summary: linkData.document?.summary || '',
        total_pages: linkData.document?.total_pages || 0,
        processed_at: linkData.processed_at || '',
        metadata: linkData.metadata || {
          vector_store_file_status: linkData.status || 'processing'
        }
      };
      
      setUploadedFiles(prev => [newFile, ...prev]);
      
      console.log(`[USEFILES] Successfully processed and added: ${cleanedUrl}`);
      return true;
    } catch (error) {
      console.error('Error processing link:', error);
      
      // Check if this is a network error
      const isNetworkError = error instanceof TypeError && error.message.includes('fetch');
      
      // Enhance error message for network errors
      if (isNetworkError) {
        const networkError = new Error('Network error: Could not connect to server. Please check your internet connection and try again.');
        networkError.name = 'NetworkError';
        throw networkError;
      }
      
      throw error;
    } finally {
      setIsUploadingFile(false);
    }
  };

  // Handle file deletion
  const handleFileDeleted = async (fileId: string) => {
    if (!fileId) {
      return false;
    }
    
    try {
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/files/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete file: ${response.status}`);
      }
      
      // Update UI immediately
      setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
      
      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  };

  // Fetch files by vector store ID
  const fetchFilesByVectorStoreId = async (vectorStoreId: string) => {
    if (!vectorStoreId) {
      return;
    }
    
    setIsRefreshing(true);
    
    try {
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/files?vector_store_id=${encodeURIComponent(vectorStoreId)}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch files: ${response.status}`);
      }
      
      const data = await response.json();
      const fileList = Array.isArray(data) ? data : (data.files || []);
      
      if (fileList.length) {
        const files = fileList.map((file: any) => {
          return {
            id: file.id,
            name: file.name,
            size: parseInt(String(file.size), 10),
            type: file.type,
            uploadDate: new Date(file.created_at || file.upload_date || new Date()),
            format: file.type?.split('/')[1] || file.name?.split('.').pop() || 'unknown',
            vectorStoreId: file.vectorStoreId || vectorStoreId,
            status: file.metadata?.vector_store_file_status || 'completed',
            
            // Document metadata if available
            doc_title: file.document?.title || '',
            doc_authors: Array.isArray(file.document?.authors) ? file.document.authors : [],
            doc_publication_year: file.document?.publication_year || '',
            doc_type: file.document?.type || '',
            doc_summary: file.document?.summary || '',
            total_pages: file.document?.total_pages || 0,
            processed_at: file.processed_at || '',
            
            // Store all metadata for easier access
            metadata: {
              ...file.metadata,
              doc_title: file.document?.title,
              doc_authors: file.document?.authors,
              doc_publication_year: file.document?.publication_year,
              doc_type: file.document?.type,
              doc_summary: file.document?.summary,
              total_pages: file.document?.total_pages,
              processed_at: file.processed_at,
              vector_store_file_status: file.metadata?.vector_store_file_status || 'completed'
            }
          };
        });
        
        setUploadedFiles(files);
      } else {
        setUploadedFiles([]);
      }
    } catch (error) {
      console.error('Error fetching files:', error);
      
      // Check if this is a network error
      const isNetworkError = error instanceof TypeError && error.message.includes('fetch');
      
      // Only clear the file list for non-network errors
      // For network errors, keep the existing files to prevent the disappearing issue
      if (!isNetworkError) {
        setUploadedFiles([]);
      }
      
      // Show a toast notification for network errors
      if (isNetworkError && showToast) {
        showToast('error', 'Network error: Could not refresh files. Check your connection.', 'Connection Error');
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle refreshing files
  const handleRefreshFiles = () => {
    if (defaultVectorStoreId) {
      return fetchFilesByVectorStoreId(defaultVectorStoreId);
    }
    return { success: false, message: 'No vector store ID available' };
  };

  return {
    // State
    uploadedFiles,
    isUploadingFile,
    defaultVectorStoreId,
    isRefreshing,
    selectedFile,

    // State setters
    setUploadedFiles,
    setIsUploadingFile,
    setDefaultVectorStoreId,
    setIsRefreshing,
    setSelectedFile,

    // Handlers
    handleFileUpload,
    handleLinkSubmit,
    handleFileDeleted,
    handleRefreshFiles,
    fetchFilesByVectorStoreId
  };
} 
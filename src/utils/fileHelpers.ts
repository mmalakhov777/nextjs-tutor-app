import type { UploadedFile } from '@/types/chat';

// Helper function to get the backend URL
export const getBackendUrl = () => {
  return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5002';
};

// Helper function to check if a file format is supported
export const isFileFormatSupported = (fileName: string): boolean => {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  const supportedExtensions = [
    'pdf', 'txt', 'csv', 'json', 'jsonl',
    'py', 'js', 'ts', 'jsx', 'tsx', 'java', 'c', 'cpp', 'html', 'css', 'xml'
  ];
  return supportedExtensions.includes(extension);
};

// Helper function to save file metadata to local storage
export const saveFileMetadataToLocalStorage = (file: UploadedFile) => {
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
export const getFileMetadataFromLocalStorage = (fileId: string): Partial<UploadedFile> | null => {
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

// Helper function to remove file metadata from local storage
export const removeFileMetadataFromLocalStorage = (fileId: string): void => {
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

// Function to load and save file content after upload
export const loadAndSaveFileContent = async (fileId: string) => {
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

// Function to get document metadata
export const getDocumentMetadata = (file: UploadedFile) => {
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
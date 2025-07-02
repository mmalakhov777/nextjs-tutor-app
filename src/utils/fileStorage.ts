/**
 * Utility functions for storing and retrieving file metadata from localStorage
 */

import { UploadedFile } from '@/types/chat';

/**
 * Saves file metadata to local storage
 * @param file The file metadata to save
 */
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
      // Save file content if it exists
      file_content: file.file_content
    };
    
    // Save back to local storage
    localStorage.setItem('uploadedFilesMetadata', JSON.stringify(metadataObj));
  } catch (error) {
    console.error('Error saving file metadata to local storage:', error);
  }
};

/**
 * Retrieves file metadata from local storage
 * @param fileId The ID of the file to retrieve
 * @returns The file metadata or null if not found
 */
export const getFileMetadataFromLocalStorage = (fileId: string): Partial<UploadedFile> | null => {
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

/**
 * Removes a specific file's metadata from localStorage
 * @param fileId The ID of the file to remove
 */
export const removeFileMetadataFromLocalStorage = (fileId: string) => {
  try {
    const storedMetadata = localStorage.getItem('uploadedFilesMetadata');
    if (!storedMetadata) return;
    
    const metadataObj = JSON.parse(storedMetadata);
    
    // Remove the specific file's metadata
    delete metadataObj[fileId];
    
    // Save back to localStorage
    localStorage.setItem('uploadedFilesMetadata', JSON.stringify(metadataObj));
  } catch (error) {
    console.error('Error removing file metadata from localStorage:', error);
  }
};

/**
 * Removes all file-related metadata from localStorage (uploadedFilesMetadata, all fileMap_* keys, etc)
 */
export const clearAllFileMetadataFromStorage = () => {
  try {
    // Gather all keys to remove first
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (
        key === 'uploadedFilesMetadata' ||
        key.startsWith('fileMap_') ||
        key.startsWith('fileSidebarDebugLogs') // Add more prefixes if needed
      ) {
        keysToRemove.push(key);
      }
    }
    // Remove all gathered keys
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  } catch (error) {
    console.error('Error clearing file metadata from localStorage:', error);
  }
}; 
import { useState } from 'react';
import type { UploadedFile } from '@/types/chat';

const getBackendUrl = () => {
  return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5002';
};

export function useFiles(userId: string | null, currentConversationId: string | null) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [defaultVectorStoreId, setDefaultVectorStoreId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
      setUploadedFiles([]);
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

    // State setters
    setUploadedFiles,
    setIsUploadingFile,
    setDefaultVectorStoreId,
    setIsRefreshing,

    // Handlers
    handleFileUpload,
    handleFileDeleted,
    handleRefreshFiles,
    fetchFilesByVectorStoreId
  };
} 
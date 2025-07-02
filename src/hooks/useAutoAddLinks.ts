import { useEffect } from 'react';
import { 
  isNonVideoYouTubeUrl, 
  isYouTubeUrl, 
  extractUrlsFromText,
  isUrlAlreadyInSession,
  normalizeUrl
} from '@/utils/urlHelpers';
import type { UploadedFile } from '@/types/chat';
import type { FileUploadStatus } from '@/components/chat/cards';

interface UseAutoAddLinksProps {
  autoAddSources: boolean;
  defaultVectorStoreId: string | null;
  onLinkSubmit: ((url: string) => void | Promise<void>) | undefined;
  uploadedFiles: UploadedFile[];
  fileUploads: FileUploadStatus[];
  setFileUploads: React.Dispatch<React.SetStateAction<FileUploadStatus[]>>;
  onRefreshFiles?: () => void;
}

export const useAutoAddLinks = ({
  autoAddSources,
  defaultVectorStoreId,
  onLinkSubmit,
  uploadedFiles,
  fileUploads,
  setFileUploads,
  onRefreshFiles
}: UseAutoAddLinksProps) => {
  // Function to automatically add a link if auto add is enabled
  const autoAddLink = async (url: string) => {
    console.log(`[AUTO-ADD] Processing URL from assistant message: ${url}`);
    
    if (!autoAddSources || !defaultVectorStoreId || !onLinkSubmit) {
      console.log(`[AUTO-ADD] Skipping - auto-add disabled or missing dependencies:`, {
        autoAddSources,
        hasVectorStore: !!defaultVectorStoreId,
        hasOnLinkSubmit: !!onLinkSubmit
      });
      return;
    }

    // Check if it's a non-video YouTube URL and reject it
    if (isNonVideoYouTubeUrl(url)) {
      console.log(`[AUTO-ADD] Skipping non-video YouTube URL: ${url}`);
      return;
    }

    // First check if URL is already in session
    if (isUrlAlreadyInSession(url, uploadedFiles, fileUploads)) {
      console.log(`[AUTO-ADD] Skipping duplicate URL (found in session/localStorage): ${url}`);
      return;
    }

    // Check if we're at the file limit
    const totalCount = uploadedFiles.length + fileUploads.filter(upload => upload.status !== 'error').length;
    if (totalCount >= 50) {
      console.log(`[AUTO-ADD] Skipping - file limit reached (${totalCount}/50): ${url}`);
      return;
    }

    try {
      // Validate URL
      const urlObj = new URL(url);
      
      // FINAL SAFETY CHECK: Double-check if URL is already in session right before adding
      // This catches any race conditions or recent additions
      if (isUrlAlreadyInSession(url, uploadedFiles, fileUploads)) {
        console.log(`[AUTO-ADD] Skipping duplicate URL (final check): ${url}`);
        return;
      }
      
      console.log(`[AUTO-ADD] Adding URL to session: ${url}`);
      
      // Add link to uploads with uploading status
      const uploadId = Math.random().toString(36).substring(2, 11);
      const isYouTube = isYouTubeUrl(url);
      const domain = isYouTube ? 'YouTube Video' : urlObj.hostname;
      
      setFileUploads(prev => [
        ...prev, 
        {
          id: uploadId,
          name: domain,
          fileName: domain,
          status: 'uploading' as const,
          url: url,
          errorMessage: '',
          metadata: {
            source: 'auto_add'
          }
        }
      ]);

      try {
        // Call the onLinkSubmit function
        await onLinkSubmit(url);
        
        console.log(`[AUTO-ADD] Successfully submitted URL: ${url}`);
        
        // Update status to processing
        setFileUploads(prev => 
          prev.map(upload => 
            upload.id === uploadId 
              ? { ...upload, status: 'processing' } 
              : upload
          )
        );
        
      } catch (error) {
        console.error(`[AUTO-ADD] Error submitting URL: ${url}`, error);
        
        // Check if this is a network error (TypeError: Failed to fetch)
        const isNetworkError = error instanceof TypeError && error.message.includes('fetch');
        
        // Mark as error
        setFileUploads(prev => 
          prev.map(upload => 
            upload.id === uploadId 
              ? { 
                  ...upload, 
                  status: 'error',
                  errorMessage: isNetworkError 
                    ? 'Network error - check connection' 
                    : (error instanceof Error ? error.message : 'Failed to add link'),
                  metadata: {
                    ...upload.metadata,
                    isNetworkError: isNetworkError
                  }
                } 
              : upload
          )
        );
        
        // Don't trigger file refresh for network errors to avoid clearing the file list
        if (!isNetworkError && onRefreshFiles) {
          onRefreshFiles();
        }
        
        return; // Don't continue processing
      }
      
      // Only refresh files if the submission was successful
      if (onRefreshFiles) {
        onRefreshFiles();
      }
    } catch (error) {
      console.log(`[AUTO-ADD] Invalid URL, skipping: ${url}`, error);
    }
  };

  // Listen for new messages and auto-add links if enabled
  useEffect(() => {
    const handleNewMessage = (event: CustomEvent) => {
      const { content, role } = event.detail;
      
      console.log(`[AUTO-ADD] New message event received:`, { role, hasContent: !!content, autoAddSources });
      
      if (!autoAddSources) {
        console.log(`[AUTO-ADD] Auto-add sources is disabled, skipping`);
        return;
      }
      
      // ONLY process assistant messages, not user messages
      if (role !== 'assistant') {
        console.log(`[AUTO-ADD] Skipping ${role} message (only processing assistant messages)`);
        return;
      }
      
      if (typeof content === 'string') {
        const urls = extractUrlsFromText(content);
        console.log(`[AUTO-ADD] Found ${urls.length} URLs in assistant message:`, urls);
        
        urls.forEach(url => {
          // Add a small delay to avoid overwhelming the system
          setTimeout(() => autoAddLink(url), Math.random() * 1000);
        });
      }
    };

    // Listen for new messages
    window.addEventListener('new-message-added', handleNewMessage as EventListener);
    
    // Add debug command to window for testing
    if (typeof window !== 'undefined') {
      (window as any).testAutoAddSources = (testUrl: string = 'https://example.com', role: string = 'assistant') => {
        const testEvent = new CustomEvent('new-message-added', {
          detail: {
            content: `Check out this link: ${testUrl}`,
            role: role,
            timestamp: new Date()
          }
        });
        window.dispatchEvent(testEvent);
        return `Test event dispatched for ${role} message`;
      };
      
      // Add debug functions for local storage management
      (window as any).debugDuplicateDetection = {
        // Check if a URL is considered a duplicate
        checkUrl: (url: string) => {
          const result = isUrlAlreadyInSession(url, uploadedFiles, fileUploads);
          return result;
        },
        
        // List all URLs in localStorage
        listStoredUrls: () => {
          try {
            const storedMetadata = localStorage.getItem('uploadedFilesMetadata');
            if (!storedMetadata) {
              return [];
            }
            
            const metadataObj = JSON.parse(storedMetadata);
            const urls = Object.entries(metadataObj)
              .map(([id, data]: [string, any]) => ({
                id,
                name: data.name,
                url: data.url,
                source: data.source,
                status: data.status
              }))
              .filter(item => item.url);
            
            return urls;
          } catch (error) {
            return [];
          }
        },
        
        // Clear all localStorage metadata
        clearStorage: () => {
          try {
            localStorage.removeItem('uploadedFilesMetadata');
            return 'Storage cleared';
          } catch (error) {
            return 'Error clearing storage';
          }
        },
        
        // Remove specific URL from localStorage
        removeUrl: (url: string) => {
          try {
            const storedMetadata = localStorage.getItem('uploadedFilesMetadata');
            if (!storedMetadata) {
              return 'No metadata found';
            }
            
            const metadataObj = JSON.parse(storedMetadata);
            let removed = false;
            
            for (const [id, data] of Object.entries(metadataObj)) {
              const file = data as any;
              if (file.url && normalizeUrl(file.url) === normalizeUrl(url)) {
                delete metadataObj[id];
                removed = true;
              }
            }
            
            if (removed) {
              localStorage.setItem('uploadedFilesMetadata', JSON.stringify(metadataObj));
              return `Removed ${url} from storage`;
            } else {
              return 'URL not found';
            }
          } catch (error) {
            return 'Error removing URL';
          }
        }
      };
    }
    
    return () => {
      window.removeEventListener('new-message-added', handleNewMessage as EventListener);
      if (typeof window !== 'undefined') {
        delete (window as any).testAutoAddSources;
        delete (window as any).debugDuplicateDetection;
      }
    };
  }, [autoAddSources, defaultVectorStoreId, onLinkSubmit, uploadedFiles, fileUploads]);
}; 
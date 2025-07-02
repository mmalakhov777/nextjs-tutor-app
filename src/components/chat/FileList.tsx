import React from 'react';
import type { UploadedFile } from '@/types/chat';
import {
  FileCard,
  WebpageCard,
  YouTubeCard,
  UploadingFileCard,
  UploadingWebpageCard,
  UploadingYouTubeCard,
  type FileUploadStatus
} from './cards';
import { isYouTubeUrl } from '@/utils/urlHelpers';
import { removeFileMetadataFromLocalStorage } from '@/utils/fileHelpers';

interface FileListProps {
  uploadedFiles: UploadedFile[];
  fileUploads: FileUploadStatus[];
  isDeletingFile: string | null;
  setIsDeletingFile: (fileId: string | null) => void;
  onFileDeleted?: (fileId: string) => void | Promise<void>;
  onFileSelect: (file: UploadedFile) => void;
  removeUpload: (uploadId: string) => void;
}

export const FileList: React.FC<FileListProps> = ({
  uploadedFiles,
  fileUploads,
  isDeletingFile,
  setIsDeletingFile,
  onFileDeleted,
  onFileSelect,
  removeUpload
}) => {
  // Define proper types for the combined array
  type CombinedFile = 
    | { isUpload: true; upload: FileUploadStatus; file?: never }
    | { isUpload: false; file: UploadedFile; upload?: never };
    
  // Create a set of file names that exist in uploadedFiles
  const uploadedFileNames = new Set(uploadedFiles.map(file => file.name));
  
  // Create a set of URLs from uploadedFiles to check for duplicates
  const uploadedFileUrls = new Set(
    uploadedFiles
      .filter(file => file.source === 'link' && file.url)
      .map(file => file.url)
  );
  
  // Filter temporary uploads more carefully
  const filteredUploads = fileUploads.filter(upload => {
    // Skip error uploads altogether - never show them
    if (upload.status === 'error') {
      return false;
    }
    
    // Always filter out temporary uploads if their URL exists in completed files
    if (upload.url && uploadedFileUrls.has(upload.url)) {
      return false; // Skip this temporary upload as we already have a completed entry
    }

    // Check if a corresponding completed file with metadata exists in the main list
    const correspondingCompletedFile = uploadedFiles.find(f => 
      (f.name === upload.fileName || (upload.url && f.url === upload.url)) && 
      f.status === 'completed' &&
      Boolean(
        (f.doc_title && f.doc_title.trim() !== '') || 
        (Array.isArray(f.doc_authors) && f.doc_authors.length > 0) || 
        f.doc_publication_year || 
        (f.doc_type && f.doc_type.trim() !== '') || 
        (f.doc_summary && f.doc_summary.trim() !== '') || 
        (f.total_pages && f.total_pages > 0) ||
        f.source === 'link'
      )
    );

    if (correspondingCompletedFile) {
      return false; // Skip this upload as we have a completed version
    }

    // Keep uploading/processing items ONLY if not yet in uploadedFiles
    if ((upload.status === 'uploading' || upload.status === 'processing') && 
        !uploadedFileNames.has(upload.fileName) && 
        !correspondingCompletedFile) {
      return true;
    }
    
    // Filter out everything else
    return false;
  });
  
  // Combine filtered temporary uploads with ALL uploaded files (filtering will happen inline)
  const combinedFiles: CombinedFile[] = [
    ...filteredUploads.map(upload => ({ 
      isUpload: true as const, 
      upload 
    })),
    ...uploadedFiles.map(file => ({ // Use uploadedFiles directly here
      isUpload: false as const, 
      file 
    }))
  ];
  
  // Sort files: processed files first, then YouTube files first within each group
  combinedFiles.sort((a, b) => {
    // Helper function to get status
    const getStatus = (item: CombinedFile) => {
      if (item.isUpload) {
        return item.upload.status;
      } else {
        return item.file.status || 'unknown';
      }
    };
    
    // Helper function to check if item is YouTube
    const isYouTube = (item: CombinedFile) => {
      if (item.isUpload) {
        return item.upload.url && isYouTubeUrl(item.upload.url);
      } else {
        return (item.file.source === 'link' && item.file.url && isYouTubeUrl(item.file.url)) || 
               item.file.doc_type?.toLowerCase() === 'youtube_video';
      }
    };
    
    const statusA = getStatus(a);
    const statusB = getStatus(b);
    const isYouTubeA = isYouTube(a);
    const isYouTubeB = isYouTube(b);
    
    // Define status priority (lower number = higher priority)
    const getStatusPriority = (status: string) => {
      switch (status) {
        case 'completed': return 1;
        case 'processing': return 2;
        case 'pending': return 3;
        case 'uploading': return 4;
        case 'error': return 5;
        default: return 6;
      }
    };
    
    const priorityA = getStatusPriority(statusA);
    const priorityB = getStatusPriority(statusB);
    
    // First sort by status priority
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    
    // Within same status, YouTube files come first
    if (isYouTubeA && !isYouTubeB) {
      return -1;
    }
    if (!isYouTubeA && isYouTubeB) {
      return 1;
    }
    
    // If both are same type and status, maintain original order
    return 0;
  });
  
  if (combinedFiles.length === 0 && filteredUploads.length === 0) return null;
  
  return (
    <div className="mt-3 sm:mt-4">
      <div className="space-y-3 w-full">
        {combinedFiles.map((item) => {
          // Handle uploading file cards
          if (item.isUpload) {
            const upload = item.upload;
            
            // YouTube card for YouTube links
            if (upload.url && isYouTubeUrl(upload.url)) {
              return (
                <UploadingYouTubeCard
                  key={`upload-${upload.id}`}
                  upload={upload}
                  onRemove={removeUpload}
                />
              );
            }
            
            // Webpage card for other links
            if (upload.url) {
              return (
                <UploadingWebpageCard
                  key={`upload-${upload.id}`}
                  upload={upload}
                  onRemove={removeUpload}
                />
              );
            }
            
            // Default file card for file uploads
            return (
              <UploadingFileCard
                key={`upload-${upload.id}`}
                upload={upload}
                onRemove={removeUpload}
              />
            );
          } else {
            // This is an uploaded file - Apply filtering LOGIC HERE
            const file = item.file;

            // --- START INLINE FILTER --- 
            let shouldRender = false;

            // Explicitly define allowed statuses before metadata check
            const allowedStatuses: Array<string | undefined> = ['processing', 'pending', 'completed'];

            // Filter out anything not in the allowed statuses immediately
            if (!allowedStatuses.includes(file.status)) {
              shouldRender = false; // Ensure it's false if status is invalid/undefined/error etc.
            } else {
              // Only proceed with checks if status is potentially valid
              // Condition 1: Keep processing or pending files
              if (file.status === 'processing' || file.status === 'pending') {
                shouldRender = true;
              }
              // Condition 2: For completed files, check metadata strictly
              else if (file.status === 'completed') {
                const hasMetadata = Boolean(
                  (file.doc_title && file.doc_title.trim() !== '') || 
                  (Array.isArray(file.doc_authors) && file.doc_authors.length > 0) || 
                  file.doc_publication_year || 
                  (file.doc_type && file.doc_type.trim() !== '') || 
                  (file.doc_summary && file.doc_summary.trim() !== '') || 
                  (file.total_pages && file.total_pages > 0) ||
                  file.source === 'link' // Always keep links
                );
                shouldRender = hasMetadata;
              }
            }

            if (!shouldRender) {
              return null; // Don't render this file if it doesn't meet the criteria
            }

            // Handle YouTube video links
            if ((file.source === 'link' && file.url && isYouTubeUrl(file.url)) || 
                file.doc_type?.toLowerCase() === 'youtube_video') {
              return (
                <YouTubeCard
                  key={file.id}
                  file={file}
                  onDelete={(fileId) => {
                    setIsDeletingFile(fileId);
                    removeFileMetadataFromLocalStorage(fileId);
                    const result = onFileDeleted?.(fileId);
                    if (result && typeof (result as any).then === 'function') {
                      (result as Promise<any>).finally(() => {
                        setIsDeletingFile(null);
                      });
                    } else {
                      setTimeout(() => setIsDeletingFile(null), 500);
                    }
                  }}
                  onSelect={onFileSelect}
                  isDeletingFile={isDeletingFile}
                />
              );
            }
            
            // Handle regular web links - Fix webpage detection logic
            if ((file.source === 'link' && (!file.url || !isYouTubeUrl(file.url))) ||
                file.doc_type?.toLowerCase() === 'webpage') {
              return (
                <WebpageCard
                  key={file.id}
                  file={file}
                  onDelete={(fileId) => {
                    setIsDeletingFile(fileId);
                    removeFileMetadataFromLocalStorage(fileId);
                    const result = onFileDeleted?.(fileId);
                    if (result && typeof (result as any).then === 'function') {
                      (result as Promise<any>).finally(() => {
                        setIsDeletingFile(null);
                      });
                    } else {
                      setTimeout(() => setIsDeletingFile(null), 500);
                    }
                  }}
                  onSelect={onFileSelect}
                  isDeletingFile={isDeletingFile}
                />
              );
            }
            
            // Default file card for regular files
            return (
              <FileCard
                key={file.id}
                file={file}
                onDelete={(fileId) => {
                  setIsDeletingFile(fileId);
                  removeFileMetadataFromLocalStorage(fileId);
                  const result = onFileDeleted?.(fileId);
                  if (result && typeof (result as any).then === 'function') {
                    (result as Promise<any>).finally(() => {
                      setIsDeletingFile(null);
                    });
                  } else {
                    setTimeout(() => setIsDeletingFile(null), 500);
                  }
                }}
                onSelect={onFileSelect}
                isDeletingFile={isDeletingFile}
              />
            );
          }
        })}
      </div>
    </div>
  );
}; 
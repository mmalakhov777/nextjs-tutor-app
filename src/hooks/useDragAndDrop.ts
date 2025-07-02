import { useEffect, RefObject } from 'react';

interface UseDragAndDropProps {
  dropAreaRef: RefObject<HTMLDivElement | null>;
  isDragging: boolean;
  setIsDragging: (dragging: boolean) => void;
  isLinkMode: boolean;
  handleMultipleFileUpload: (files: File[]) => void;
}

export const useDragAndDrop = ({
  dropAreaRef,
  isDragging,
  setIsDragging,
  isLinkMode,
  handleMultipleFileUpload
}: UseDragAndDropProps) => {
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

    // Add global handlers to allow dragging from anywhere on the page
    const handleDocumentDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDocumentDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    // Add global handlers to prevent browser default behavior
    document.addEventListener('dragover', handleDocumentDragOver);
    document.addEventListener('drop', handleDocumentDrop);

    // Apply handlers to specific drop area
    const dropArea = dropAreaRef.current;
    if (dropArea && !isLinkMode) {
      dropArea.addEventListener('dragover', handleDragOver);
      dropArea.addEventListener('dragenter', handleDragEnter);
      dropArea.addEventListener('dragleave', handleDragLeave);
      dropArea.addEventListener('drop', handleDrop);
    }

    return () => {
      // Clean up all event listeners
      document.removeEventListener('dragover', handleDocumentDragOver);
      document.removeEventListener('drop', handleDocumentDrop);
      
      if (dropArea) {
        dropArea.removeEventListener('dragover', handleDragOver);
        dropArea.removeEventListener('dragenter', handleDragEnter);
        dropArea.removeEventListener('dragleave', handleDragLeave);
        dropArea.removeEventListener('drop', handleDrop);
      }
    };
  }, [isDragging, isLinkMode, dropAreaRef, setIsDragging, handleMultipleFileUpload]);
}; 
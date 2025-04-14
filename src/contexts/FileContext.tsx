"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import type { UploadedFile } from '@/types/chat';

type FileContextType = {
  uploadedFiles: UploadedFile[];
  selectedFile: UploadedFile | null;
  setUploadedFiles: (files: UploadedFile[]) => void;
  setSelectedFile: (file: UploadedFile | null) => void;
  getFileMetadataFromLocalStorage: (fileId: string) => Partial<UploadedFile> | null;
};

const defaultValue: FileContextType = {
  uploadedFiles: [],
  selectedFile: null,
  setUploadedFiles: () => {},
  setSelectedFile: () => {},
  getFileMetadataFromLocalStorage: () => null,
};

const FileContext = createContext<FileContextType>(defaultValue);

export const useFileContext = () => useContext(FileContext);

export const FileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null);

  // Helper function to get file metadata from local storage
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

  // Load saved files metadata from localStorage on initial mount
  useEffect(() => {
    try {
      const storedMetadata = localStorage.getItem('uploadedFilesMetadata');
      if (storedMetadata) {
        const metadataObj = JSON.parse(storedMetadata);
        // We don't set uploadedFiles here because that should come from the parent component
        // This just prepares the context to work with the data
      }
    } catch (error) {
      console.error('Error loading file metadata from local storage:', error);
    }
  }, []);

  return (
    <FileContext.Provider
      value={{
        uploadedFiles,
        selectedFile,
        setUploadedFiles,
        setSelectedFile,
        getFileMetadataFromLocalStorage,
      }}
    >
      {children}
    </FileContext.Provider>
  );
}; 
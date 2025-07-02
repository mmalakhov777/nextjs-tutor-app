import React, { RefObject } from 'react';
import { Upload, Link, ChevronUp, CheckCircle2 } from 'lucide-react';

interface UploadAreaProps {
  uploadedFiles: any[];
  fileUploads: any[];
  isUploadAreaExpanded: boolean;
  setIsUploadAreaExpanded: (expanded: boolean) => void;
  hasUserManuallyExpanded: boolean;
  setHasUserManuallyExpanded: (expanded: boolean) => void;
  dropAreaRef: RefObject<HTMLDivElement | null>;
  defaultVectorStoreId: string | null;
  isDragging: boolean;
  isLinkMode: boolean;
  setIsLinkMode: (mode: boolean) => void;
  linkUrl: string;
  setLinkUrl: (url: string) => void;
  linkTempState: { isAdded: boolean; url: string };
  handleLinkSubmit: () => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
  handleFileButtonClick: () => void;
  handleMultipleFileUpload: (files: File[]) => void;
  autoAddSources: boolean;
  setAutoAddSources: (enabled: boolean) => void;
}

export const UploadArea: React.FC<UploadAreaProps> = ({
  uploadedFiles,
  fileUploads,
  isUploadAreaExpanded,
  setIsUploadAreaExpanded,
  hasUserManuallyExpanded,
  setHasUserManuallyExpanded,
  dropAreaRef,
  defaultVectorStoreId,
  isDragging,
  isLinkMode,
  setIsLinkMode,
  linkUrl,
  setLinkUrl,
  linkTempState,
  handleLinkSubmit,
  fileInputRef,
  handleFileButtonClick,
  handleMultipleFileUpload,
  autoAddSources,
  setAutoAddSources
}) => {
  const hasFiles = uploadedFiles.length > 0 || fileUploads.filter(upload => upload.status !== 'error').length > 0;

  return (
    <div className="space-y-3">
      {/* Upload area - always expanded when no files, collapsible when files exist */}
      <div 
        ref={dropAreaRef}
        className={`
          relative overflow-hidden rounded-[16px]
          flex flex-col
          transition-all duration-300 ease-in-out
          ${!defaultVectorStoreId ? 'cursor-not-allowed opacity-60' : ''}
          ${isDragging ? 'border-primary border-2' : ''}
        `}
        style={{ 
          border: isDragging ? '2px dashed var(--primary)' : '1px dashed var(--normal)',
          background: 'var(--ultralight)',
          transition: 'border 0.2s ease-in-out'
        }}
      >
        {/* Collapse/Expand button - only shown when files exist */}
        {hasFiles && (
          <div 
            className="flex items-center justify-between p-3 cursor-pointer hover:bg-superlight transition-colors"
            onClick={() => {
              const newExpandedState = !isUploadAreaExpanded;
              setIsUploadAreaExpanded(newExpandedState);
              // Track manual expansion - set to true when expanding, false when collapsing
              setHasUserManuallyExpanded(newExpandedState);
            }}
          >
            <span className="text-sm font-medium text-foreground">Add more files</span>
            <ChevronUp 
              className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                isUploadAreaExpanded ? 'rotate-180' : ''
              }`} 
            />
          </div>
        )}

        {/* Main upload content - always shown when no files, collapsible when files exist */}
        {(!hasFiles || isUploadAreaExpanded) && (
          <div className="p-6 flex flex-col items-center justify-center text-center">
            {/* Toggle between file upload and link input */}
            <div className="flex w-full mb-4 border-b border-light">
              <button 
                className={`flex-1 py-2 px-1 text-sm font-medium flex items-center justify-center gap-1 transition-colors
                  ${isLinkMode 
                    ? 'text-muted-foreground hover:text-foreground' 
                    : 'text-foreground border-b-2 border-primary'}
                `}
                onClick={() => setIsLinkMode(false)}
                disabled={!defaultVectorStoreId}
              >
                <Upload className="h-4 w-4" />
                <span>File</span>
              </button>
              <button 
                className={`flex-1 py-2 px-1 text-sm font-medium flex items-center justify-center gap-1 transition-colors
                  ${isLinkMode 
                    ? 'text-foreground border-b-2 border-primary' 
                    : 'text-muted-foreground hover:text-foreground'}
                `}
                onClick={() => setIsLinkMode(true)}
                disabled={!defaultVectorStoreId}
              >
                <Link className="h-4 w-4" />
                <span>Link</span>
              </button>
            </div>

            {isLinkMode ? (
              <>
                <h3 className="text-base font-medium text-foreground mb-2">
                  Add a link
                </h3>
                
                <p className="text-sm text-muted-foreground mb-3">
                  Enter a URL to analyze
                </p>
                
                <div className="w-full mb-2">
                  <input
                    type="url"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full p-2 text-sm border border-light rounded-md"
                    disabled={!defaultVectorStoreId}
                  />
                </div>
                <button 
                  className="
                    w-full flex justify-center items-center gap-1 py-3 px-4
                    rounded-[8px] border border-light
                    text-foreground text-sm font-medium
                    transition-colors duration-200 ease-in-out
                    disabled:opacity-70 disabled:cursor-not-allowed
                  "
                  style={{ background: 'var(--superlight)' }}
                  disabled={!defaultVectorStoreId || !linkUrl}
                  onClick={handleLinkSubmit}
                >
                  {linkTempState.isAdded ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" strokeWidth={2} />
                  ) : (
                    <Link className="h-4 w-4" strokeWidth={2} />
                  )}
                  <span>
                    {linkTempState.isAdded ? 'Added!' : 'Submit Link'}
                  </span>
                </button>
                
                <div className="mt-4 text-xs text-muted-foreground/70">
                  webpages will be processed as text content
                </div>
              </>
            ) : (
              <>
                <input 
                  type="file"
                  onChange={(e) => {
                    if (e.target.files?.length) {
                      // Convert FileList to array for multiple uploads
                      const files = Array.from(e.target.files);
                      handleMultipleFileUpload(files);
                    }
                  }}
                  className="hidden"
                  id="file-upload"
                  multiple
                  accept=".pdf,.txt,.csv,.json,.jsonl,.py,.js,.ts,.jsx,.tsx,.java,.c,.cpp,.html,.css,.xml"
                  ref={fileInputRef}
                />
                
                <div 
                  className="w-full flex flex-col items-center justify-center text-center"
                  style={{ 
                    background: 'var(--ultralight)'
                  }}
                  onClick={defaultVectorStoreId && fileUploads.length === 0 ? handleFileButtonClick : undefined}
                >            
                  <h3 className="text-base font-medium text-foreground mb-2 flex items-center gap-2">
                    Drop your files here
                  </h3>
                  
                  <p className="text-sm text-muted-foreground mb-3">
                    or browse from your computer
                  </p>
                  
                  <button 
                    className="
                      w-full flex justify-center items-center gap-1 py-3 px-4
                      rounded-[8px] border border-light
                      text-foreground text-sm font-medium
                      transition-colors duration-200 ease-in-out
                      disabled:opacity-70 disabled:cursor-not-allowed
                    "
                    style={{ background: 'var(--superlight)' }}
                    disabled={!defaultVectorStoreId || fileUploads.length > 0}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFileButtonClick();
                    }}
                  >
                    <Upload className="h-4 w-4" strokeWidth={2} />
                    <span>Select Files</span>
                  </button>
                  
                  <div className="mt-4 text-xs text-muted-foreground/70">
                    Only PDF, TXT, CSV, JSON, and code files are supported
                  </div>
                </div>
              </>
            )}
            
            {/* Auto Add Sources Toggle - now shown in both tabs */}
            <div className="mt-4 flex items-center justify-center gap-2">
              <span className="text-xs text-muted-foreground">Auto add sources</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setAutoAddSources(!autoAddSources);
                }}
                className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
                  autoAddSources ? 'bg-primary' : 'bg-gray-300'
                }`}
                disabled={!defaultVectorStoreId}
              >
                <span
                  className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-transform ${
                    autoAddSources ? 'translate-x-3.5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 
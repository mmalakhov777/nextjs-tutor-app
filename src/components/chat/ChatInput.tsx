"use client";

import { useRef, useEffect, useState } from 'react';
import { Send, Loader2, Square, File } from 'lucide-react';
import type { ChatInputProps, UploadedFile } from '@/types/chat';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { DotsIcon } from '@/components/icons/DotsIcon';
import { MicrophoneIcon } from '@/components/icons/MicrophoneIcon';
import { cn } from '@/lib/utils';
import { blobToBase64 } from '@/utils/audioUtils';
import { speechToText } from '@/services/audioService';
import { toast } from 'react-hot-toast';
import { FeedbackModal } from './FeedbackModal';
import { useFileContext } from '@/contexts/FileContext';

// Add this function to extract the file IDs from the message
const extractFileMentions = (message: string): string[] => {
  const fileRegex = /@\[file-([a-zA-Z0-9-_]+):[^\]]+\]/g;
  const matches = message.match(fileRegex);
  
  if (!matches) return [];
  
  return matches.map(match => {
    // Extract the file ID from the match
    const idMatch = match.match(/@\[file-([a-zA-Z0-9-_]+):/);
    return idMatch ? idMatch[1] : '';
  }).filter(Boolean);
};

export function ChatInput({
  value,
  onChange,
  onSend,
  disabled
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  
  // File mention state
  const [showFileMention, setShowFileMention] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [cursorPosition, setCursorPosition] = useState(0);
  const { uploadedFiles, getFileMetadataFromLocalStorage } = useFileContext();
  
  // MediaRecorder references
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  // Add state for keyboard navigation
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  
  // Filter files based on search term
  const filteredFiles = uploadedFiles.filter(file => 
    file.name.toLowerCase().includes(mentionSearch.toLowerCase())
  );

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [value]);

  // Handle keyboard navigation in dropdown
  const handleDropdownKeyNavigation = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showFileMention || filteredFiles.length === 0) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedFileIndex(prev => 
          prev < filteredFiles.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedFileIndex(prev => prev > 0 ? prev - 1 : 0);
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredFiles[selectedFileIndex]) {
          insertFileMention(filteredFiles[selectedFileIndex]);
        }
        break;
      case 'Tab':
        e.preventDefault();
        if (filteredFiles[selectedFileIndex]) {
          insertFileMention(filteredFiles[selectedFileIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowFileMention(false);
        break;
      default:
        break;
    }
  };
  
  // Reset selected index when dropdown opens or filtered files change
  useEffect(() => {
    if (showFileMention) {
      setSelectedFileIndex(0);
    }
  }, [showFileMention, mentionSearch]);
  
  // Debug useEffect to monitor dropdown state
  useEffect(() => {
    // Remove all console.log statements
  }, [showFileMention, filteredFiles.length]);

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showFileMention) {
      // Let the dropdown navigation handler manage keyboard events
      handleDropdownKeyNavigation(e);
      return;
    }
    
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else if (e.key === '@') {
      // Show file mention dropdown when '@' is typed
      handleAtSymbol();
    } else if (e.key === 'Escape') {
      // Close the mention dropdown on Escape
      setShowFileMention(false);
    }
  };
  
  // Function to toggle file mention dropdown
  const handleAtSymbol = () => {
    if (textareaRef.current) {
      // Get current cursor position
      const cursorPos = textareaRef.current.selectionStart || 0;
      setCursorPosition(cursorPos);
      
      // Get the position for the dropdown
      const textarea = textareaRef.current;
      const rect = textarea.getBoundingClientRect();
      
      // Calculate approximate position
      // For simplicity, we'll position it at the cursor's line
      const textBeforeCursor = value.substring(0, cursorPos);
      const linesBeforeCursor = textBeforeCursor.split('\n');
      const lineIndex = linesBeforeCursor.length - 1;
      const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 18;
      
      // Calculate left position: textarea left + approximate character width * chars in last line
      const charWidth = 8; // Approximate character width in pixels
      const lastLineLength = linesBeforeCursor[lineIndex].length;
      const left = rect.left + window.scrollX + (charWidth * lastLineLength) + 5;
      
      // MODIFIED: Calculate top position to place dropdown ABOVE the cursor
      // Estimate the dropdown height based on number of files (capped at reasonable height)
      const estimatedDropdownHeight = Math.min(uploadedFiles.length * 40 + 50, 250);
      // Position above current line: textarea top + line height * current line - dropdown height
      let top = rect.top + window.scrollY + (lineHeight * lineIndex) - estimatedDropdownHeight;
      
      // Check if the dropdown would go off the top of the screen
      if (top < window.scrollY + 10) {
        // If it would go off-screen, position it below the cursor instead
        top = rect.top + window.scrollY + (lineHeight * lineIndex) + 25;
      }
      
      setMentionPosition({ top, left });
    }
    
    // Reset the search term when opening
    setMentionSearch('');
    
    // Show the dropdown
    setShowFileMention(true);
  };
  
  // Handle input change and track @ symbol
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    setCursorPosition(cursorPos);
    
    // Get the text before the cursor
    const textBeforeCursor = newValue.substring(0, cursorPos);
    const atSignIndex = textBeforeCursor.lastIndexOf('@');
    
    // Check if we're in a mention context (after @ but before space or closing bracket)
    if (atSignIndex !== -1 && 
        !textBeforeCursor.substring(atSignIndex).includes(' ') && 
        !textBeforeCursor.substring(atSignIndex).includes(']')) {
      const searchTerm = textBeforeCursor.substring(atSignIndex + 1);
      setMentionSearch(searchTerm);
      
      if (!showFileMention) {
        handleAtSymbol();
      }
    } else {
      // If there's no @ before the cursor or there's a space after @, close the mention dropdown
      setShowFileMention(false);
    }
    
    onChange(newValue);
  };
  
  // Insert file mention at cursor position
  const insertFileMention = (file: UploadedFile) => {
    if (textareaRef.current) {
      const cursorPos = textareaRef.current.selectionStart || 0;
      const textBeforeCursor = value.substring(0, cursorPos);
      const textAfterCursor = value.substring(cursorPos);
      
      // Find the position of the '@' character before cursor
      const atSignIndex = textBeforeCursor.lastIndexOf('@');
      
      if (atSignIndex !== -1) {
        // Use document title if available, otherwise use filename
        const displayName = file.doc_title || file.name;
        
        // Replace @mention with @display_name (but store the ID in a hidden format)
        const newText = 
          textBeforeCursor.substring(0, atSignIndex) + 
          `@${displayName} ` + 
          textAfterCursor;
        
        // Store the actual file reference mapping separately
        const fileRef = `@[file-${file.id}:${file.name}]`;
        
        // Instead of inserting the full reference, we insert just the filename
        onChange(newText);
        
        // Store the mapping internally (we'd need to add this state)
        // For now, we'll use a simple replacement approach
        
        // Set cursor position after the inserted mention
        const newCursorPos = atSignIndex + `@${displayName} `.length;
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
          }
        }, 0);
      }
      
      setShowFileMention(false);
    }
  };
  
  // Start recording
  const startRecording = async () => {
    try {
      let mimeType = null;
      const supportedMimeTypes = [
        'audio/mp4',  // Most compatible with Safari
        'audio/mpeg', // MP3 format
        'audio/wav',  // Uncompressed but widely supported
      ];

      for (const type of supportedMimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          break;
        }
      }

      if (!mimeType) {
        throw new Error('No supported audio format found');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
        }
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000
      });

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        
        try {
          setIsTranscribing(true);
          const text = await speechToText(audioBlob);
          if (text) {
            onChange(text);
            setIsRecording(false);
            setIsTranscribing(false);
          }
        } catch (error) {
          toast.error('Failed to process audio. Please try again.');
          setIsRecording(false);
          setIsTranscribing(false);
        }
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100);
      setIsRecording(true);
      onChange('');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setRecordingError('Failed to start recording: ' + errorMessage);
    }
  };
  
  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };
  
  // Handle recording toggle
  const toggleRecording = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      await startRecording();
    }
  };
  
  // Cleanup
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  // Modify the send function to include file metadata
  const handleSend = () => {
    // Get the file references by matching @filename patterns
    const fileMentions = value.match(/@([^@\s]+)/g) || [];
    
    // Convert these simple mentions to proper file references
    let processedMessage = value;
    
    // For each mentioned file name or title, find the matching file and convert to proper format
    fileMentions.forEach((mention) => {
      const displayName = mention.substring(1); // Remove @ symbol
      // Check for matches by document title first, then by filename
      const matchingFile = uploadedFiles.find(file => 
        (file.doc_title && file.doc_title === displayName) || file.name === displayName
      );
      
      if (matchingFile) {
        // Replace @displayName with @[file-id:filename]
        const regex = new RegExp(`@${displayName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s`, 'g');
        processedMessage = processedMessage.replace(regex, `@[file-${matchingFile.id}:${matchingFile.name}] `);
      }
    });
    
    // Extract file IDs from the processed message
    const fileIds = extractFileMentions(processedMessage);
    
    // Check if there are specific file mentions in the message
    const hasSpecificFileMentions = fileIds.length > 0;
    
    // If no specific files are mentioned, include metadata for ALL files
    const preparedMessage = hasSpecificFileMentions 
      ? prepareMessageWithFiles(processedMessage, fileIds)
      : prepareMessageWithAllFiles(processedMessage);
    
    // Send the prepared message
    onSend(preparedMessage);
  };

  // Function to prepare the message with metadata for specifically mentioned files
  const prepareMessageWithFiles = (message: string, fileIds: string[]): string => {
    // If no files are mentioned, don't add any metadata
    if (fileIds.length === 0) {
      return message;
    }
    
    // ONLY include metadata for files that are mentioned in the message
    const mentionedFilesMetadata = fileIds.map(fileId => {
      // Find the file in uploadedFiles
      const file = uploadedFiles.find(f => f.id === fileId);
      if (!file) return null;
      
      // Get additional metadata from localStorage
      const metadata = getFileMetadataFromLocalStorage(fileId);
      
      // Return only the metadata for this mentioned file
      return {
        id: fileId,
        name: file.name || 'Unknown file',
        type: file.doc_type || 'Unknown',
        summary: file.doc_summary || 'No summary available',
        url: file.url,
        source: file.source,
        doc_title: file.doc_title,
        doc_authors: file.doc_authors,
        doc_publication_year: file.doc_publication_year,
        total_pages: file.total_pages,
        // Include file_content for the mentioned file if available
        file_content: metadata?.file_content || null
      };
    }).filter(Boolean); // Remove any null entries
    
    // Only add metadata section if there are actually mentioned files
    if (mentionedFilesMetadata.length === 0) {
      return message;
    }
    
    // Add metadata at the end of the message
    const metadataSection = `\n\n__FILES_METADATA__\n${JSON.stringify(mentionedFilesMetadata)}\n__END_FILES_METADATA__`;
    
    return message + metadataSection;
  };

  // New function to prepare the message with metadata for ALL files
  const prepareMessageWithAllFiles = (message: string): string => {
    // If there are no uploaded files, don't add any metadata
    if (uploadedFiles.length === 0) {
      return message;
    }
    
    // Include metadata for ALL files
    const allFilesMetadata = uploadedFiles.map(file => {
      // Get additional metadata from localStorage
      const metadata = getFileMetadataFromLocalStorage(file.id);
      
      return {
        id: file.id,
        name: file.name || 'Unknown file',
        type: file.doc_type || 'Unknown',
        summary: file.doc_summary || 'No summary available',
        url: file.url,
        source: file.source,
        doc_title: file.doc_title,
        doc_authors: file.doc_authors,
        doc_publication_year: file.doc_publication_year,
        total_pages: file.total_pages,
        // Include file_content for the file if available
        file_content: metadata?.file_content || null
      };
    }).filter(Boolean); // Remove any null entries
    
    // Add metadata at the end of the message
    const metadataSection = `\n\n__FILES_METADATA__\n${JSON.stringify(allFilesMetadata)}\n__END_FILES_METADATA__`;
    
    return message + metadataSection;
  };

  // Add CSS for styling inline file mentions
  const fileStyles = `
    .chat-input::placeholder {
      color: #9ca3af;
    }
    
    /* Add custom styles for the component */
    .file-mention {
      background-color: #e0f2fe;
      color: #0369a1;
      border-radius: 4px;
      padding: 2px 4px;
      margin: 0 1px;
      display: inline-block;
    }
  `;
  
  // Function to style text content when typing
  const getStylingClass = () => {
    // If there are file mentions, add the custom class
    return value.match(/@[^\s@]+\s/) ? 'chat-input-with-mentions' : '';
  };

  // Function to extract mentioned files from text
  const getMentionedFiles = () => {
    if (!value) return [];
    
    const mentionedFiles = [];
    
    // Get all file names and titles
    for (const file of uploadedFiles) {
      // Check if mentioned by name
      if (value.includes(`@${file.name} `)) {
        mentionedFiles.push(file);
      } 
      // Check if mentioned by title
      else if (file.doc_title && value.includes(`@${file.doc_title} `)) {
        mentionedFiles.push(file);
      }
    }
    
    return mentionedFiles;
  };

  return (
    <div className="bg-transparent w-full relative z-[200]">
      <style dangerouslySetInnerHTML={{ __html: fileStyles }} />
      <div 
        style={{
          display: 'flex',
          padding: isMobile ? '12px' : '16px',
          flexDirection: 'column',
          alignItems: 'flex-start',
          alignSelf: 'stretch',
          borderRadius: '16px',
          border: '1px solid var(--Monochrome-Light, #E8E8E5)',
          background: 'var(--Monochrome-White, #FFF)',
          boxShadow: '0px 0px 20px 0px rgba(203, 203, 203, 0.20)'
        }}
      >
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyPress}
          disabled={disabled || isRecording || isTranscribing}
          placeholder={
            disabled ? "Please wait..." : 
            isRecording ? "Recording..." : 
            isTranscribing ? "Transcribing..." :
            "Ask anything. Type @ to mention files"
          }
          rows={1}
          className={`w-full resize-none min-h-[44px] border-none shadow-none focus-visible:ring-0 p-0 mb-2 chat-input ${getStylingClass()}`}
          style={{ 
            padding: '0', 
            lineHeight: '24px'
          }}
        />
        
        {/* Show file indicators below the textarea */}
        {getMentionedFiles().length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {getMentionedFiles().map((file, index) => (
              <span 
                key={index} 
                // Apply styles similar to dropdown items
                className="inline-flex items-center bg-[#3C3C3C] text-white rounded-md px-2 py-1 text-xs"
              >
                {/* Adjust icon color */}
                <File className="h-3 w-3 mr-1.5 text-gray-300" /> 
                {file.doc_title || file.name} {/* Show title or name */}
              </span>
            ))}
          </div>
        )}
        
        {/* File mention dropdown */}
        {showFileMention && (
          <div 
            className="absolute max-h-60 overflow-y-auto z-50 custom-scrollbar"
            style={{ 
              top: mentionPosition.top + 'px', 
              left: mentionPosition.left + 'px',
              position: 'fixed',
              width: '250px',
              padding: '8px',
              borderRadius: '12px',
              background: 'var(--Monochrome-Black, #232323)',
              boxShadow: '0px 0px 20px 0px rgba(203, 203, 203, 0.20)',
            }}
          >
            {/* Remove the header section */}
            {/* 
            <div 
              className="p-2 sticky top-0 z-10"
              style={{ 
                background: 'var(--Monochrome-Black, #232323)', 
                borderBottom: '1px solid #3C3C3C' 
              }}
            >
              <div className="text-sm font-medium text-white">Attach File</div>
              <div className="text-xs text-gray-300">
                {mentionSearch ? `Filtered by: "${mentionSearch}"` : "Type to filter · Use ↑↓ / Enter"}
              </div>
            </div>
            */}
            
            {/* Add scrollbar styling */}
            <style jsx global>{`
              .custom-scrollbar::-webkit-scrollbar {
                width: 4px;
              }
              .custom-scrollbar::-webkit-scrollbar-track {
                background: transparent;
              }
              .custom-scrollbar::-webkit-scrollbar-thumb {
                background: #555;
                border-radius: 2px;
              }
              .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                background: #777;
              }
              .custom-scrollbar {
                scrollbar-width: thin;
                scrollbar-color: #555 transparent;
              }
            `}</style>
            
            {uploadedFiles.length > 0 ? (
              filteredFiles.length > 0 ? (
                <div className="py-1">
                  {filteredFiles.map((file, index) => (
                    <div 
                      key={file.id}
                      className={`
                        flex items-center gap-2 px-4 py-2 cursor-pointer rounded-md
                        ${selectedFileIndex === index 
                          ? 'bg-[#3C3C3C]'
                          : 'hover:bg-[#3C3C3C]'
                        }
                      `}
                      onClick={() => insertFileMention(file)}
                      onMouseEnter={() => setSelectedFileIndex(index)}
                    >
                      <File className={`h-4 w-4 shrink-0 ${selectedFileIndex === index ? 'text-white' : 'text-gray-300'}`} />
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-sm font-medium truncate text-white" style={{ maxWidth: '180px' }}>
                          {file.doc_title || file.name}
                        </span>
                        {file.doc_title && (
                          <span className={`text-xs ${selectedFileIndex === index ? 'text-gray-200' : 'text-gray-400'} truncate`} style={{ maxWidth: '180px' }}>
                            {file.name}
                          </span>
                        )}
                        {file.doc_type && !file.doc_title && (
                          <span className={`text-xs ${selectedFileIndex === index ? 'text-gray-200' : 'text-gray-400'}`}>
                            {file.doc_type}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-3 text-sm text-gray-300 text-center">No files found matching "{mentionSearch}"</div>
              )
            ) : (
              <div className="px-4 py-3 text-sm text-gray-300 text-center">No files available to mention</div>
            )}
          </div>
        )}
        
        <div 
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            alignSelf: 'stretch'
          }}
        >
          <button
            onClick={() => setFeedbackModalOpen(true)}
            style={{
              display: 'flex',
              padding: isMobile ? '6px 0' : '8px 0',
              alignItems: 'center',
              gap: '10px',
              borderRadius: '8px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              opacity: 0.6,
              fontSize: '12px',
              fontWeight: 400,
              color: 'var(--Monochrome-Normal, #9B9B9B)',
              transition: 'opacity 0.2s ease'
            }}
            className="hover:opacity-100"
          >
            Have feedback?
          </button>
          
          <div className="flex gap-2">
            {/* Recording button */}
            <button
              onClick={toggleRecording}
              disabled={disabled || isTranscribing}
              style={{
                display: 'flex',
                padding: isMobile ? '6px' : '8px',
                alignItems: 'center',
                justifyContent: 'center',
                width: isMobile ? '32px' : '36px',
                height: isMobile ? '32px' : '36px',
                borderRadius: '8px',
                background: isRecording ? 'var(--Error-400, #EF4444)' : 'var(--Monochrome-Superlight, #F2F2ED)',
                border: 'none',
                cursor: 'pointer',
                opacity: (disabled || isTranscribing) ? 0.5 : 1,
                position: 'relative'
              }}
            >
              {isRecording ? (
                <Square className="h-4 w-4 text-white" />
              ) : (
                <MicrophoneIcon className="h-4 w-4" />
              )}
              {isRecording && (
                <span style={{ 
                  position: 'absolute',
                  fontSize: '12px', 
                  fontWeight: 500, 
                  color: 'white',
                  bottom: '-18px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  whiteSpace: 'nowrap'
                }}>
                  Stop
                </span>
              )}
            </button>
            
            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={disabled || isRecording || isTranscribing || !value.trim()}
              style={{
                display: 'flex',
                padding: isMobile ? '6px' : '8px',
                alignItems: 'center',
                gap: '10px',
                borderRadius: '8px',
                background: 'var(--Monochrome-Superlight, #F2F2ED)',
                border: 'none',
                cursor: 'pointer',
                opacity: (disabled || isRecording || isTranscribing || !value.trim()) ? 0.5 : 1
              }}
            >
              {disabled ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              <span style={{ fontSize: '14px', fontWeight: 500 }}>
                {disabled ? "Processing..." : "Send"}
              </span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={feedbackModalOpen}
        onOpenChange={setFeedbackModalOpen}
      />
    </div>
  );
} 
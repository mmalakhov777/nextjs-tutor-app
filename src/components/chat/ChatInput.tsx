"use client";

import { useRef, useEffect, useState, useCallback, forwardRef, useMemo } from 'react';
import { Send, Loader2, Square, File, AtSign, AlertCircle } from 'lucide-react';
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
import { GrokXLogo } from '@/components/icons/GrokXLogo';
import { TriageAgentLogo } from '@/components/icons/TriageAgentLogo';
import { ClaudeCreativeLogo } from '@/components/icons/ClaudeCreativeLogo';
import { DeepSeekLogo } from '@/components/icons/DeepSeekLogo';
import { MistralLogo } from '@/components/icons/MistralLogo';
import { PerplexityLogo } from '@/components/icons/PerplexityLogo';
import { UserCircle } from 'lucide-react';
import { saveFileMetadataToLocalStorage } from '@/utils/fileStorage';
import { getAgentDescription } from '@/data/agentDescriptions';

// Define a minimal Agent type locally
type Agent = { id?: string; name: string; [key: string]: any };

// Helper function to get the backend URL
const getBackendUrl = () => {
  return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5002';
};

// Change the extractFileMentions function to use # instead of @
const extractFileMentions = (message: string): string[] => {
  console.log("Extracting file mentions from:", message);
  
  const fileRegex = /#\[file-([a-zA-Z0-9-_]+):[^\]]+\]/g;
  const matches = message.match(fileRegex);
  
  console.log("Regex matches:", matches);
  
  if (!matches) return [];
  
  const fileIds = matches.map(match => {
    // Extract the file ID from the match
    const idMatch = match.match(/#\[file-([a-zA-Z0-9-_]+):/);
    const fileId = idMatch ? idMatch[1] : '';
    console.log("Extracted file ID:", fileId);
    return fileId;
  }).filter(Boolean);
  
  console.log("Final file IDs:", fileIds);
  return fileIds;
};

// Function to check if a message is potentially a file mention
const isFileMention = (message: string): boolean => {
  // Look for plain file mentions that may not have been properly formatted yet
  const hasPlainFileMention = /#\s*([^#\s]+)/.test(message);
  
  // Look for already formatted file mentions
  const hasFormattedFileMention = /#\[file-([a-zA-Z0-9-_]+):/.test(message);
  
  return hasPlainFileMention || hasFormattedFileMention;
};

// --- Agent Mention Helpers ---
// Helper function to get agent icon
const getAgentIcon = (agentName: string) => {
  switch(agentName) {
    case "Triage Agent":
    case "General Assistant":
    case "Deep Thinker":
      return <TriageAgentLogo className="h-4 w-4" />;
    case "Grok X":
      return <GrokXLogo className="h-4 w-4" />;
    case "Mistral Europe":
      return <MistralLogo className="h-4 w-4" />;
    case "Claude Creative":
      return <ClaudeCreativeLogo className="h-4 w-4" />;
    case "Deep Seek":
      return <DeepSeekLogo className="h-4 w-4" />;
    case "Perplexity":
      return <PerplexityLogo className="h-4 w-4" />;
    default:
      return <UserCircle className="h-4 w-4" />;
  }
};

// Helper function to get display name for agents
const getDisplayAgentName = (agentName: string) => {
  // Always display "General Assistant" instead of "Triage Agent"
  if (agentName === "Triage Agent") {
    return "General Assistant";
  }
  return agentName;
};
// --- End Agent Mention Helpers ---

// Define hardcoded default agents
const DEFAULT_AGENTS: Agent[] = [
  { id: 'general-assistant', name: 'General Assistant' },
  { id: 'grok-x', name: 'Grok X' },
  { id: 'mistral-europe', name: 'Mistral Europe' },
  { id: 'claude-creative', name: 'Claude Creative' },
  { id: 'deep-seek', name: 'Deep Seek' },
  { id: 'perplexity', name: 'Perplexity' },
  { id: 'deep-thinker', name: 'Deep Thinker' }
];

// Helper function to get agent circle color
const getAgentCircleColor = (agentName: string) => {
  switch(agentName) {
    case "Triage Agent":
    case "General Assistant":
      return "bg-emerald-500"; // Green color for both Triage and General Assistant
    case "Claude Creative":
      return "rounded-[1000px] border border-[#E8E8E5] bg-[#D77655]"; // Specific Claude Creative styling
    case "Deep Seek":
      return "rounded-[1000px] border border-[#E8E8E5] bg-[#4D6BFE]"; // Specific Deep Seek styling
    case "Mistral Europe":
      return "rounded-[1000px] border border-[#E8E8E5] bg-[#FA5310]"; // Specific Mistral Europe styling
    case "Perplexity":
      return "rounded-[1000px] border border-[#E8E8E5] bg-[#1F1F1F]"; // Specific Perplexity styling
    case "Deep Thinker":
      return "rounded-[1000px] border border-[#E8E8E5] bg-black"; // Deep Thinker styling with pure black
    case "Grok X":
      return "bg-black"; // Black color for the third icon
    default:
      return "bg-white border border-slate-200";
  }
};

// Helper function to get icon text color
const getIconTextColor = (agentName: string) => {
  switch(agentName) {
    case "Triage Agent":
    case "General Assistant":
    case "Claude Creative":
    case "Grok X":
    case "Deep Seek":
    case "Mistral Europe":
    case "Perplexity":
    case "Deep Thinker":
      return "text-white"; // White text for dark backgrounds
    default:
      return "text-slate-800"; // Dark text for light backgrounds
  }
};

// Extend ChatInputProps to include optional displayMessage parameter
export interface ExtendedChatInputProps extends ChatInputProps {
  agents?: Agent[]; // Make agents optional
  mode: 'chat' | 'research';
  onModeChange: (mode: 'chat' | 'research') => void;
}

export function ChatInput({
  value,
  onChange,
  onSend,
  disabled,
  agents = DEFAULT_AGENTS, // Use default agents if none provided
  mode,
  onModeChange
}: ExtendedChatInputProps) { // Use updated props type
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const [isLoadingFileContent, setIsLoadingFileContent] = useState(false); // Add loading state for file content
  
  // File mention state
  const [showFileMention, setShowFileMention] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [cursorPosition, setCursorPosition] = useState(0);
  const { uploadedFiles, getFileMetadataFromLocalStorage } = useFileContext();
  const [selectedFileIndex, setSelectedFileIndex] = useState(0); // For file dropdown navigation

  // Agent mention state
  const [showAgentMention, setShowAgentMention] = useState(false);
  const [agentMentionSearch, setAgentMentionSearch] = useState('');
  const [selectedAgentIndex, setSelectedAgentIndex] = useState(0); // For agent dropdown navigation
  
  // MediaRecorder references
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Filter files based on search term
  const filteredFiles = uploadedFiles.filter(file => 
    (file.doc_title || file.name).toLowerCase().includes(mentionSearch.toLowerCase())
  );
  
  // Update the filteredAgents logic to use DEFAULT_AGENTS if no agents provided
  const filteredAgents = (agents || DEFAULT_AGENTS).filter(agent =>
    getDisplayAgentName(agent.name).toLowerCase().includes(agentMentionSearch.toLowerCase())
  );

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [value]);

  // Handle keyboard navigation in file dropdown
  const handleFileDropdownKeyNavigation = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showFileMention) return;
    
    const effectiveFilteredFiles = mentionSearch.toLowerCase().startsWith('all') || filteredFiles.length === 0 
      ? [{ id: 'all', name: 'All Files' }] // Include "All Files" if search starts with "all" or no files match
      : [{ id: 'all', name: 'All Files' }, ...filteredFiles];
      
    const currentSelection = selectedFileIndex; // Index relative to effectiveFilteredFiles

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedFileIndex(prev => 
          prev < effectiveFilteredFiles.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedFileIndex(prev => prev > 0 ? prev - 1 : 0);
        break;
      case 'Enter':
      case 'Tab':
        e.preventDefault();
        if (currentSelection >= 0 && currentSelection < effectiveFilteredFiles.length) {
          const selectedItem = effectiveFilteredFiles[currentSelection];
          insertFileMention(selectedItem.id === 'all' ? 'all' : selectedItem as UploadedFile);
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
  
  // Handle keyboard navigation in agent dropdown
  const handleAgentDropdownKeyNavigation = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showAgentMention || filteredAgents.length === 0) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedAgentIndex(prev => 
          prev < filteredAgents.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedAgentIndex(prev => prev > 0 ? prev - 1 : 0);
        break;
      case 'Enter':
      case 'Tab':
        e.preventDefault();
        if (filteredAgents[selectedAgentIndex]) {
          insertAgentMention(filteredAgents[selectedAgentIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowAgentMention(false);
        break;
      default:
        break;
    }
  };
  
  // Reset selected index when dropdowns open or filtered items change
  useEffect(() => {
    if (showFileMention) {
      setSelectedFileIndex(0); // Reset file index
    }
    if (showAgentMention) {
      setSelectedAgentIndex(0); // Reset agent index
    }
  }, [showFileMention, mentionSearch, showAgentMention, agentMentionSearch]);
  

  // Handle key press - Route to correct dropdown handler
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showFileMention) {
      handleFileDropdownKeyNavigation(e);
      return;
    }
    if (showAgentMention) {
      handleAgentDropdownKeyNavigation(e);
      return;
    }
    
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else if (e.key === '#') {
      setShowAgentMention(false); // Close agent dropdown if open
      triggerDropdown('#');
    } else if (e.key === '@') {
      setShowFileMention(false); // Close file dropdown if open
      triggerDropdown('@');
    } else if (e.key === 'Escape') {
      // Close any open dropdown on Escape
      setShowFileMention(false);
      setShowAgentMention(false);
    }
  };
  
  // Update the triggerDropdown function to position dropdowns above
  const triggerDropdown = (symbol: '#' | '@') => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const rect = textarea.getBoundingClientRect();
      
      // Position dropdown above the textarea with 20px gap
      const dropdownHeight = symbol === '#' ? 240 : 320; // Approximate heights of dropdowns
      const top = rect.top - dropdownHeight - 20;
      const left = rect.left;
      
      setMentionPosition({ top, left });
    }
    
    if (symbol === '#') {
      setMentionSearch('');
      setShowFileMention(true);
      setShowAgentMention(false);
    } else {
      setAgentMentionSearch('');
      setShowAgentMention(true);
      setShowFileMention(false);
    }
  };
  
  // Handle input change and track # or @ symbol
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    setCursorPosition(cursorPos);
    
    const textBeforeCursor = newValue.substring(0, cursorPos);
    const lastChar = textBeforeCursor.slice(-1);
    const lastHashIndex = textBeforeCursor.lastIndexOf('#');
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    let inMentionContext = false;
    let mentionSymbol: '#' | '@' | null = null;
    let mentionStartIndex = -1;

    // Determine if we are potentially in a mention context
    if (lastHashIndex > lastAtIndex && lastHashIndex !== -1 && !textBeforeCursor.substring(lastHashIndex).includes(' ') && !textBeforeCursor.substring(lastHashIndex).includes(']')) {
        inMentionContext = true;
        mentionSymbol = '#';
        mentionStartIndex = lastHashIndex;
    } else if (lastAtIndex > lastHashIndex && lastAtIndex !== -1 && !textBeforeCursor.substring(lastAtIndex).includes(' ') && !textBeforeCursor.substring(lastAtIndex).includes(']')) {
        inMentionContext = true;
        mentionSymbol = '@';
        mentionStartIndex = lastAtIndex;
    }

    if (inMentionContext && mentionSymbol && mentionStartIndex !== -1) {
        const searchTerm = textBeforeCursor.substring(mentionStartIndex + 1);
        if (mentionSymbol === '#') {
            setMentionSearch(searchTerm);
            if (!showFileMention) {
                triggerDropdown('#');
            }
            setShowAgentMention(false); // Close agent dropdown
        } else { // mentionSymbol === '@'
            setAgentMentionSearch(searchTerm);
            if (!showAgentMention) {
                triggerDropdown('@');
            }
            setShowFileMention(false); // Close file dropdown
        }
    } else {
        // Close both dropdowns if not in a mention context
        setShowFileMention(false);
        setShowAgentMention(false);
    }
    
    onChange(newValue);
  };
  
  // Insert file mention at cursor position - update to use #
  const insertFileMention = (file: UploadedFile | 'all') => {
    if (textareaRef.current) {
      const cursorPos = textareaRef.current.selectionStart || 0;
      const textBeforeCursor = value.substring(0, cursorPos);
      const textAfterCursor = value.substring(cursorPos);
      
      const hashIndex = textBeforeCursor.lastIndexOf('#');
      
      if (hashIndex !== -1) {
        let displayName: string;
        let newText: string;
        
        if (file === 'all') {
          displayName = 'All Files';
          newText = 
            textBeforeCursor.substring(0, hashIndex) + 
            `#${displayName} ` + 
            textAfterCursor;
        } else {
          displayName = file.doc_title || file.name;
          newText = 
            textBeforeCursor.substring(0, hashIndex) + 
            `#${displayName} ` + 
            textAfterCursor;
          // Optional: Store actual file reference if needed: `#[file-${file.id}:${file.name}]`
        }
        
        onChange(newText);
        
        const newCursorPos = hashIndex + `#${displayName} `.length;
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

  // Insert agent mention at cursor position
  const insertAgentMention = (agent: Agent) => {
    if (textareaRef.current) {
      const cursorPos = textareaRef.current.selectionStart || 0;
      const textBeforeCursor = value.substring(0, cursorPos);
      const textAfterCursor = value.substring(cursorPos);
      
      const atIndex = textBeforeCursor.lastIndexOf('@');
      
      if (atIndex !== -1) {
        const displayName = getDisplayAgentName(agent.name);
        const newText = 
          textBeforeCursor.substring(0, atIndex) + 
          `@${displayName}` + // Remove the extra space
          textAfterCursor;
          
        onChange(newText);
        
        const newCursorPos = atIndex + `@${displayName}`.length;
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
          }
        }, 0);
      }
      
      setShowAgentMention(false);
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
          } else {
             // Handle case where transcription is empty but stop recording
             setIsRecording(false);
             setIsTranscribing(false);
          }
        } catch (error) {
          toast.error('Failed to process audio. Please try again.');
          setIsRecording(false);
          setIsTranscribing(false);
        } finally {
           stream.getTracks().forEach(track => track.stop()); // Ensure stream is always stopped
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100);
      setIsRecording(true);
      onChange(''); // Clear input on record start
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setRecordingError('Failed to start recording: ' + errorMessage);
      toast.error('Failed to start recording: ' + errorMessage); // Show toast on error
      setIsRecording(false); // Ensure recording state is reset on error
    }
  };
  
  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      // State changes (isRecording=false, isTranscribing=true) happen in onstop handler
    } else {
      // If stop is called when not recording (e.g., due to error)
      setIsRecording(false);
      setIsTranscribing(false);
      if (mediaRecorderRef.current?.stream) {
         mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
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
      // Stop tracks explicitly on unmount if stream exists
       if (mediaRecorderRef.current?.stream) {
         mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Modify the handleSend function to properly use displayMessage
  const handleSend = async () => {
    console.log("Original message:", value);
    
    setIsLoadingFileContent(true);
    
    try {
      // Keep the original message for display purposes
      const displayMessage = value;
      // Create a copy for backend processing
      let processedMessage = value;
      
      // Inject hidden instruction if there are no uploaded files
      if (uploadedFiles.length === 0) {
        processedMessage =
          "do not use file search tool and just route the following user query to the best agent\n" +
          processedMessage;
      }
      
      // Check if the message contains any file mentions
      const hasFileMention = isFileMention(value);
      
      if (hasFileMention) {
        // Handle file mentions as before
        // Create file ID mapping for replacement
        for (const file of uploadedFiles) {
          const fileTitle = file.doc_title || file.name;
          
          // Skip if no title
          if (!fileTitle) continue;
          
          // Check if the file title appears in the message with a # prefix
          const titlePattern = `#${fileTitle}`;
          if (processedMessage.includes(titlePattern)) {
            console.log(`Found exact match for file title "${fileTitle}"`);
            // ONLY modify the processed message (backend version)
            processedMessage = processedMessage.replace(
              titlePattern, 
              `#[file-${file.id}:${file.name}]`
            );
          }
        }
        
        console.log("Message after exact title matching:", processedMessage);
        console.log("Display message preserved as:", displayMessage);
        
        // Now check for "#All Files" mention
        if (
          processedMessage.includes("#All Files") || 
          processedMessage.includes("#All") ||
          processedMessage.includes("#all files") || 
          processedMessage.includes("#allfiles")
        ) {
          console.log("Processing All Files mention");
          
          // Process all uploaded files for "All Files" mention
          const allFilesMetadata = await Promise.all(uploadedFiles.map(async (file) => {
            const metadata = getFileMetadataFromLocalStorage(file.id);
            let fileContent = metadata?.file_content || null;
            
            // If no file content in localStorage, fetch from backend
            if (!fileContent) {
              fileContent = await fetchFileContent(file.id);
              
              // If content fetched successfully, save to localStorage for future use
              if (fileContent) {
                const updatedFile = {...file, file_content: fileContent};
                saveFileMetadataToLocalStorage(updatedFile);
              }
            }
            
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
              file_content: fileContent
            };
          })).then(results => results.filter(Boolean));
          
          if (allFilesMetadata.length > 0) {
            const metadataSection = `\n\n__FILES_METADATA__\n${JSON.stringify(allFilesMetadata)}\n__END_FILES_METADATA__`;
            processedMessage = processedMessage + metadataSection;
          }
          
          // Send message with all files metadata - ALWAYS use displayMessage for UI
          console.log("Sending message with ALL files metadata");
          setIsLoadingFileContent(false); // Reset loading state
          onSend(processedMessage, displayMessage); // Send both messages
          return;
        }
        
        // Extract file IDs from the processed message (for specific file mentions)
        const fileIds = extractFileMentions(processedMessage);
        console.log("Extracted file IDs:", fileIds);
        
        // Check if there are specific file mentions in the message
        const hasSpecificFileMentions = fileIds.length > 0;
        
        // ONLY include file_content metadata for specifically mentioned files
        if (hasSpecificFileMentions) {
          console.log("Including metadata for specifically mentioned files");
          const preparedMessage = await prepareMessageWithFiles(processedMessage, fileIds);
          console.log("Final message with metadata:", preparedMessage);
          setIsLoadingFileContent(false); // Reset loading state
          // CRITICAL: Always pass displayMessage as second parameter
          onSend(preparedMessage, displayMessage); // First is backend version, second is UI version
          return;
        } 
        
        // One more attempt for partial matches
        let foundAnyPartialMatch = false;
        
        for (const file of uploadedFiles) {
          const fileTitle = file.doc_title || file.name;
          
          // Skip if no title
          if (!fileTitle) continue;
          
          // Check if there's a # followed by a substantial part of the file title
          // Only match if at least 5 characters long and 50% of the title
          if (fileTitle.length >= 5) {
            const minMatchLength = Math.min(5, Math.floor(fileTitle.length * 0.5));
            
            // Look for partial matches after a # character
            const hashtagPattern = /#([^#\n]+)/g;
            let match;
            while ((match = hashtagPattern.exec(processedMessage)) !== null) {
              const hashtag = match[1].trim();
              
              if (
                fileTitle.includes(hashtag) && 
                hashtag.length >= minMatchLength
              ) {
                console.log(`Found partial match: "${hashtag}" for file "${fileTitle}"`);
                // Replace the partial match with the formatted reference ONLY in processed message
                processedMessage = processedMessage.replace(
                  `#${hashtag}`, 
                  `#[file-${file.id}:${file.name}]`
                );
                
                // Do NOT modify displayMessage to keep user-friendly format
                foundAnyPartialMatch = true;
                break;
              }
            }
          }
        }
        
        if (foundAnyPartialMatch) {
          // Re-extract file IDs after partial matching
          const newFileIds = extractFileMentions(processedMessage);
          console.log("File IDs after partial matching:", newFileIds);
          
          if (newFileIds.length > 0) {
            const preparedMessage = await prepareMessageWithFiles(processedMessage, newFileIds);
            console.log("Final message with metadata after partial matching:", preparedMessage);
            setIsLoadingFileContent(false); // Reset loading state
            // CRITICAL: Always provide both messages
            onSend(preparedMessage, displayMessage); // Backend version, UI version
            return;
          }
        }
      }
      
      // If we get here, either:
      // 1. No file mentions were found in the message, or
      // 2. No specific file matches were found for the mentions
      
      // NEW FUNCTIONALITY: Always attach metadata for ALL files from localStorage 
      // when no specific files are mentioned
      console.log("No specific file mentions matched, sending with ALL files metadata");
      
      // Get all file metadata from localStorage
      const storedMetadata = localStorage.getItem('uploadedFilesMetadata');
      if (storedMetadata) {
        try {
          const metadataObj = JSON.parse(storedMetadata);
          const allFilesMetadata = Object.values(metadataObj).filter(Boolean);
          
          if (allFilesMetadata.length > 0) {
            // Add metadata section for all files
            const metadataSection = `\n\n__FILES_METADATA__\n${JSON.stringify(allFilesMetadata)}\n__END_FILES_METADATA__`;
            processedMessage = processedMessage + metadataSection;
          }
        } catch (error) {
          console.error("Error parsing stored metadata:", error);
        }
      }
      
      setIsLoadingFileContent(false); // Reset loading state
      // Send both the processed message with metadata and the display message
      onSend(processedMessage, displayMessage);
    } catch (error) {
      console.error("Error processing file mentions:", error);
      setIsLoadingFileContent(false); // Reset loading state on error
      // Send original message as fallback
      onSend(value, value); // Send same message for both when error occurs
    }
  };

  // Function to prepare the message with metadata for specifically mentioned files
  const prepareMessageWithFiles = async (message: string, fileIds: string[]): Promise<string> => {
    // If no files are mentioned (#), don't add any metadata section
    if (fileIds.length === 0) {
      return message;
    }
    
    const mentionedFilesMetadata = await Promise.all(fileIds.map(async (fileId) => {
      const file = uploadedFiles.find(f => f.id === fileId);
      if (!file) return null;
      
      const metadata = getFileMetadataFromLocalStorage(fileId);
      let fileContent = metadata?.file_content || null;
      
      // If no file content in localStorage, fetch from backend
      if (!fileContent) {
        fileContent = await fetchFileContent(fileId);
        
        // If content fetched successfully, save to localStorage for future use
        if (fileContent && file) {
          const updatedFile = {...file, file_content: fileContent};
          saveFileMetadataToLocalStorage(updatedFile);
        }
      }
      
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
        file_content: fileContent
      };
    })).then(results => results.filter(Boolean));
    
    if (mentionedFilesMetadata.length === 0) {
      return message;
    }
    
    const metadataSection = `\n\n__FILES_METADATA__\n${JSON.stringify(mentionedFilesMetadata)}\n__END_FILES_METADATA__`;
    return message + metadataSection;
  };

  // Function to apply styling based on mentions
  const getStylingClass = () => {
     // Check for both file (#) and agent (@) mentions
    const hasFileMention = /#(?![\[\s])[^\s#]+(?=\s|$)/.test(value); // Matches #Name followed by space or end
    const hasAgentMention = /@(?![\[\s])[^\s@]+(?=\s|$)/.test(value); // Matches @Name followed by space or end
    
    if (hasFileMention && hasAgentMention) return 'chat-input-with-mentions'; // Or a combined class
    if (hasFileMention) return 'chat-input-with-mentions'; // Reuse existing or create specific
    if (hasAgentMention) return 'chat-input-with-mentions'; // Reuse existing or create specific
    return '';
  };

  // Get mentioned files - update to use # and add explicit return type
  const getMentionedFiles = (): UploadedFile[] => {
    if (!value) return [];
    const mentionedFiles: UploadedFile[] = []; // Explicitly type the array
    
    if (/#All Files\s|#All\s/.test(value)) {
      return uploadedFiles; // Return all if #All Files is mentioned
    }
    
    const fileMentions = value.match(/#([^#\s]+)/g) || [];
    fileMentions.forEach(mention => {
      const displayName = mention.substring(1);
      const matchingFile = uploadedFiles.find(file => 
        (file.doc_title && file.doc_title === displayName) || file.name === displayName
      );
      // Ensure matchingFile is not undefined and not already added
      if (matchingFile && !mentionedFiles.some(f => f.id === matchingFile.id)) {
        mentionedFiles.push(matchingFile);
      }
    });
    
    return mentionedFiles;
  };

  // Get mentioned agents - new function using @ and add explicit return type
  const getMentionedAgents = (): Agent[] => {
    if (!value || !agents?.length) return [];
    const mentionedAgents: Agent[] = [];
    
    const agentMentions = value.match(/@([^@\s]+)/g) || [];
    agentMentions.forEach(mention => {
      const displayName = mention.substring(1);
      const matchingAgent = (agents || []).find(agent => 
        getDisplayAgentName(agent.name) === displayName
      );
      if (matchingAgent && !mentionedAgents.some(a => a.id === matchingAgent.id)) {
         mentionedAgents.push(matchingAgent);
      }
    });
    
    return mentionedAgents;
  };

  // Prepare dropdown items including "All Files"
  const fileDropdownItems = [{ id: 'all', name: 'All Files', doc_title: 'All Files' }, ...filteredFiles];
  
  // Function to fetch file content from backend
  const fetchFileContent = async (fileId: string): Promise<string | null> => {
    console.log(`Fetching content for file ID: ${fileId}`);
    try {
      const backendUrl = getBackendUrl();
      const url = `${backendUrl}/api/files/${fileId}/content`;
      console.log(`Making request to: ${url}`);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error(`Failed to load file content: ${response.status} - ${errorText}`);
        throw new Error(`Failed to load file content: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`Successfully fetched file content, size: ${data.content?.length || 0} characters`);
      
      if (!data.content) {
        console.warn(`No content returned for file ID: ${fileId}`);
      }
      
      return data.content || null;
    } catch (error: unknown) {
      console.error('Error loading file content:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to load file content: ${errorMessage}`);
      return null;
    }
  };

  const [isResearchDisabled, setIsResearchDisabled] = useState(false); // Add state for research disabled
  const [showResearchTooltip, setShowResearchTooltip] = useState(false); // Tooltip for research disabled
  const researchIconRef = useRef<HTMLSpanElement>(null);

  // Close tooltip on outside click
  useEffect(() => {
    if (!showResearchTooltip) return;
    function handleClick(e: MouseEvent) {
      if (researchIconRef.current && !researchIconRef.current.contains(e.target as Node)) {
        setShowResearchTooltip(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showResearchTooltip]);

  // Check text for @ or # symbols to disable research mode
  useEffect(() => {
    // If text contains @ or #, disable research mode and switch to chat
    if (value && (value.includes('@') || value.includes('#'))) {
      setIsResearchDisabled(true);
      if (mode === 'research') {
        onModeChange('chat');
      }
    } else {
      setIsResearchDisabled(false);
    }
  }, [value, mode, onModeChange]);

  // Add this new helper function to get agent description:
  const getDescription = (agent: Agent) => {
    // If agent has its own description, use it
    if (agent.description) {
      return agent.description;
    }
    
    // Otherwise use our centralized description
    return getAgentDescription(agent.name);
  };

  return (
    <div className="bg-transparent w-full relative z-[200]">
      {/* Global styles for entire component - combined to avoid nested style tags */}
      <style jsx global>{`
        /* File mention styles */
        .file-mention {
          background-color: #e0f2fe; 
          color: #0369a1;
          border-radius: 4px;
          padding: 1px 3px;
          margin: 0 1px;
          display: inline-block;
          font-size: 0.9em;
        }
        
        /* Custom scrollbar styles */
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #555; border-radius: 2px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #777; }
        .custom-scrollbar { scrollbar-width: thin; scrollbar-color: #555 transparent; }
        
        /* Research tooltip styles */
        .research-tooltip-container {
          z-index: 2000 !important; /* Ensure it's above everything */
        }
        .research-tooltip-arrow {
          width: 8px;
          height: 8px;
          background: #232323;
          transform: rotate(45deg);
          position: absolute;
          z-index: 6;
          -webkit-transform: rotate(45deg);
          -moz-transform: rotate(45deg);
          -ms-transform: rotate(45deg);
          -o-transform: rotate(45deg);
          bottom: -4px;
          left: 50%;
          margin-left: -4px;
        }
        .research-tooltip-content {
          display: flex;
          width: 210px;
          padding: 8px;
          flex-direction: column;
          align-items: flex-start;
          border-radius: 12px;
          background: #232323;
          box-shadow: 0px 0px 20px 0px rgba(203, 203, 203, 0.20);
          position: relative;
          color: #FFFFFF;
          font-size: 13px;
          font-weight: 400;
          line-height: 18px;
          text-align: left;
          opacity: 1 !important;
        }
        .research-tooltip-title {
          font-weight: 600;
          margin-bottom: 2px;
          color: #FFFFFF;
          opacity: 1 !important;
        }
        .research-tooltip-text {
          color: #FFFFFF;
          opacity: 1 !important;
        }
        
        /* Chat input styles */
        .chat-input::placeholder {
          color: #9ca3af;
        }
      `}</style>
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
          disabled={disabled || isRecording || isTranscribing || isLoadingFileContent}
          placeholder={
            disabled ? "Please wait..." : 
            isRecording ? "Recording..." : 
            isTranscribing ? "Transcribing..." :
            isLoadingFileContent ? "Loading file content..." :
            "Ask anything. Type # for files, @ for agents"
          }
          rows={1}
          className={`w-full resize-none min-h-[44px] border-none shadow-none focus-visible:ring-0 p-0 mb-2 chat-input ${getStylingClass()}`}
          style={{ 
            padding: '0', 
            lineHeight: '24px'
          }}
        />
        
        {/* Show file and agent indicators below the textarea */}
        {(getMentionedFiles().length > 0) && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {/* File indicators (#) */}
            {getMentionedFiles().map((file, index) => (
              <span 
                key={`file-${file.id || index}`} 
                className="file-mention inline-flex items-center rounded-md px-2 py-0.5 text-xs"
              >
                <File className="h-3 w-3 mr-1" /> 
                {/#All Files\s|#All\s/.test(value) ? 'All Files' : (file.doc_title || file.name)}
              </span>
            ))}
          </div>
        )}
        
        {/* --- File mention dropdown --- */}
        {showFileMention && (
          <div 
            className="absolute z-[210] custom-scrollbar"
            style={{ 
              top: `${mentionPosition.top}px`,
              left: `${mentionPosition.left}px`,
              position: 'fixed',
              width: '250px',
              height: '240px', // Fixed height regardless of content
              padding: '8px',
              borderRadius: '12px',
              background: 'var(--Monochrome-Black, #232323)',
              boxShadow: '0px 0px 20px 0px rgba(203, 203, 203, 0.20)',
              overflow: 'auto',
            }}
          >
            {uploadedFiles.length > 0 || mentionSearch.toLowerCase().startsWith('all') ? (
              <div className="py-1 h-full">
                 {/* Dynamic "All Files" option */}
                {(mentionSearch === '' || mentionSearch.toLowerCase().startsWith('all')) && (
                   <div 
                     className={`flex items-center gap-2 px-4 py-2 cursor-pointer rounded-md ${selectedFileIndex === 0 ? 'bg-[#3C3C3C]' : 'hover:bg-[#3C3C3C]'}`}
                     onClick={() => insertFileMention('all')}
                     onMouseEnter={() => setSelectedFileIndex(0)}
                   >
                     <File className={`h-4 w-4 shrink-0 ${selectedFileIndex === 0 ? 'text-white' : 'text-gray-300'}`} />
                     <div className="flex flex-col flex-1 min-w-0">
                       <span className="text-sm font-medium text-white">All Files</span>
                       <span className={`text-xs ${selectedFileIndex === 0 ? 'text-gray-200' : 'text-gray-400'}`}>Reference all available files</span>
                     </div>
                   </div>
                 )}

                {/* Divider */}
                {(mentionSearch === '' || mentionSearch.toLowerCase().startsWith('all')) && filteredFiles.length > 0 && (
                  <div className="mx-2 my-1 border-t border-[#3C3C3C]"></div>
                )}
                
                {/* Filtered individual files */}
                {filteredFiles.length > 0 ? (
                  filteredFiles.map((file, index) => {
                    const displayIndex = (mentionSearch === '' || mentionSearch.toLowerCase().startsWith('all')) ? index + 1 : index; // Adjust index if "All" is shown
                    return (
                      <div 
                        key={file.id}
                        className={`flex items-center gap-2 px-4 py-2 cursor-pointer rounded-md ${selectedFileIndex === displayIndex ? 'bg-[#3C3C3C]' : 'hover:bg-[#3C3C3C]'}`}
                        onClick={() => insertFileMention(file)}
                        onMouseEnter={() => setSelectedFileIndex(displayIndex)}
                      >
                        <File className={`h-4 w-4 shrink-0 ${selectedFileIndex === displayIndex ? 'text-white' : 'text-gray-300'}`} />
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="text-sm font-medium truncate text-white" style={{ maxWidth: '180px'}}>{file.doc_title || file.name}</span>
                          {file.doc_title && <span className={`text-xs ${selectedFileIndex === displayIndex ? 'text-gray-200' : 'text-gray-400'} truncate`} style={{ maxWidth: '180px'}}>{file.name}</span>}
                          {file.doc_type && !file.doc_title && <span className={`text-xs ${selectedFileIndex === displayIndex ? 'text-gray-200' : 'text-gray-400'}`}>{file.doc_type}</span>}
                        </div>
                      </div>
                    );
                  })
                ) : (mentionSearch !== '' && !mentionSearch.toLowerCase().startsWith('all')) ? (
                  <div className="px-4 py-3 text-sm text-gray-300 text-center">No files found matching "{mentionSearch}"</div>
                ) : null}
              </div>
            ) : (
              <div className="px-4 py-3 text-sm text-gray-300 text-center h-full flex items-center justify-center">No files available to mention</div>
            )}
          </div>
        )}

        {/* --- Agent mention dropdown --- */}
        {showAgentMention && (
          <div 
            className="absolute z-[210] custom-scrollbar"
            style={{ 
              top: `${mentionPosition.top}px`,
              left: `${mentionPosition.left}px`,
              position: 'fixed',
              width: '300px',
              height: '320px', // Fixed height regardless of content
              padding: '8px',
              borderRadius: '12px',
              background: 'var(--Monochrome-Black, #232323)',
              boxShadow: '0px 0px 20px 0px rgba(203, 203, 203, 0.20)',
              overflow: 'auto',
            }}
          >
            {filteredAgents.length > 0 ? (
              <div className="py-1 h-full">
                {filteredAgents.map((agent, index) => {
                  const displayName = getDisplayAgentName(agent.name);
                  return (
                    <div 
                      key={agent.id || `agent-${index}`}
                      className={`flex items-start gap-3 px-4 py-3 cursor-pointer rounded-md ${selectedAgentIndex === index ? 'bg-[#3C3C3C]' : 'hover:bg-[#3C3C3C]'}`}
                      onClick={() => insertAgentMention(agent)}
                      onMouseEnter={() => setSelectedAgentIndex(index)}
                    >
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0 ${getAgentCircleColor(displayName)} ${getIconTextColor(displayName)}`}>
                        {getAgentIcon(displayName)}
                      </div>
                      <div className="flex flex-col flex-1 min-w-0 pt-1">
                        <span className="text-sm font-medium text-white">
                          {displayName}
                        </span>
                        <span className={`text-xs mt-1 ${selectedAgentIndex === index ? 'text-gray-300' : 'text-gray-400'}`}>
                          {getDescription(agent)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="px-4 py-3 text-sm text-gray-300 text-center h-full flex items-center justify-center">
                No agents found matching "{agentMentionSearch}"
              </div>
            )}
          </div>
        )}
        
        {/* --- Bottom controls --- */}
        <div 
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            alignSelf: 'stretch'
          }}
        >
          {/* Chat/Research Slider Toggle */}
          <div>
            <div
              className="relative flex items-center select-none"
              style={{
                minWidth: 200,
                height: 36,
                background: '#F8F8F6',
                borderRadius: 10,
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                border: 'none',
                padding: 0,
                paddingRight: 2,
              }}
            >
              {/* Sliding background - with smooth transition */}
              <div
                className="absolute top-0 h-full transition-all duration-300"
                style={{
                  left: 2,
                  background: '#F2F2ED',
                  borderRadius: 10,
                  border: '1px solid #E8E8E5',
                  width: mode === 'chat' ? 'calc(40% - 10px)' : 'calc(60% + 10px)',
                  transform: mode === 'chat' ? 'translateX(0)' : `translateX(calc(66.7% - 20px))`, 
                  zIndex: 1,
                }}
              />
              {/* Chat option - with centered text */}
              <div
                className="z-10 flex items-center justify-center cursor-pointer text-sm font-medium"
                style={{
                  width: 'calc(40% - 10px)', /* Make Chat button smaller */
                  height: '100%',
                  color: '#232323',
                  fontWeight: mode === 'chat' ? 600 : 500,
                  opacity: mode === 'chat' ? 1 : 0.5,
                  background: 'transparent',
                  transition: 'color 0.2s, opacity 0.2s',
                  position: 'relative',
                  userSelect: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                }}
                onClick={() => !disabled && onModeChange('chat')}
                aria-pressed={mode === 'chat'}
                tabIndex={0}
                role="button"
              >
                <span style={{ 
                  display: 'block', 
                  textAlign: 'center', 
                  width: '100%',
                  position: 'absolute',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  paddingLeft: '4px'
                }}>
                  Chat
                  {isResearchDisabled && (
                    <span
                      ref={researchIconRef}
                      style={{ display: 'inline-block', marginLeft: 4, position: 'relative', verticalAlign: 'middle', cursor: 'pointer', pointerEvents: 'auto' }}
                      onClick={e => { 
                        e.stopPropagation(); 
                        // Close dropdowns when tooltip is opened
                        setShowFileMention(false);
                        setShowAgentMention(false);
                        setShowResearchTooltip(v => !v); 
                      }}
                    >
                      <AlertCircle className="inline-block relative" style={{ width: 14, height: 14, top: -2 }} />
                      {showResearchTooltip && (
                        <div className="absolute research-tooltip-container" style={{ left: '50%', transform: 'translateX(-50%)', bottom: '28px', minWidth: 210, zIndex: 2000 }}>
                          <div className="relative">
                            <div className="research-tooltip-arrow"></div>
                            <div className="research-tooltip-content">
                              <div className="research-tooltip-title">Web Research Disabled</div>
                              <div className="research-tooltip-text">
                                Web Research is disabled when referencing files or agents in your message. Remove @ or # to enable.
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </span>
                  )}
                </span>
              </div>
              {/* Research option - with centered text */}
              <div
                className="z-10 flex items-center justify-center cursor-pointer text-sm font-medium"
                style={{
                  width: 'calc(60% + 10px)', /* Make Web Research button larger */
                  height: '100%',
                  color: '#232323',
                  fontWeight: mode === 'research' ? 600 : 500,
                  opacity: (mode === 'research' ? 1 : 0.5) * (isResearchDisabled ? 0.5 : 1),
                  background: 'transparent',
                  transition: 'color 0.2s, opacity 0.2s',
                  position: 'relative',
                  userSelect: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  margin: '0 auto',
                  padding: 0,
                  left: 0,
                  pointerEvents: isResearchDisabled ? 'none' : 'auto', // Disable clicking when research is disabled
                }}
                onClick={() => !disabled && !isResearchDisabled && onModeChange('research')}
                aria-pressed={mode === 'research'}
                aria-disabled={isResearchDisabled}
                tabIndex={isResearchDisabled ? -1 : 0}
                role="button"
              >
                <span style={{ 
                  display: 'block', 
                  textAlign: 'center', 
                  width: '100%',
                  position: 'absolute',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  paddingLeft: '7px'
                }}>
                  Web Research
                </span>
              </div>
            </div>
          </div>
          
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
                borderRadius: '8px',
                background: isRecording ? 'var(--Error-400, #EF4444)' : 'var(--Monochrome-Superlight, #F2F2ED)',
                border: '1px solid #E8E8E5',
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
              disabled={disabled || isRecording || isTranscribing || isLoadingFileContent || !value.trim()}
              style={{
                display: 'flex',
                padding: isMobile ? '6px' : '8px',
                alignItems: 'center',
                gap: '10px',
                borderRadius: '8px',
                background: 'var(--Monochrome-Superlight, #F2F2ED)',
                border: '1px solid #E8E8E5',
                cursor: 'pointer',
                opacity: (disabled || isRecording || isTranscribing || isLoadingFileContent || !value.trim()) ? 0.5 : 1
              }}
            >
              {disabled || isLoadingFileContent ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              <span style={{ fontSize: '14px', fontWeight: 500 }}>
                {disabled ? "Processing..." : 
                 isLoadingFileContent ? "Preparing files..." : 
                 "Send"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 
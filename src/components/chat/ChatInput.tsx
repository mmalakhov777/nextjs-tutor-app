"use client";

import { useRef, useEffect, useState, useCallback, forwardRef, useMemo } from 'react';
import { Send, Loader2, Square, File, AtSign, AlertCircle, ChevronDown, FileText, Sparkles, X, BookOpen, GraduationCap, Bot, FolderOpen } from 'lucide-react';
import { FiUsers } from 'react-icons/fi';
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
import { UserCircle } from 'lucide-react';
import { getAgentDescription } from '@/data/agentDescriptions';
import React from 'react';
import type { ScenarioData } from '@/types/scenarios';
import styles from './ChatInput.module.css';
import '@/styles/chat-input-global.css';
import { 
  AGENT_REGISTRY, 
  getAgentIcon, 
  getAgentCircleColor, 
  getAgentTextColor, 
  getDisplayAgentName 
} from '@/lib/agents';
import { getToolIcon, formatToolName, getToolSampleCommand, TOOL_SAMPLE_COMMANDS } from '@/lib/tools';
import { AutoFlowModal } from './AutoFlowModal';
import { type AutoFlowExample } from '@/data/autoflows';

// Custom debounce function to avoid lodash dependency
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Define a minimal Agent type locally
type Agent = { id?: string; name: string; [key: string]: any };

// Helper function to get the backend URL
const getBackendUrl = () => {
  return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5002';
};

// Change the extractFileMentions function to use # instead of @
const extractFileMentions = (message: string): string[] => {
  // console.log("Extracting file mentions from:", message);
  
  const fileRegex = /#\[file-([a-zA-Z0-9-_]+):[^\]]+\]/g;
  const matches = message.match(fileRegex);
  
  // console.log("Regex matches:", matches);
  
  if (!matches) return [];
  
  const fileIds = matches.map(match => {
    // Extract the file ID from the match
    const idMatch = match.match(/#\[file-([a-zA-Z0-9-_]+):/);
    const fileId = idMatch ? idMatch[1] : '';
    // console.log("Extracted file ID:", fileId);
    return fileId;
  }).filter(Boolean);
  
  // console.log("Final file IDs:", fileIds);
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

// Define models available for General Assistant
const GENERAL_ASSISTANT_MODELS = [
  { id: 'gpt-4.1', name: 'GPT-4.1', isDefault: true },
  { id: 'claude', name: 'Claude Creative', icon: 'ClaudeCreativeLogo', color: '#D77655' },
  { id: 'deepseek', name: 'Deep Seek', icon: 'DeepSeekLogo', color: '#4D6BFE' },
  { id: 'mistral', name: 'Mistral Europe', icon: 'MistralLogo', color: '#FA5310' },
  { id: 'grok', name: 'Grok X', icon: 'GrokXLogo', color: '#232323' },
  { id: 'perplexity', name: 'Perplexity', icon: 'PerplexityLogo', color: '#1F1F1F' },
  { id: 'deep-thinker', name: 'Deep Thinker', icon: 'TriageAgentLogo', color: '#232323' }
];

// Generate agents list excluding the model-based ones
const MODEL_BASED_AGENTS = ['Claude Creative', 'Deep Seek', 'Mistral Europe', 'Grok X', 'Perplexity', 'Deep Thinker'];
const DEFAULT_AGENTS: Agent[] = Object.keys(AGENT_REGISTRY)
  .filter(name => !MODEL_BASED_AGENTS.includes(name))
  .map((name, index) => ({
  id: name.toLowerCase().replace(/\s+/g, '-'),
  name
}));

// Helper function to get first word for dropdown button display
const getFirstWordAgentName = (agentName: string) => {
  const displayName = getDisplayAgentName(agentName);
  return displayName.split(' ')[0]; // Return only the first word
};

  // Helper function to get descriptive placeholder based on selected agent
  const getAgentPlaceholder = (agentName: string) => {
    const placeholders: Record<string, string> = {
      'General Assistant': 'Ask anything - general questions, help with tasks, explanations...',
      'SEO Agent': 'Ask about SEO strategies, keyword research, content optimization...',
      'Claude Creative': 'Ask for creative writing, brainstorming, artistic ideas...',
      'Perplexity': 'Ask for research, fact-checking, current information...',
      'Deep Seek': 'Ask about Chinese culture, business, language, or deep analysis...',
      'Mistral Europe': 'Ask about European culture, languages, regulations, business...',
      'Deep Thinker': 'Ask for complex analysis, reasoning, philosophical questions...',
      'Grok X': 'Ask about social media trends, viral content, latest news...',
      'Content Writer Agent': 'Ask for professional content creation, articles, copy...',
      'Flash Card Maker': 'Ask to create study flashcards from any topic or material...',
      'Web Researcher': 'Ask for deep web research, data analysis, investigation...',
      'YouTube Agent': 'Ask for video analysis, transcripts, YouTube content help...',
      'CV Writer Agent': 'Ask for professional CV and resume writing assistance...',
      'Presentation Creator Agent': 'Ask to create and edit slide presentations...'
    };
    
    return placeholders[agentName] || 'Ask anything. Type # for files';
  };



  // Helper function to get agent tools from AGENT_REGISTRY
  const getAgentTools = (agentName: string) => {
    const config = AGENT_REGISTRY[agentName as keyof typeof AGENT_REGISTRY];
    if (!config?.tools) return [];
    
    return Object.keys(config.tools);
  };



// Extend ChatInputProps to include optional displayMessage parameter
export interface ExtendedChatInputProps extends Omit<ChatInputProps, 'value' | 'onChange'> {
  value: string; // Value is now a prop
  onChange: (value: string) => void; // onChange now passes string directly
  currentAgent?: string; 
  onAgentChange?: (agentName: string) => void; 
  isCompactLayout?: boolean; 
  currentScenario?: ScenarioData | null; // Add current scenario prop
  sessionId?: string; // Add session ID prop
  activeScenario?: ScenarioData | null; // Add active scenario prop
  onContinueScenario?: () => void; // Add continue scenario callback
  activeScenarioProgress?: {
    scenario: ScenarioData;
    currentStep: number;
    completedSteps: number[];
    triggeredActions: Record<string, boolean>;
  } | null; // Add active scenario progress prop
  rightSidebarWide?: boolean; // Add right sidebar width prop
  rightSidebarExtraWide?: boolean; // Add extra wide sidebar prop
  onScenarioGenerate?: (prompt: string) => void; // Add scenario generation callback
  isGeneratingScenario?: boolean; // Add generating scenario state
  showRightSidebar?: boolean; // Add prop to detect if AgentsSidebar is open
  rightSidebarWidth?: number; // Add dynamic right sidebar width prop
  containerWidth?: number; // Add container width for dynamic padding
  showLeftSidebar?: boolean;
  onToggleLeftSidebar?: () => void; // Add toggle function for FileSidebar
  chatHistory?: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    agentName?: string;
  }>; // Add chat history for agent selection context
  isNoMessageState?: boolean; // Add prop to indicate no-message state
  isMobileDevice?: boolean; // Add mobile detection prop
  onMobileTabChange?: (tab: 'chat' | 'files' | 'assets') => void; // Add mobile tab change callback
}

// Helper function to get agent border color
const getAgentBorderColor = (agentName: string): string => {
  const normalizedName = agentName === 'Triage Agent' ? 'General Assistant' : agentName;
  
  // Map agent names to their border colors
  const agentColors: Record<string, string> = {
    'General Assistant': '#10B981', // emerald-500
    'SEO Agent': '#FF6B35',
    'Claude Creative': '#D77655',
    'Perplexity': '#1F1F1F',
    'Deep Seek': '#4D6BFE',
    'Mistral Europe': '#FA5310',
    'Deep Thinker': '#232323',
    'Grok X': '#232323',
    'Content Writer Agent': '#8B5CF6',
    'Flash Card Maker': '#10B981',
    'Web Researcher': '#0EA5E9',
    'YouTube Agent': '#FF0000',
    'CV Writer Agent': '#059669',
    'Presentation Creator Agent': '#9333EA'
  };
  
  return agentColors[normalizedName] || '#E5E7EB'; // gray-200 fallback
};

// Helper function to get agent styling with inline styles
const getAgentInlineStyles = (agentName: string, isAutoFlow: boolean = false) => {
  // Use #232323 styling for Tasks mode
  if (isAutoFlow) {
    return {
      borderColor: '#232323',
      backgroundColor: 'rgba(35, 35, 35, 0.1)', // Very subtle #232323 background tint
      boxShadow: `0px 0px 20px 0px rgba(203, 203, 203, 0.20), 0 0 0 1px rgba(35, 35, 35, 0.3)`
    };
  }
  
  const borderColor = getAgentBorderColor(agentName);
  
  // Convert hex to rgba for shadow and background
  const hexToRgba = (hex: string, alpha: number = 0.2) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };
  
  return {
    borderColor: borderColor,
    backgroundColor: hexToRgba(borderColor, 0.1), // Very subtle background tint
    boxShadow: `0px 0px 20px 0px rgba(203, 203, 203, 0.20), 0 0 0 1px ${hexToRgba(borderColor, 0.3)}`
  };
};

export function ChatInput({
  value, // Receive value as a prop
  onChange, // Receive onChange as a prop
  onSend,
  disabled,
  currentAgent = 'General Assistant', 
  onAgentChange,
  isCompactLayout,
  currentScenario,
  sessionId,
  activeScenario,
  onContinueScenario,
  activeScenarioProgress,
  rightSidebarWide = false,
  rightSidebarExtraWide = false,
  onScenarioGenerate,
  isGeneratingScenario = false,
  showRightSidebar = false,
  rightSidebarWidth,
  containerWidth = 0,
  showLeftSidebar,
  onToggleLeftSidebar,
  chatHistory = [],
  isNoMessageState = false,
  isMobileDevice = false,
  onMobileTabChange
}: ExtendedChatInputProps) { 
  // Refs for functionality
  const textareaRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isProcessingChangeRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const researchIconRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const templateTipsRef = useRef<HTMLDivElement>(null); // Add ref for template tips container
  
  // Responsive state
  const [isVerySmall, setIsVerySmall] = useState(false);
  const [isSmall, setIsSmall] = useState(false);
  // Use prop-based mobile detection to avoid hydration mismatch
  const isMobile = isMobileDevice;
  
  // Local state for value management
  const [localValue, setLocalValue] = useState(value || '');
  
  // State for dropdowns and interactions
  const [showFileMention, setShowFileMention] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [selectedAgent, setSelectedAgent] = useState<string>(currentAgent || 'General Assistant');
  
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  
  // UI state
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackData, setFeedbackData] = useState<{ message: string; agentName: string } | null>(null);
  const [isLoadingFileContent, setIsLoadingFileContent] = useState(false);
  const [showResearchTooltip, setShowResearchTooltip] = useState(false); 

  // Tasks mode state
  const [isAutoFlow, setIsAutoFlow] = useState(false);
  
  // Scenario mode state
  const [isScenarioMode, setIsScenarioMode] = useState(false);
  const [selectedScenarioTab, setSelectedScenarioTab] = useState<'generate' | 'saved' | null>(null);
  const [showAutoFlowModal, setShowAutoFlowModal] = useState(false);
  
  // Template tips state
  const [selectedTemplate, setSelectedTemplate] = useState<AutoFlowExample | null>(null);
  const [showTemplateTips, setShowTemplateTips] = useState(false);
  const [usedTipIndexes, setUsedTipIndexes] = useState<number[]>([]);
  
  // File context
  const { uploadedFiles, setUploadedFiles } = useFileContext();
  
  // State to track files when sidebar is closed
  const [fileCount, setFileCount] = useState(0);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  
  // Function to fetch files from database
  const fetchUploadedFiles = useCallback(async () => {
    console.log('[ChatInput] fetchUploadedFiles called with sessionId:', sessionId);
    if (!sessionId) {
      console.log('[ChatInput] No sessionId, skipping file fetch');
      return;
    }
    
    setIsLoadingFiles(true);
    console.log('[ChatInput] Starting to fetch files for session:', sessionId);
    
    try {
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/files?chat_session_id=${encodeURIComponent(sessionId)}`);
      
      if (response.ok) {
        const data = await response.json();
        // Handle both array response and object with files property
        const files = Array.isArray(data) ? data : (data.files || []);
        
        // Update file context
        setUploadedFiles(files);
        setFileCount(files.length);
        
        console.log('[ChatInput] Fetched files from database:', files.length);
      } else {
        console.warn('[ChatInput] Failed to fetch files:', response.status);
        setFileCount(0);
      }
    } catch (error) {
      console.error('[ChatInput] Error fetching files:', error);
      setFileCount(0);
    } finally {
      setIsLoadingFiles(false);
    }
  }, [sessionId, setUploadedFiles]);

  // Fetch files on mount and when sessionId changes
  useEffect(() => {
    console.log('[ChatInput] sessionId changed:', sessionId, 'triggering fetchUploadedFiles');
    fetchUploadedFiles();
  }, [fetchUploadedFiles, sessionId]);

  // Update file count when uploadedFiles changes (from context)
  useEffect(() => {
    setFileCount(uploadedFiles.length);
  }, [uploadedFiles]);

  // Dynamic responsive breakpoints - update on window resize
  useEffect(() => {
    const updateBreakpoints = () => {
      if (typeof window !== 'undefined') {
        const windowWidth = window.innerWidth;
        
        // Base breakpoints
        let verySmallThreshold = 480;
        let smallThreshold = 640;
        
        // Adjust thresholds based on sidebar state
        if (showRightSidebar && rightSidebarWidth) {
          // Dynamic sidebar - adjust based on actual width
          const baseThreshold = 640;
          const sidebarWidthFactor = rightSidebarWidth / 100; // Convert to factor
          verySmallThreshold = baseThreshold + sidebarWidthFactor * 100;
          smallThreshold = verySmallThreshold + 200;
        } else if (rightSidebarExtraWide) {
          // Extra wide sidebar (Notes) - be very aggressive with compacting
          verySmallThreshold = 1200; // Show compact UI much earlier
          smallThreshold = 1400;
        } else if (rightSidebarWide) {
          // Wide sidebar (Scenarios) - moderate compacting
          verySmallThreshold = 900;
          smallThreshold = 1100;
        }
        
        setIsVerySmall(windowWidth < verySmallThreshold);
        setIsSmall(windowWidth < smallThreshold);
      }
    };

    // Only update after hydration to prevent hydration mismatch
    const timer = setTimeout(updateBreakpoints, 0);

    // Add resize listener
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', updateBreakpoints);
    }

    // Cleanup
    return () => {
      clearTimeout(timer);
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', updateBreakpoints);
      }
    };
  }, [rightSidebarWide, rightSidebarExtraWide, rightSidebarWidth, showRightSidebar]); // Add sidebar state to dependencies

  // Sync local value with prop value ONLY when prop changes externally (like clearing after send)
  useEffect(() => {
    if (value !== localValue) {
      setLocalValue(value);
      // Update contentEditable content when value changes externally
      if (textareaRef.current) {
        if (value.trim() === '') {
          // Clear all HTML content when value is empty to prevent highlighting artifacts
          textareaRef.current.innerHTML = '';
        } else {
          textareaRef.current.textContent = value;
        }
      }
    }
  }, [value]); // Only sync when prop value changes

  // Reset scenario-related UI state when currentScenario becomes null (new chat started)
  useEffect(() => {
    if (currentScenario === null) {
      // Close any open scenario-related dropdowns or modals
      setShowFileMention(false);
      setMentionSearch('');
      setSelectedFileIndex(0);
      
      // Reset template tips
      setShowTemplateTips(false);
      setSelectedTemplate(null);
      setUsedTipIndexes([]);
      
      // Reset any scenario-related local state if needed
      console.log('ChatInput: Scenario reset detected, clearing scenario-related UI state');
    }
  }, [currentScenario]);

  // Hide template tips when scenario mode is disabled
  useEffect(() => {
    if (!isScenarioMode && showTemplateTips) {
      setShowTemplateTips(false);
      setSelectedTemplate(null);
    }
  }, [isScenarioMode, showTemplateTips]);

  // COMPLETELY INDEPENDENT auto-resize - only depends on local value
  const debouncedResize = useCallback(
    debounce((inputValue: string) => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
      }
    }, 50), // Reduced debounce time for better responsiveness
    []
  );

  useEffect(() => {
    debouncedResize(localValue);
  }, [localValue, debouncedResize]);

  // Reset textarea height when layout changes (sidebar states change)
  useEffect(() => {
    if (textareaRef.current && localValue.trim() === '') {
      // Reset height to auto when content is empty and layout changes
      textareaRef.current.style.height = 'auto';
      // Force a minimal height for empty content
      setTimeout(() => {
        if (textareaRef.current && localValue.trim() === '') {
          textareaRef.current.style.height = 'auto';
        }
      }, 100);
    }
  }, [showLeftSidebar, showRightSidebar, rightSidebarWide, rightSidebarExtraWide, localValue]);

  // Forcefully clean highlighting when text becomes empty (0 symbols)
  useEffect(() => {
    if (localValue.trim() === '' && textareaRef.current) {
      // Force clean any residual HTML highlighting when text is empty
      if (textareaRef.current.innerHTML !== '') {
        isProcessingChangeRef.current = true;
        textareaRef.current.innerHTML = '';
        textareaRef.current.textContent = '';
        setTimeout(() => {
          isProcessingChangeRef.current = false;
        }, 0);
      }
    }
    // Also clear HTML if text doesn't contain # but innerHTML has formatting
    else if (!localValue.includes('#') && textareaRef.current) {
      const currentHTML = textareaRef.current.innerHTML;
      if (currentHTML.includes('<span') || currentHTML !== localValue) {
        isProcessingChangeRef.current = true;
        textareaRef.current.innerHTML = '';
        textareaRef.current.textContent = localValue;
        setTimeout(() => {
          isProcessingChangeRef.current = false;
        }, 0);
      }
    }
  }, [localValue]); // Watch for changes in localValue

  // Sync with currentAgent prop when it changes externally (e.g., from AI selection)
  useEffect(() => {
    // Update selectedAgent when currentAgent changes to a different value
    if (currentAgent && currentAgent !== selectedAgent) {
      setSelectedAgent(currentAgent);
    }
  }, [currentAgent, selectedAgent]); // Re-run when currentAgent changes

  // Helper function to append sample command to textarea
  const appendSampleCommand = useCallback((toolName: string) => {
    if (!textareaRef.current) return;
    
    const sampleCommand = getToolSampleCommand(toolName);
    const currentText = localValue;
    
    // Add the sample command to the current text
    // If there's existing text, add a space before the command
    const newText = currentText.trim() 
      ? `${currentText} ${sampleCommand}` 
      : sampleCommand;
    
    // Update the textarea content
    textareaRef.current.textContent = newText;
    
    // Update local state
    setLocalValue(newText);
    
    // Update parent state
    onChange(newText);
    
    // Focus the textarea and set cursor at the end
    textareaRef.current.focus();
    const range = document.createRange();
    const selection = window.getSelection();
    range.selectNodeContents(textareaRef.current);
    range.collapse(false); // Collapse to end
    selection?.removeAllRanges();
    selection?.addRange(range);
    
    // Trigger resize
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [localValue, onChange]);

  // No manual selection handlers needed - all automatic

  // OPTIMIZED file filtering with useMemo
  const filteredFiles = useMemo(() => {
    if (!mentionSearch) return uploadedFiles;
    const searchLower = mentionSearch.toLowerCase();
    return uploadedFiles.filter(file => 
      (file.doc_title || file.name).toLowerCase().includes(searchLower)
    );
  }, [uploadedFiles, mentionSearch]);

  // Handle keyboard navigation in file dropdown
  const handleFileDropdownKeyNavigation = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!showFileMention) return;
    
    const effectiveFilteredFiles = mentionSearch.toLowerCase().startsWith('all') || uploadedFiles.length === 0 
      ? [{ id: 'all', name: 'All Files' }] // Include "All Files" if search starts with "all" or no files match
      : [{ id: 'all', name: 'All Files' }, ...uploadedFiles];
      
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
  
  // Reset selected index when dropdown opens or filtered items change
  useEffect(() => {
    if (showFileMention) {
      setSelectedFileIndex(0); // Reset file index
    }
  }, [showFileMention, mentionSearch]);

  // SIMPLIFIED key press handling
  const handleKeyPress = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Handle file dropdown navigation first
    if (showFileMention) {
      handleFileDropdownKeyNavigation(e);
      return;
    }

    // Handle send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
      return;
    }

    // Handle escape to close dropdowns
    if (e.key === 'Escape') {
      setShowFileMention(false);
      return;
    }
  };
  
  // COMPLETELY INDEPENDENT input change handler for contentEditable
  const handleInputChange = (e: React.FormEvent<HTMLDivElement>) => {
    if (isProcessingChangeRef.current) {
      return;
    }

    const newValue = e.currentTarget.textContent || '';
    
    // If text is completely empty, clear any residual HTML to prevent highlighting artifacts
    if (newValue.trim() === '' && textareaRef.current) {
      textareaRef.current.innerHTML = '';
    }
    
    // If text doesn't contain #, aggressively clear all HTML formatting
    if (!newValue.includes('#') && textareaRef.current) {
      // Force plain text only - remove any HTML formatting
      if (textareaRef.current.innerHTML !== newValue) {
        const cursorPos = getCursorPosition();
        textareaRef.current.innerHTML = '';
        textareaRef.current.textContent = newValue;
        
        // Restore cursor position after clearing formatting
        setTimeout(() => {
          if (textareaRef.current) {
            setCursorPosition(cursorPos);
          }
        }, 0);
      }
    }
    
    // Update local state immediately - NO DEPENDENCIES
    setLocalValue(newValue);
    
    // No manual agent selection - all automatic
    
    // Simple file mention detection - no complex processing
    if (newValue.endsWith('#') && !showFileMention) {
      setShowFileMention(true);
      setMentionSearch('');
    } else if (!newValue.includes('#') && showFileMention) {
      setShowFileMention(false);
    }
    
    // ONLY call parent onChange when we need to persist the value
    // This prevents unnecessary re-renders in parent components
    onChange(newValue);
    
    // Only apply highlights if text contains # (potential file mentions)
    if (newValue.includes('#')) {
      setTimeout(() => {
        applyHighlightsWithCursor();
      }, 50);
    }
  };
  
  // Helper function to get cursor position in contentEditable
  const getCursorPosition = (): number => {
    if (!textareaRef.current) return 0;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return 0;
    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(textareaRef.current);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    return preCaretRange.toString().length;
  };

  // Helper function to set cursor position in contentEditable
  const setCursorPosition = (position: number) => {
    if (!textareaRef.current) return;
    const selection = window.getSelection();
    if (!selection) return;
    
    const range = document.createRange();
    let charCount = 0;
    let targetNode: Node | null = null;
    let targetOffset = 0;
    
    // Walk through all text nodes to find the position
    const walker = document.createTreeWalker(
      textareaRef.current,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    let node;
    while (node = walker.nextNode()) {
      const nodeLength = node.textContent?.length || 0;
      if (charCount + nodeLength >= position) {
        targetNode = node;
        targetOffset = position - charCount;
        break;
      }
      charCount += nodeLength;
    }
    
    if (targetNode) {
      range.setStart(targetNode, targetOffset);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      // Fallback: set cursor at the end
      range.selectNodeContents(textareaRef.current);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  };
  
  // SIMPLIFIED file mention insertion - uses local value
  const insertFileMention = (file: UploadedFile | 'all') => {
    if (!textareaRef.current || isProcessingChangeRef.current) {
      return;
    }

    const cursorPos = getCursorPosition();
    const currentText = textareaRef.current.textContent || '';
    const textBeforeCursor = currentText.substring(0, cursorPos);
    const textAfterCursor = currentText.substring(cursorPos);
    
    const hashIndex = textBeforeCursor.lastIndexOf('#');
    
    if (hashIndex === -1) {
      setShowFileMention(false);
      return;
    }

    let displayName: string;
    let newText: string;
    
    if (file === 'all') {
      displayName = 'All Files';
    } else {
      displayName = file.doc_title || file.name;
    }
    
    // Simple text replacement
    newText = textBeforeCursor.substring(0, hashIndex) + 
              `#${displayName} ` + 
              textAfterCursor;
    
    // Set processing flag briefly
    isProcessingChangeRef.current = true;
    
    // Update contentEditable content
    textareaRef.current.textContent = newText;
    
    // Update local value immediately
    setLocalValue(newText);
    
    // Update parent value
    onChange(newText);
    
    // Reset flag and close dropdown
    setShowFileMention(false);
    
    // Reset processing flag after a brief delay
    setTimeout(() => {
      isProcessingChangeRef.current = false;
      
      // Focus and set cursor position
      if (textareaRef.current) {
        const newCursorPos = hashIndex + `#${displayName} `.length;
        textareaRef.current.focus();
        setCursorPosition(newCursorPos);
        
        // Apply highlights after insertion
        setTimeout(() => {
          applyHighlightsWithCursor();
        }, 10);
      }
    }, 50); // Increased delay for stability
  };

  // Update the triggerDropdown function to position dropdowns above
  const triggerDropdown = (symbol: '#') => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      setMentionSearch('');
      setShowFileMention(true);
    }
  };
  
  // SIMPLIFIED recording functions - completely independent
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, sampleRate: 16000 }
      });

      const mediaRecorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        
        try {
          setIsTranscribing(true);
          const text = await speechToText(audioBlob);
          if (text) {
            setLocalValue(text);
            onChange(text);
          }
        } catch (error) {
          toast.error('Failed to process audio. Please try again.');
        } finally {
          setIsRecording(false);
          setIsTranscribing(false);
          stream.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100);
      setIsRecording(true);
      setLocalValue(''); // Clear local input when starting recording
      onChange(''); // Clear parent input
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setRecordingError('Failed to start recording: ' + errorMessage);
      toast.error('Failed to start recording: ' + errorMessage);
      setIsRecording(false);
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    } else {
      setIsRecording(false);
      setIsTranscribing(false);
    }
  };
  
  const toggleRecording = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      await startRecording();
    }
  };

  // Cleanup effect for recording
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  // SIMPLIFIED file processing helper
  const processFileReferences = (message: string): string => {
    let processedMessage = message;
    
    // Simple file title replacement
    for (const file of uploadedFiles) {
      const fileTitle = file.doc_title || file.name;
      if (!fileTitle) continue;
      
      const titlePattern = `#${fileTitle}`;
      if (processedMessage.includes(titlePattern)) {
        processedMessage = processedMessage.replace(
          titlePattern, 
          `#[file-${file.id}:${file.name}]`
        );
      }
    }
    
    return processedMessage;
  };

  // State for agent selection
  const [isSelectingAgent, setIsSelectingAgent] = useState(false);
  const [selectedAgentByAI, setSelectedAgentByAI] = useState<string | null>(null);

  // Sync selectedAgent with AI selection
  useEffect(() => {
    if (selectedAgentByAI && selectedAgentByAI !== selectedAgent) {
      setSelectedAgent(selectedAgentByAI);
    }
  }, [selectedAgentByAI, selectedAgent]);

  // SIMPLIFIED send handler - completely independent
  const handleSend = async () => {
    if (!localValue.trim() || disabled || isRecording || isTranscribing) {
      return;
    }

    // If in scenario mode, Generate Flow instead of sending message
    if (isScenarioMode && onScenarioGenerate) {
      let scenarioPrompt = localValue;
      
      onScenarioGenerate(scenarioPrompt);
      // Clear local input immediately
      setLocalValue('');
      // Clear parent input
      if (!isProcessingChangeRef.current) {
        onChange('');
      }
      return;
    }

    // Step 1: AI Agent Selection
    setIsSelectingAgent(true);
    setSelectedAgentByAI(null);
    
    let finalAgentToUse = selectedAgent; // Default to current agent
    
    try {
      // Call agent selection API
      const agentSelectionResponse = await fetch('/api/chat/agent-transition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: localValue,
          currentAgent: selectedAgent,
          chatHistory: chatHistory, // Include chat history for better context
        })
      });

      if (agentSelectionResponse.ok) {
        const agentResult = await agentSelectionResponse.json();
        
        if (agentResult.success && agentResult.selectedAgent) {
          const recommendedAgent = agentResult.selectedAgent;
          console.log('🤖 AI Auto-selected Agent:', recommendedAgent, '(Confidence:', agentResult.confidence + ')');
          console.log('[ChatInput][AUTO_AGENT_DECISION] Auto-selected agent:', recommendedAgent, '| user message:', localValue, '| confidence:', agentResult.confidence);
          // Set the AI-selected agent in state
          setSelectedAgentByAI(recommendedAgent);
          
          // Update local state immediately
          setSelectedAgent(recommendedAgent);
          
          // Force parent component to update
          if (onAgentChange) {
            onAgentChange(recommendedAgent);
          }
          
          // Use the recommended agent for sending
          finalAgentToUse = recommendedAgent;
          
          // Additional delay to ensure the change takes effect
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Double-check and force again if needed
          if (onAgentChange) {
            onAgentChange(recommendedAgent);
          }
          
          // Show brief delay to display the selection
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } else {
        console.error('Agent selection API failed:', agentSelectionResponse.status);
        console.log('[ChatInput][AUTO_AGENT_DECISION] Agent selection API failed, using current agent:', selectedAgent, '| user message:', localValue);
      }
    } catch (error) {
      console.error('Agent selection failed:', error);
      console.log('[ChatInput][AUTO_AGENT_DECISION] Agent selection error, using current agent:', selectedAgent, '| user message:', localValue, '| error:', error);
      // Continue with current agent if selection fails
    }
    
    setIsSelectingAgent(false);
    setIsLoadingFileContent(true);
    
    // Use the determined agent
    const agentToUse = finalAgentToUse;
    console.log('🎯 Determined agentToUse:', agentToUse, '(finalAgentToUse:', finalAgentToUse, ', selectedAgent:', selectedAgent, ')');
    
    try {
      const displayMessage = localValue;
      let processedMessage = localValue;
      
      // Process file references if message contains #
      if (localValue.includes('#')) {
        processedMessage = processFileReferences(localValue);
      }
      
      // Add file metadata from current session only (from FileContext)
      if (uploadedFiles.length > 0) {
        // Create metadata from current session's uploaded files
        const currentSessionFilesMetadata = uploadedFiles.map(file => ({
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
          status: file.status
        }));
        
        console.log('[CHATINPUT][FILES_METADATA] Processing current session file metadata:', {
          totalFiles: currentSessionFilesMetadata.length,
          fileIds: currentSessionFilesMetadata.map(f => f.id),
          fileNames: currentSessionFilesMetadata.map(f => f.name || f.doc_title),
          metadataSize: JSON.stringify(currentSessionFilesMetadata).length
        });
        
        const metadataSection = `\n\n__FILES_METADATA__\n${JSON.stringify(currentSessionFilesMetadata)}\n__END_FILES_METADATA__`;
        processedMessage = processedMessage + metadataSection;
        
        console.log('[CHATINPUT][FILES_METADATA] Added current session metadata section to message:', {
          sectionLength: metadataSection.length,
          totalMessageLength: processedMessage.length
        });
      } else {
        console.log('[CHATINPUT][FILES_METADATA] No files in current session');
      }
      
      // If files are specifically mentioned with #, fetch their content from backend
      if (localValue.includes('#')) {
        const fileIds = extractFileMentions(processedMessage);
        
        if (fileIds.length > 0) {
          // Fetch content for specifically mentioned files
          const fileContents = [];
          
          for (const fileId of fileIds) {
            const file = uploadedFiles.find(f => f.id === fileId);
            if (!file) continue;
            
            try {
              const backendUrl = getBackendUrl();
              const response = await fetch(`${backendUrl}/api/files/${fileId}/content`);
              if (response.ok) {
                const data = await response.json();
                const fileContent = data.content || '';
                
                fileContents.push({
                  id: fileId,
                  name: file.name,
                  content: fileContent
                });
              } else {
                console.warn(`Failed to fetch content for file ${fileId}: ${response.status}`);
                fileContents.push({
                  id: fileId,
                  name: file.name,
                  content: 'Content unavailable'
                });
              }
            } catch (error) {
              console.warn(`Error fetching content for file ${fileId}:`, error);
              fileContents.push({
                id: fileId,
                name: file.name,
                content: 'Content unavailable'
              });
            }
          }
          
          // Add file contents to the message
          if (fileContents.length > 0) {
            const contentSection = `\n\n__FILE_CONTENTS__\n${JSON.stringify(fileContents)}\n__END_FILE_CONTENTS__`;
            processedMessage = processedMessage + contentSection;
          }
        } else if (/#All Files|#All|#all files|#allfiles/i.test(processedMessage)) {
          // Handle "All Files" case - fetch content for all files
          const allFileContents = [];
          
          for (const file of uploadedFiles) {
            try {
              const backendUrl = getBackendUrl();
              const response = await fetch(`${backendUrl}/api/files/${file.id}/content`);
              if (response.ok) {
                const data = await response.json();
                const fileContent = data.content || '';
                
                allFileContents.push({
                  id: file.id,
                  name: file.name,
                  content: fileContent
                });
              } else {
                console.warn(`Failed to fetch content for file ${file.id}: ${response.status}`);
                allFileContents.push({
                  id: file.id,
                  name: file.name,
                  content: 'Content unavailable'
                });
              }
            } catch (error) {
              console.warn(`Error fetching content for file ${file.id}:`, error);
              allFileContents.push({
                id: file.id,
                name: file.name,
                content: 'Content unavailable'
              });
            }
          }
          
          // Add all file contents to the message
          if (allFileContents.length > 0) {
            const contentSection = `\n\n__FILE_CONTENTS__\n${JSON.stringify(allFileContents)}\n__END_FILE_CONTENTS__`;
            processedMessage = processedMessage + contentSection;
          }
        }
      }
      
      // Send the message
      console.log('[CHATINPUT][SEND] About to call onSend with agent:', agentToUse, '(selectedAgentByAI:', selectedAgentByAI, ', selectedAgent:', selectedAgent, ')');
      console.log('[CHATINPUT][SEND] Final message details:', {
        agent: agentToUse,
        displayMessageLength: displayMessage.length,
        processedMessageLength: processedMessage.length,
        hasFilesMetadata: processedMessage.includes('__FILES_METADATA__'),
        hasFileContents: processedMessage.includes('__FILE_CONTENTS__'),
        displayMessage: displayMessage.substring(0, 200) + '...',
        processedMessagePreview: processedMessage.substring(0, 500) + '...'
      });
      onSend(processedMessage, displayMessage, agentToUse);
      
      // Clear local input immediately
      setLocalValue('');
      
      // Clear parent input
      if (!isProcessingChangeRef.current) {
        onChange('');
      }
      
      // Reset AI selection state after sending
      setSelectedAgentByAI(null);
      
    } catch (error) {
      console.error("Error processing message:", error);
      // Fallback: send original message
      const agentToUse = selectedAgentByAI || selectedAgent;
      onSend(localValue, localValue, agentToUse);
      
      // Clear inputs on error too
      setLocalValue('');
      if (!isProcessingChangeRef.current) {
        onChange('');
      }
      
      // Reset AI selection state on error too
      setSelectedAgentByAI(null);
    } finally {
      setIsLoadingFileContent(false);
    }
  };

  // SIMPLIFIED memoized values
  const getMentionedFiles = useMemo((): UploadedFile[] => {
    if (!localValue || !localValue.includes('#')) return [];
    
    // Handle "All Files" mentions
    if (localValue.includes('#All Files') || localValue.includes('#All') || localValue.includes('#all')) {
      if (uploadedFiles.length === 0) return [];
      
      return [{
        ...uploadedFiles[0],
        id: "all-files-placeholder",
        name: "All Files",
        doc_title: "All Files"
      }];
    }
    
    // Handle individual file mentions
    const mentionedFiles: UploadedFile[] = [];
    
    // Look for individual file mentions by checking against available files
    for (const file of uploadedFiles) {
      const fileTitle = file.doc_title || file.name;
      if (fileTitle && localValue.includes(`#${fileTitle}`)) {
        mentionedFiles.push(file);
      }
    }
    
    return mentionedFiles;
  }, [localValue, uploadedFiles]);

  // Helper function to get agent description
  const getDescription = (agent: Agent) => {
    if (agent.description) {
      return agent.description;
    }
    return getAgentDescription(agent.name);
  };

  // Helper function to get template tips
  const handleTipClick = (tip: string, tipIndex: number) => {
    // Insert the tip into the textarea
    const currentValue = value || '';
    const newValue = currentValue ? `${currentValue} ${tip}` : tip;
    
    // Update the textarea value
    setLocalValue(newValue);
    onChange(newValue);
    
    // Update the textarea content
    if (textareaRef.current) {
      textareaRef.current.textContent = newValue;
    }
    
    // Mark this tip as used
    setUsedTipIndexes(prev => [...prev, tipIndex]);
    
    // Focus the textarea
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        // Place cursor at the end
        const range = document.createRange();
        const selection = window.getSelection();
        range.selectNodeContents(textareaRef.current);
        range.collapse(false);
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    }, 10);
  };

  const getTemplateTips = (template: AutoFlowExample) => {
    const tips: Record<string, string[]> = {
      'market-research': [
        'Research [industry] market for [target audience]',
        'Include competitor analysis and market size',
        'Focus on [geographic scope] - local, national, or global',
        'Analyze pricing strategies and trends',
        'Add SWOT analysis and growth opportunities'
      ],
      'seo-article': [
        'Create SEO article about [your topic]',
        'Focus on [target audience]', 
        'Include keywords: [keyword1, keyword2, keyword3]',
        'Make it [word count] with [tone] tone',
        'Target [search intent] search intent'
      ],
      'learning-curriculum': [
        'Design learning curriculum for [subject]',
        'From [current level] to [target level]',
        'Duration: [timeframe]',
        'Include [learning methods]',
        'Focus on [specific goals]'
      ],
      'content-strategy': [
        'Develop content strategy for [business type]',
        'Target audience: [audience]',
        'Channels: [platforms]',
        'Content types: [formats]',
        'Timeline: [duration]'
      ],
      'business-plan': [
        'Create business plan for [business idea]',
        'Industry: [sector]',
        'Target market: [audience]',
        'Business model: [model type]',
        'Funding goal: [amount]'
      ],
      'research-project': [
        'Design research project on [topic]',
        'Research question: [question]',
        'Methodology: [approach]',
        'Target population: [group]',
        'Data collection: [methods]'
      ]
    };
    
    return tips[template.id] || [
      'Describe your task clearly',
      'Include specific requirements',
      'Mention target audience',
      'Set clear objectives',
      'Specify timeline if needed'
    ];
  };

  // Simplified agent lists
  const displayAgents = DEFAULT_AGENTS;
  const safeSelectedAgent = selectedAgent;

  // Helper function to escape regex special characters
  const escapeRegExp = (string: string): string => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  // Function to format text with highlighted file mentions
  const formatTextWithHighlights = (text: string): string => {
    if (!text) return '';
    
    // Emergency check - if text doesn't contain #, return as-is
    if (!text.includes('#')) return text;
    
    let formattedText = text;
    let hasAnyMatches = false;
    
    // Replace individual file mentions with highlighted spans
    // Only highlight if the pattern starts with # and matches exactly
    for (const file of uploadedFiles) {
      const fileTitle = file.doc_title || file.name;
      if (fileTitle) {
        const pattern = `#${fileTitle}`;
        // Use word boundary to ensure we only match complete file mentions that start with #
        const regex = new RegExp(`(^|\\s)(${escapeRegExp(pattern)})(?=\\s|$)`, 'g');
        const matches = formattedText.match(regex);
        if (matches) {
          hasAnyMatches = true;
          formattedText = formattedText.replace(regex, (match, prefix, fileMention) => {
            return `${prefix}<span class="${styles.fileHighlight}">${fileMention}</span>`;
          });
        }
      }
    }
    
    // Handle "All Files" mentions - only if they start with # and are complete matches
    const allFilesPatterns = ['#All Files', '#All', '#all'];
    for (const pattern of allFilesPatterns) {
      // Use word boundary to ensure we only match complete mentions that start with #
      const regex = new RegExp(`(^|\\s)(${escapeRegExp(pattern)})(?=\\s|$)`, 'g');
      const matches = formattedText.match(regex);
      if (matches) {
        hasAnyMatches = true;
        formattedText = formattedText.replace(regex, (match, prefix, fileMention) => {
          return `${prefix}<span class="${styles.fileHighlight}">${fileMention}</span>`;
        });
      }
    }
    
    // Emergency fallback - if no matches found but formatting changed, return original
    if (!hasAnyMatches && formattedText !== text) {
      return text;
    }
    
    return formattedText;
  };

  // Apply highlights when focus is lost
  const applyHighlights = () => {
    if (textareaRef.current) {
      const text = textareaRef.current.textContent || '';
      const formattedText = formatTextWithHighlights(text);
      textareaRef.current.innerHTML = formattedText;
    }
  };

  // Apply highlights while preserving cursor position
  const applyHighlightsWithCursor = () => {
    if (!textareaRef.current || isProcessingChangeRef.current) return;
    
    const text = textareaRef.current.textContent || '';
    
    // Only proceed if there are potential file mentions (contains #)
    if (!text.includes('#')) return;
    
    // Check if there are actual valid file mentions
    let hasValidMentions = false;
    
    // Check for "All Files" mentions - must be exact matches starting with #
    const allFilesPatterns = ['#All Files', '#All', '#all'];
    for (const pattern of allFilesPatterns) {
      // Use exact word boundary matching - must be complete words
      const regex = new RegExp(`(^|\\s)(${escapeRegExp(pattern)})(?=\\s|$)`, 'g');
      if (regex.test(text)) {
        hasValidMentions = true;
        break;
      }
    }
    
    // Check for individual file mentions - must start with # and match exactly
    if (!hasValidMentions) {
      for (const file of uploadedFiles) {
        const fileTitle = file.doc_title || file.name;
        if (fileTitle) {
          const pattern = `#${fileTitle}`;
          // Use exact word boundary matching - must be complete words starting with #
          const regex = new RegExp(`(^|\\s)(${escapeRegExp(pattern)})(?=\\s|$)`, 'g');
          if (regex.test(text)) {
            hasValidMentions = true;
            break;
          }
        }
      }
    }
    
    // Only apply highlights if there are valid mentions
    if (!hasValidMentions) return;
    
    const cursorPos = getCursorPosition();
    const formattedText = formatTextWithHighlights(text);
    
    // Double check - only update if formatting actually changed and contains highlights
    if (formattedText !== text && formattedText.includes('<span')) {
      isProcessingChangeRef.current = true;
      textareaRef.current.innerHTML = formattedText;
      
      // Restore cursor position after highlighting
      setTimeout(() => {
        if (textareaRef.current) {
          setCursorPosition(cursorPos);
          isProcessingChangeRef.current = false;
        }
      }, 0);
    }
  };

  // Function to calculate padding based on sidebar states
  const calculatePadding = (showLeftSidebar?: boolean, showRightSidebar?: boolean) => {
    // For no-message state, only add bottom padding for shadow
    const verticalPadding = isNoMessageState ? 'pb-[40px]' : 'pt-[20px] pb-[10px]';
    
    // For mobile in no-message state, remove horizontal padding completely
    if (isMobileDevice && isNoMessageState) {
      return `${verticalPadding}`; // No horizontal padding on mobile no-message state
    }
    
    // If AgentsSidebar (right sidebar) is open, use very minimal padding to maximize chat space
    if (showRightSidebar) {
      return `${verticalPadding} px-1 sm:px-2 md:px-3 lg:px-4 xl:px-5 2xl:px-6`;
    }
    // If only FileSidebar (left sidebar) is open, use medium padding
    else if (showLeftSidebar) {
      return `${verticalPadding} px-6 sm:px-24 md:px-32 lg:px-40 xl:px-48 2xl:px-56`;
    }
    // If no sidebars are open, use more padding for better spacing
    else {
      return `${verticalPadding} px-8 sm:px-32 md:px-48 lg:px-64 xl:px-80 2xl:px-96`;
    }
  };

  // Function to calculate horizontal padding only (for Tasks mode)
  const calculateHorizontalPadding = (showLeftSidebar?: boolean, showRightSidebar?: boolean) => {
    // If AgentsSidebar (right sidebar) is open, use very minimal padding to maximize chat space
    if (showRightSidebar) {
      return 'px-1 sm:px-2 md:px-3 lg:px-4 xl:px-5 2xl:px-6';
    }
    // If only FileSidebar (left sidebar) is open, use medium padding
    else if (showLeftSidebar) {
      return 'px-6 sm:px-24 md:px-32 lg:px-40 xl:px-48 2xl:px-56';
    }
    // If no sidebars are open, use more padding for better spacing
    else {
      return 'px-8 sm:px-32 md:px-48 lg:px-64 xl:px-80 2xl:px-96';
    }
  };

  // Add useEffect to auto-scroll template tips into view when they appear
  useEffect(() => {
    if (showTemplateTips && templateTipsRef.current) {
      // Wait for next frame to ensure the DOM has been updated
      requestAnimationFrame(() => {
        if (templateTipsRef.current) {
          // Use scrollIntoView with smooth behavior and block: 'end' to ensure the bottom is visible
          templateTipsRef.current.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'end',
            inline: 'nearest' 
          });
          
          // Additionally, add a small extra scroll to ensure proper visibility with some padding
          setTimeout(() => {
            window.scrollBy({
              top: 100, // Scroll down an extra 100px for better padding
              behavior: 'smooth'
            });
          }, 300); // Wait for the initial scroll to complete
        }
      });
    }
  }, [showTemplateTips]); // Trigger when showTemplateTips changes

  return (
    <div 
      ref={containerRef}
      className={`bg-transparent w-full relative z-[200] ${calculatePadding(showLeftSidebar, showRightSidebar)}`}
    >
             
      
      <div
          className={cn(
            isNoMessageState ? styles.chatInputContainerNoMessage : styles.chatInputContainer, 
            isMobile && (isNoMessageState ? styles.chatInputContainerNoMessageMobile : styles.chatInputContainerMobile),
            isScenarioMode && "relative"
          )}
          style={isNoMessageState ? { 
            margin: '20px 20px 0 20px',
            borderRadius: showTemplateTips ? '20px 20px 0 0' : '20px',
            border: isScenarioMode ? 'none' : '1px solid var(--Monochrome-Light, #E8E8E5)',
            background: isScenarioMode ? 'linear-gradient(var(--Monochrome-White, #FFF), var(--Monochrome-White, #FFF)) padding-box, linear-gradient(277deg, #E9FF70 -7.08%, #70D6FF 81.11%) border-box' : 'var(--Monochrome-White, #FFF)',
            backgroundClip: isScenarioMode ? 'padding-box, border-box' : undefined,
            borderWidth: isScenarioMode ? '2px' : undefined,
            borderStyle: isScenarioMode ? 'solid' : undefined,
            borderColor: isScenarioMode ? 'transparent' : undefined,
            boxShadow: '0px 15px 40px 0px rgba(203, 203, 203, 0.25)'
          } : {
            borderRadius: showTemplateTips ? '20px 20px 0 0' : '20px 20px 16px 16px',
            border: isScenarioMode ? 'none' : '1px solid var(--Monochrome-Light, #E8E8E5)',
            background: isScenarioMode ? 'linear-gradient(var(--Monochrome-White, #FFF), var(--Monochrome-White, #FFF)) padding-box, linear-gradient(277deg, #E9FF70 -7.08%, #70D6FF 81.11%) border-box' : 'var(--Monochrome-White, #FFF)',
            backgroundClip: isScenarioMode ? 'padding-box, border-box' : undefined,
            borderWidth: isScenarioMode ? '2px' : undefined,
            borderStyle: isScenarioMode ? 'solid' : undefined,
            borderColor: isScenarioMode ? 'transparent' : undefined,
            boxShadow: '0px 15px 40px 0px rgba(203, 203, 203, 0.25)'
          }}
        >
        <div
          ref={textareaRef}
          contentEditable
          suppressContentEditableWarning={true}
          onInput={handleInputChange}
          onKeyDown={handleKeyPress}
          className={cn(
            isNoMessageState ? styles.contentEditableTextareaNoMessage : styles.contentEditableTextarea, 
            "w-full resize-none border-none shadow-none focus-visible:ring-0 mb-2 chat-input",
            isNoMessageState && "flex-1" // Take up available space in no-message state
          )}
          data-placeholder={
            disabled ? "Please wait..." : 
            isSelectingAgent ? "Selecting best agent..." :
            isRecording ? "Recording..." : 
            isTranscribing ? "Transcribing..." :
            isLoadingFileContent ? "Loading file content..." :
            isGeneratingScenario ? "Generating scenario..." :
            isScenarioMode ? "Describe your scenario: main topic, learning goals, desired outcome..." :
            getAgentPlaceholder(selectedAgent)
          }
                />
      
      {/* --- File mention dropdown --- */}
      {showFileMention && (
        <div 
          className={cn("absolute z-[210]", styles.customScrollbar, styles.fileMentionDropdown)}
          style={{ position: 'absolute', bottom: '100%', marginBottom: '8px' }}
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
              {(mentionSearch === '' || mentionSearch.toLowerCase().startsWith('all')) && uploadedFiles.length > 0 && (
                <div className="mx-2 my-1 border-t border-[#3C3C3C]"></div>
              )}
              
              {/* Filtered individual files */}
              {uploadedFiles.length > 0 ? (
                uploadedFiles.map((file, index) => {
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
                        <span className={cn("text-sm font-medium truncate text-white", styles.fileItemTitle)}>{file.doc_title || file.name}</span>
                        {file.doc_title && <span className={cn(`text-xs ${selectedFileIndex === displayIndex ? 'text-gray-200' : 'text-gray-400'} truncate`, styles.fileItemSubtitle)}>{file.name}</span>}
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
      
      {/* --- Bottom controls --- */}
      <div className={styles.bottomControls}>
        {/* Left side group - Agent Selector and Scenarios */}
        <div className="flex gap-2 items-center">
          
          {/* FileSidebar Toggle Button */}
          {(onToggleLeftSidebar || onMobileTabChange) && (
            <button
              onClick={() => {
                if (isMobileDevice && onMobileTabChange) {
                  // On mobile, switch to files tab
                  onMobileTabChange('files');
                } else if (onToggleLeftSidebar) {
                  // On desktop, toggle sidebar
                  onToggleLeftSidebar();
                }
              }}
              disabled={disabled}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200",
                disabled && "opacity-50 cursor-not-allowed"
              )}
              style={{
                height: '36px',
                fontSize: '14px',
                fontWeight: 500,
                border: showLeftSidebar ? '1px solid #232323' : '1px solid var(--Monochrome-Light, #E8E8E5)',
                background: showLeftSidebar ? '#232323' : 'var(--Monochrome-White, #FFF)',
                color: showLeftSidebar ? 'white' : 'var(--Monochrome-Black, #232323)',
              }}
              title={showLeftSidebar ? "Hide Files" : "Show Files"}
            >
              {isLoadingFiles ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FolderOpen className="h-4 w-4" />
              )}
              {!isVerySmall && (
                <span>{isLoadingFiles ? "Checking..." : "Files"}</span>
              )}
              {fileCount > 0 && !isLoadingFiles && (
                <span
                  className="flex items-center justify-center text-xs font-medium rounded-full h-5 w-5 ml-1"
                  style={{
                    background: showLeftSidebar ? 'rgba(255, 255, 255, 0.2)' : 'rgba(35, 35, 35, 0.2)',
                    color: showLeftSidebar ? 'white' : '#232323',
                    minWidth: '20px',
                  }}
                >
                  {fileCount}
                </span>
              )}
            </button>
          )}
          
          {/* Scenario Mode Toggle / Continue Scenario Button */}
          {activeScenarioProgress && activeScenarioProgress.completedSteps.length < activeScenarioProgress.scenario.steps.length ? (
            // Show "Continue Scenario" button when there's active scenario progress and it's not completed
            <button
              onClick={() => {
                if (onContinueScenario) {
                  onContinueScenario();
                }
              }}
              disabled={disabled}
              className={cn(
                "flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200",
                disabled && "opacity-50 cursor-not-allowed"
              )}
              style={{
                height: '36px',
                fontSize: '14px',
                fontWeight: 500,
                border: '1px solid var(--Monochrome-Light, #E8E8E5)',
                background: 'var(--Monochrome-Black, #232323)',
                color: 'white',
              }}
              title={`Continue "${activeScenarioProgress.scenario.title}" task`}
            >
              <FiUsers className="h-4 w-4" />
              {!isVerySmall && !showRightSidebar && (
                <span>Continue Task</span>
              )}
            </button>
          ) : (
            // Show regular scenario mode toggle when no active scenario or scenario is completed
            <button
              onClick={() => {
                if (isScenarioMode) {
                  setIsScenarioMode(false);
                  setSelectedScenarioTab(null);
                } else {
                  // If there are existing messages, directly start custom task
                  if (chatHistory.length > 0) {
                    setIsScenarioMode(true);
                    // Focus the textarea
                    setTimeout(() => {
                      if (textareaRef.current) {
                        textareaRef.current.focus();
                      }
                    }, 100);
                  } else {
                    // If no messages, show the full template modal
                    setShowAutoFlowModal(true);
                  }
                }
              }}
              disabled={disabled || isGeneratingScenario}
              className={cn(
                "flex items-center gap-3 px-4 py-2 transition-all duration-200",
                (disabled || isGeneratingScenario) && "opacity-50 cursor-not-allowed"
              )}
              style={{
                height: '36px',
                fontSize: '14px',
                fontWeight: 500,
                borderRadius: '12px',
                border: isScenarioMode ? '1px solid var(--Blue-Normal, #70D6FF)' : '1px solid var(--Monochrome-Light, #E8E8E5)',
                background: isScenarioMode ? '#FFF' : 'var(--Monochrome-White, #FFF)',
                color: isScenarioMode ? 'var(--Monochrome-Black, #232323)' : 'var(--Monochrome-Black, #232323)',
              }}
              title={isScenarioMode ? "Switch to Manual Flow" : "Switch to Tasks mode to generate learning scenarios"}
            >
              <FiUsers className={cn("h-4 w-4", isScenarioMode && "animate-pulse")} />
              {!isVerySmall && !showRightSidebar && (
                <span>{isScenarioMode ? (selectedTemplate ? selectedTemplate.title : "Manual Flow") : "Tasks"}</span>
              )}
            </button>
          )}
        </div>
        
        <div className="flex gap-2">
          {/* Recording button */}
          <button
            onClick={toggleRecording}
            disabled={disabled || isTranscribing}
            className={cn(
              styles.recordingButton,
              isMobile && styles.recordingButtonMobile,
              isRecording && styles.recordingButtonActive,
              (disabled || isTranscribing) && styles.recordingButtonDisabled
            )}
          >
            {isRecording ? (
              <Square className="h-4 w-4 text-white" />
            ) : (
              <MicrophoneIcon className="h-4 w-4" />
            )}
            {isRecording && (
              <span className={styles.recordingStopText}>
                Stop
              </span>
            )}
          </button>
          
          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={disabled || isRecording || isTranscribing || isLoadingFileContent || isSelectingAgent || !value.trim()}
            className={cn(
              styles.sendButton,
              isMobile && styles.sendButtonMobile,
              (disabled || isRecording || isTranscribing || isLoadingFileContent || isSelectingAgent || !value.trim()) && styles.sendButtonDisabled
            )}
          >
            {disabled || isLoadingFileContent || isGeneratingScenario || isSelectingAgent ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : !isScenarioMode ? (
              <Send className="h-4 w-4" />
            ) : null}
            {!isCompactLayout && !showRightSidebar && (
              isMobile ? (
                <span className={styles.sendButtonText}>
                  {isScenarioMode ? "Generate" : "Send"}
                </span>
              ) : (
                <span className={styles.sendButtonText}>
                  {disabled ? "Processing..." : 
                   isSelectingAgent ? "Selecting agent..." :
                   isLoadingFileContent ? "Preparing files..." : 
                   isGeneratingScenario ? "Generating..." :
                   isScenarioMode ? "Generate Flow" :
                   "Send"}
                </span>
              )
            )}
          </button>
        </div>
      </div>
    </div>
    
    {/* Template Tips Display */}
    {showTemplateTips && selectedTemplate && (
      <div 
        ref={templateTipsRef}
        className="bg-transparent w-full relative z-[190]"
      >
        <div
          className={cn(
            styles.chatInputContainer, 
            isMobile && styles.chatInputContainerMobile
          )}
          style={isNoMessageState ? { 
            margin: '0 20px 20px 20px', // Match no-message state margin
            borderTopLeftRadius: '0',
            borderTopRightRadius: '0',
            borderBottomLeftRadius: '16px',
            borderBottomRightRadius: '16px',
            borderTop: 'none',
            boxShadow: 'none'
          } : {
            margin: '0 0 20px 0', // No margin in message state to match full width
            borderTopLeftRadius: '0',
            borderTopRightRadius: '0',
            borderBottomLeftRadius: '16px',
            borderBottomRightRadius: '16px',
            borderTop: 'none',
            boxShadow: 'none'
          }}
        >
          <div className="space-y-2 w-full">
            <div 
              style={{
                fontSize: '12px',
                fontWeight: '600',
                color: 'var(--Monochrome-Dark, #666)',
                marginBottom: '8px',
                fontFamily: 'var(--font-geist-sans)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}
            >
              Prompt Tips
            </div>
            {getTemplateTips(selectedTemplate)
              .filter((_, index) => !usedTipIndexes.includes(index))
              .map((tip, displayIndex) => {
                // Get the original index from the full tips array
                const originalIndex = getTemplateTips(selectedTemplate).findIndex(t => t === tip);
                return (
                  <div key={originalIndex} className="w-full">
                    <div 
                      className="cursor-pointer transition-colors w-full"
                      style={{
                        display: 'flex',
                        padding: '8px',
                        justifyContent: 'flex-start',
                        alignItems: 'center',
                        gap: '10px',
                        alignSelf: 'stretch',
                        borderRadius: '8px',
                        fontSize: '14px',
                        lineHeight: '20px',
                        fontFamily: 'var(--font-geist-sans)',
                        color: 'var(--Monochrome-Black, #232323)',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderRadius = '8px';
                        e.currentTarget.style.background = 'var(--Monochrome-Ultralight, #F8F8F3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                      onClick={() => handleTipClick(tip, originalIndex)}
                      title="Click to add this tip to your message"
                    >
                      {tip}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    )}

    {/* Tasks Modal */}
    <AutoFlowModal
      isOpen={showAutoFlowModal}
      onClose={() => setShowAutoFlowModal(false)}
      onSelectTemplate={(template) => {
        // Close modal and show tips below input
        setShowAutoFlowModal(false);
        setSelectedTemplate(template);
        setShowTemplateTips(true);
        setUsedTipIndexes([]); // Reset used tips for new template
        setIsScenarioMode(true);
        
        // Focus the textarea
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.focus();
          }
        }, 100);
      }}
      onSelectExample={(prompt) => {
        // Set the prompt in the textarea
        setLocalValue(prompt);
        onChange(prompt);
        
        // Enable scenario mode
        setIsScenarioMode(true);
        
        // Close the modal
        setShowAutoFlowModal(false);
        
        // Update the textarea content
        if (textareaRef.current) {
          textareaRef.current.textContent = prompt;
        }
        
        // Auto-trigger the scenario generation
        setTimeout(() => {
          if (onScenarioGenerate) {
            onScenarioGenerate(prompt);
            // Clear the input after generation
            setLocalValue('');
            onChange('');
            if (textareaRef.current) {
              textareaRef.current.textContent = '';
            }
          }
        }, 100);
      }}
      onStartCustomTask={() => {
        setShowAutoFlowModal(false);
        setIsScenarioMode(true);
        // Focus the textarea after modal closes
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.focus();
          }
        }, 100);
      }}

    />
  </div>
);
}
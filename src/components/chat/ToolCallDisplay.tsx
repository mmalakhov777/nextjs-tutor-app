import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Code, CheckCircle, Wrench } from 'lucide-react';
import { SpinnerIcon } from '@/components/icons/SpinnerIcon';
import { ExpandIcon } from '@/components/icons/ExpandIcon';
import { Badge } from '@/components/ui/badge';
import { getToolIcon } from '@/lib/tools';

interface ToolCallInfo {
  tool: string;
  args: Record<string, any>;
  result?: any;
  state?: 'call' | 'result'; // Add state to track execution status
}

interface ToolCallDisplayProps {
  toolCall: string | ToolCallInfo;
  timestamp?: Date;
  onOpenNotes?: () => void;
  onOpenFlashcards?: () => void;
  onOpenCV?: () => void;
  onOpenPresentations?: () => void;
  isMobileDevice?: boolean;
  onMobileTabChange?: (tab: 'assets') => void;
  onLinkSubmit?: (url: string) => Promise<void>;
  autoAddSources?: boolean;
  stackedInvocations?: Array<{
    toolName: string;
    args: Record<string, any>;
    result?: any;
    state?: 'call' | 'result';
    originalIndex: number;
  }>;
}

export function ToolCallDisplay({ 
  toolCall, 
  timestamp, 
  onOpenNotes, 
  onOpenFlashcards, 
  onOpenCV, 
  onOpenPresentations, 
  isMobileDevice, 
  onMobileTabChange,
  onLinkSubmit,
  autoAddSources = false,
  stackedInvocations
}: ToolCallDisplayProps) {
  // Parse tool call if it's a string first to determine the tool type
  const toolInfo: ToolCallInfo = typeof toolCall === 'string' 
    ? (() => {
        try {
          return JSON.parse(toolCall);
        } catch {
          return { tool: 'unknown', args: {}, result: toolCall };
        }
      })()
    : toolCall;
    
  console.log('[ToolCallDisplay] Component rendered:', {
    toolName: toolInfo.tool,
    state: toolInfo.state,
    hasResult: !!toolInfo.result,
    autoAddSources
  });

  const [isExpanded, setIsExpanded] = useState(toolInfo.tool === 'writeText');
  const [isResultExpanded, setIsResultExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [processedLinks, setProcessedLinks] = useState<Set<string>>(new Set());
  const [uploadingLinks, setUploadingLinks] = useState<Set<string>>(new Set());
  const [lastProcessedContent, setLastProcessedContent] = useState<string>('');
  
  // Check for debug mode (can be enabled via console: window.DEBUG_TOOL_CALLS = true)
  const isDebugMode = typeof window !== 'undefined' && (window as any).DEBUG_TOOL_CALLS === true;
  
  // Determine if tool is executing (has state 'call' but no result)
  const isExecuting = toolInfo.state === 'call' && toolInfo.result === undefined;
  const hasResult = toolInfo.result !== undefined;
  
  // Check if result indicates an error
  const isError = hasResult && (
    (typeof toolInfo.result === 'string' && toolInfo.result.toLowerCase().includes('error')) ||
    (typeof toolInfo.result === 'object' && toolInfo.result?.error) ||
    (typeof toolInfo.result === 'object' && toolInfo.result?.content === '' || toolInfo.result?.content === null)
  );
  
  // Check if mobile screen size
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint in Tailwind
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Extract URLs from text content
  const extractUrls = (text: string): string[] => {
    const urlRegex = /https?:\/\/[^\s<>"\{\}\|\\\^\[\]`]+/g;
    const matches = text.match(urlRegex) || [];
    return [...new Set(matches)]; // Remove duplicates
  };
  
  // Auto-upload links from tool results
  useEffect(() => {
    console.log('[ToolCallDisplay] Auto-upload effect running:', {
      autoAddSources,
      hasOnLinkSubmit: !!onLinkSubmit,
      toolInfo,
      isExecuting,
      hasResult
    });
    
    if (!autoAddSources || !onLinkSubmit) {
      console.log('[ToolCallDisplay] Auto-upload disabled or no onLinkSubmit');
      return;
    }
    
    // Only process URLs for fetch page content tool
    const toolName = toolInfo.tool || '';
    const isFetchPageContentTool = toolName === 'fetchPageContent';
    
    if (!isFetchPageContentTool) {
      console.log('[ToolCallDisplay] Not a fetch page content tool, skipping auto-upload for:', toolInfo.tool);
      return;
    }
    
    console.log('[ToolCallDisplay] Processing fetch page content tool:', toolInfo.tool);
    
    // For fetchPageContent, only check arguments (which contain the URL to fetch)
    let contentToCheck = '';
    
    // Only check tool arguments for fetchPageContent
    if (toolInfo.args) {
      if (typeof toolInfo.args === 'string') {
        contentToCheck = toolInfo.args;
      } else if (toolInfo.args && typeof toolInfo.args === 'object') {
        // For fetchPageContent, the URL is typically in args.url
        if (toolInfo.args.url) {
          contentToCheck = toolInfo.args.url;
        } else {
          contentToCheck = JSON.stringify(toolInfo.args);
        }
      }
    }
    
    console.log('[ToolCallDisplay] Content to check for URLs:', contentToCheck);
    
    // Skip if content is same as last processed
    if (contentToCheck === lastProcessedContent || !contentToCheck) {
      return;
    }
    
    setLastProcessedContent(contentToCheck);
    
    // Extract URLs from the content
    const urls = extractUrls(contentToCheck);
    console.log('[ToolCallDisplay] Extracted URLs:', urls);
    
    // Process only new URLs that haven't been processed yet
    const newUrls = urls.filter(url => !processedLinks.has(url) && !uploadingLinks.has(url));
    
    if (newUrls.length > 0) {
      console.log(`[ToolCallDisplay] Found ${newUrls.length} new URLs in tool ${isExecuting ? 'execution' : 'result'}:`, newUrls);
      
      // Mark URLs as being processed
      setProcessedLinks(prev => new Set([...prev, ...newUrls]));
      setUploadingLinks(prev => new Set([...prev, ...newUrls]));
      
      // Upload each URL
      newUrls.forEach(async (url) => {
        try {
          console.log('[ToolCallDisplay] Uploading URL:', url);
          setUploadingLinks(prev => new Set(prev).add(url));
          await onLinkSubmit(url);
          console.log('[ToolCallDisplay] Successfully uploaded URL:', url);
        } catch (error) {
          console.error('[ToolCallDisplay] Failed to upload URL:', url, error);
          // Remove from uploading set on error
          setUploadingLinks(prev => {
            const newSet = new Set(prev);
            newSet.delete(url);
            return newSet;
          });
        }
      });
    }
  }, [toolInfo.result, toolInfo.args, isExecuting, hasResult, autoAddSources, onLinkSubmit, processedLinks, uploadingLinks, lastProcessedContent]);
  
  const formatToolName = (name: string) => {
    // Handle specific CV-related tool names
    if (name.toLowerCase().includes('cv') || name.toLowerCase().includes('writecv')) {
      return 'Writing CV';
    }
    
    return name
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  const formatValue = (value: any): string => {
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  const formatResult = (result: any) => {
    const resultStr = formatValue(result);
    const isEmpty = !resultStr || resultStr.trim().length === 0 || resultStr.trim() === '{}' || resultStr.trim() === 'null' || resultStr.trim() === 'undefined';
    const isLarge = resultStr.length > 1000;
    const isHTML = resultStr.includes('<') && (resultStr.includes('<p>') || resultStr.includes('<h1>') || resultStr.includes('<h2>') || resultStr.includes('<div>') || resultStr.includes('<span>') || resultStr.includes('<ul>') || resultStr.includes('<ol>') || resultStr.includes('<li>'));
    
    return {
      isEmpty,
      isLarge,
      isHTML,
      preview: isEmpty ? 'No content generated' : (isLarge && !isResultExpanded ? resultStr.substring(0, 500) + '...' : resultStr),
      full: isEmpty ? 'No content generated' : resultStr
    };
  };

  // Extract h1/h2 content for writeText tool
  const extractHeaderContent = (htmlContent: string): string => {
    const h1Match = htmlContent.match(/<h1[^>]*>(.*?)<\/h1>/i);
    const h2Match = htmlContent.match(/<h2[^>]*>(.*?)<\/h2>/i);
    
    if (h1Match && h1Match[1]) {
      return h1Match[1].replace(/<[^>]*>/g, '').trim(); // Remove any nested HTML tags
    }
    if (h2Match && h2Match[1]) {
      return h2Match[1].replace(/<[^>]*>/g, '').trim(); // Remove any nested HTML tags
    }
    
    return '';
  };

  const getHeaderTitle = () => {
    const maxWords = isMobile ? 5 : 8;
    if (toolInfo.tool === 'writeText' && hasResult && toolInfo.result) {
      const headerContent = extractHeaderContent(String(toolInfo.result));
      if (headerContent) {
        return truncateToWords(headerContent, maxWords);
      }
    }
    
    const baseTitle = truncateToWords(formatToolName(toolInfo.tool), maxWords);
    
    // Add count if this is a stacked invocation
    if (stackedInvocations && stackedInvocations.length > 1) {
      return `${baseTitle} (${stackedInvocations.length})`;
    }
    
    return baseTitle;
  };

  const truncateToWords = (text: string, maxWords: number): string => {
    const words = text.split(' ');
    if (words.length <= maxWords) {
      return text;
    }
    return words.slice(0, maxWords).join(' ') + '...';
  };

  const getToolIconComponent = () => {
    if (isExecuting) {
      return <SpinnerIcon className="h-4 w-4 text-[#232323] animate-spin" />;
    }
    
    // Use the imported getToolIcon function from tools index
    const IconComponent = getToolIcon(toolInfo.tool || '');
    return <IconComponent className="h-4 w-4 text-[#232323]" />;
  };

  // Handle click for non-debug mode
  const handleNonDebugClick = () => {
    if (isDebugMode) return; // Only handle clicks in non-debug mode
    
    const toolName = toolInfo.tool?.toLowerCase();
    
    // If on mobile, switch to assets tab first
    if (isMobileDevice && onMobileTabChange) {
      onMobileTabChange('assets');
    }
    
    // Open notes for writeText tool
    if (toolName === 'writetext' && onOpenNotes) {
      onOpenNotes();
    }
    // Open CV for CV Writer tool
    else if ((toolName === 'writecv' || toolName?.includes('cv') || toolName?.includes('resume')) && onOpenCV) {
      onOpenCV();
    }
    // Open flashcards for flashcard-related tools
    else if ((toolName?.includes('flashcard') || toolName?.includes('flash_card')) && onOpenFlashcards) {
      onOpenFlashcards();
    }
    // Open presentations for slide-related tools
    else if ((toolName === 'editslide' || toolName?.includes('slide') || toolName?.includes('presentation')) && onOpenPresentations) {
      onOpenPresentations();
    }
    // For other tools, do nothing (don't open any sidebar)
  };

  // Check if tool can open sidebar in non-debug mode
  const canOpenSidebar = () => {
    if (isExecuting) return false; // Not clickable when executing
    if (isDebugMode) return true; // Always clickable in debug mode when not executing
    
    const toolName = toolInfo.tool?.toLowerCase();
    return (toolName === 'writetext' && onOpenNotes) || 
           ((toolName?.includes('flashcard') || toolName?.includes('flash_card')) && onOpenFlashcards) ||
           ((toolName === 'writecv' || toolName?.includes('cv') || toolName?.includes('resume')) && onOpenCV) ||
           ((toolName === 'editslide' || toolName?.includes('slide') || toolName?.includes('presentation')) && onOpenPresentations);
  };

  // Check if tool has content that can be expanded to sidebar
  const hasExpandableContent = () => {
    if (isExecuting) return false; // Not expandable when executing
    
    const toolName = toolInfo.tool?.toLowerCase();
    return (toolName === 'writetext' && hasResult && onOpenNotes) || 
           ((toolName?.includes('flashcard') || toolName?.includes('flash_card')) && hasResult && onOpenFlashcards) ||
           ((toolName === 'writecv' || toolName?.includes('cv') || toolName?.includes('resume')) && hasResult && onOpenCV) ||
           ((toolName === 'editslide' || toolName?.includes('slide') || toolName?.includes('presentation')) && hasResult && onOpenPresentations);
  };

  // Handle click - only when not executing
  const handleClick = () => {
    if (isExecuting) return; // Do nothing when executing
    
    if (isDebugMode) {
      setIsExpanded(!isExpanded);
    } else {
      handleNonDebugClick();
    }
  };

  // Regular display for all tools
  return (
    <div className="relative" style={{ width: '90%' }}>
      {/* Animation styles */}
      <style jsx>{`
        @keyframes stackLayerIn {
          0% {
            opacity: 0;
            transform: translateY(-8px) scale(0.98);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>

      {/* Stacked background elements for visual effect */}
      {stackedInvocations && stackedInvocations.length > 1 && (
        <>
          {/* Third layer - deepest shadow */}
          <div 
            className="absolute top-2 left-4 w-full h-full rounded-[16px]"
            style={{
              background: 'linear-gradient(135deg, rgba(248, 248, 243, 0.4), rgba(240, 240, 235, 0.5))',
              border: '1px solid rgba(232, 232, 229, 0.6)',
              filter: 'blur(0.5px)',
              zIndex: 0,
              animation: 'stackLayerIn 0.35s ease forwards',
              animationDelay: '0s'
            }}
          />
          {/* Second layer - middle shadow */}
          <div 
            className="absolute top-1 left-2 w-full h-full rounded-[16px]"
            style={{
              background: 'linear-gradient(135deg, rgba(248, 248, 243, 0.6), rgba(240, 240, 235, 0.7))',
              border: '1px solid rgba(232, 232, 229, 0.8)',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
              zIndex: 1,
              animation: 'stackLayerIn 0.35s ease forwards',
              animationDelay: '0.05s'
            }}
          />
        </>
      )}
      
      <div 
        className={`my-2 relative ${
          isExecuting 
            ? 'cursor-default' 
            : canOpenSidebar() 
              ? 'cursor-pointer' 
              : 'cursor-default'
        }`}
        onClick={handleClick}
        style={{
          display: 'flex',
          padding: '16px',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: '16px',
          alignSelf: 'stretch',
          width: '100%',
          borderRadius: '16px',
          border: '1px solid var(--Monochrome-Light, #E8E8E5)',
          background: stackedInvocations && stackedInvocations.length > 1 
            ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(248, 248, 243, 0.9))'
            : 'rgba(248, 248, 243, 0.50)',
          boxShadow: stackedInvocations && stackedInvocations.length > 1 
            ? '0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04)'
            : 'none',
          zIndex: 2,
          transition: 'all 0.2s ease-in-out',
          animation: stackedInvocations && stackedInvocations.length > 1 ? 'stackLayerIn 0.35s ease forwards' : undefined,
          animationDelay: stackedInvocations && stackedInvocations.length > 1 ? '0.1s' : undefined
        }}
        onMouseEnter={(e) => {
          if (stackedInvocations && stackedInvocations.length > 1) {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.12), 0 3px 8px rgba(0, 0, 0, 0.06)';
          }
        }}
        onMouseLeave={(e) => {
          if (stackedInvocations && stackedInvocations.length > 1) {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04)';
          }
        }}
      >
        <div
          className="flex w-full items-center justify-between text-left"
          style={{
            borderRadius: '16px'
          }}
        >
          <div className="flex items-center gap-2">
            {getToolIconComponent()}
            <span className={`font-medium text-sm text-gray-900 dark:text-gray-100`}>
              {getHeaderTitle()}
            </span>
            {hasResult && !isError && (
              <div
                style={{
                  display: 'flex',
                  padding: '4px 12px 4px 4px',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '4px',
                  borderRadius: '100px',
                  background: 'rgba(199, 239, 255, 0.30)'
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M18.3008 10C18.3008 14.5736 14.5817 18.3008 10 18.3008C5.42644 18.3008 1.69922 14.5736 1.69922 10C1.69922 5.41829 5.42644 1.69922 10 1.69922C14.5817 1.69922 18.3008 5.41829 18.3008 10ZM12.5309 6.7692L9.05598 12.3519L7.40397 10.2197C7.20052 9.95117 7.02148 9.87793 6.78548 9.87793C6.41927 9.87793 6.13444 10.1791 6.13444 10.5452C6.13444 10.7324 6.20768 10.9115 6.32975 11.0742L8.37239 13.5807C8.58398 13.8656 8.81185 13.9795 9.08854 13.9795C9.36523 13.9795 9.60123 13.8493 9.77213 13.5807L13.597 7.55859C13.6946 7.38769 13.8005 7.20052 13.8005 7.02148C13.8005 6.63899 13.4668 6.39486 13.1087 6.39486C12.8971 6.39486 12.6856 6.52507 12.5309 6.7692Z" fill="#70D6FF"/>
                </svg>
                <span className="text-xs font-medium text-gray-700">Done</span>
              </div>
            )}
            {isError && (
              <Badge 
                variant="secondary"
                className="text-xs px-2 py-0.5"
                style={{
                  backgroundColor: '#fecaca',
                  color: '#dc2626',
                  borderColor: '#fca5a5',
                  border: '1px solid #fca5a5'
                }}
              >
                error
              </Badge>
            )}
            {isExecuting && (
              <span className="text-xs text-gray-600 dark:text-gray-400 font-normal">
               
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasExpandableContent() && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  handleNonDebugClick();
                }}
                title="Open in sidebar"
                style={{
                  display: 'flex',
                  height: '32px',
                  width: '32px',
                  padding: '6px',
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderRadius: '6px',
                  border: '1px solid var(--Monochrome-Light, #E8E8E5)',
                  background: 'transparent',
                  transition: 'all 0.2s ease-in-out',
                  cursor: 'pointer'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'var(--Monochrome-Superlight, #F8F8F3)';
                  e.currentTarget.style.borderColor = 'var(--Monochrome-Normal, #D1D1D1)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = 'var(--Monochrome-Light, #E8E8E5)';
                }}
              >
                <ExpandIcon className="h-3.5 w-3.5 text-[#232323]" />
              </div>
            )}
            {isDebugMode && (
              <div className="flex items-center">
                {isExpanded ? (
                  <ChevronUp className={`h-4 w-4 text-[#232323]`} />
                ) : (
                  <ChevronDown className={`h-4 w-4 text-[#232323]`} />
                )}
              </div>
            )}
          </div>
        </div>
        
        {isExpanded && isDebugMode && (
          <div className={`border-t p-3 space-y-3 border-gray-200 dark:border-gray-700`}>
            {/* Show stacked invocations details if available */}
            {stackedInvocations && stackedInvocations.length > 1 ? (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Code className={`h-3.5 w-3.5 text-[#232323]`} />
                  <span className={`text-xs font-semibold text-gray-700 dark:text-gray-300`}>
                    Stacked Invocations ({stackedInvocations.length})
                  </span>
                </div>
                <div className="space-y-2">
                  {stackedInvocations.map((invocation, index) => (
                    <div key={index} className="bg-white dark:bg-gray-900 rounded p-2 font-mono text-xs border">
                      <div className="font-semibold text-gray-800 dark:text-gray-200 mb-1">
                        Call #{index + 1}
                      </div>
                      <div className="space-y-1">
                        <div><span className="text-gray-600 dark:text-gray-400">State:</span> {invocation.state}</div>
                        {Object.entries(invocation.args || {})
                          .filter(([key]) => key !== 'dialogue')
                          .map(([key, value]) => (
                          <div key={key} className="flex gap-2">
                            <span className="text-gray-600 dark:text-gray-400">{key}:</span>
                            <span className="text-gray-700 dark:text-gray-300">
                              {formatValue(value)}
                            </span>
                          </div>
                        ))}
                        {invocation.result && (
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Result:</span>
                            <div className="text-gray-700 dark:text-gray-300 mt-1">
                              {formatValue(invocation.result)}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {/* Arguments */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Code className={`h-3.5 w-3.5 text-[#232323]`} />
                    <span className={`text-xs font-semibold text-gray-700 dark:text-gray-300`}>
                      Arguments
                    </span>
                  </div>
                  <div className="bg-white dark:bg-gray-900 rounded p-2 font-mono text-xs">
                    {Object.entries(toolInfo.args)
                      .filter(([key]) => key !== 'dialogue')
                      .map(([key, value]) => (
                      <div key={key} className="flex gap-2">
                        <span className="text-gray-600 dark:text-gray-400">{key}:</span>
                        <span className="text-gray-700 dark:text-gray-300">
                          {formatValue(value)}
                        </span>
                      </div>
                    ))}
                    {Object.entries(toolInfo.args).filter(([key]) => key !== 'dialogue').length === 0 && (
                      <span className="text-gray-400 dark:text-gray-600">No arguments</span>
                    )}
                  </div>
                </div>
                
                {/* Result or Executing Status */}
                {isExecuting ? (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <SpinnerIcon className="h-3.5 w-3.5 text-[#232323] animate-spin" />
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                        Executing Tool...
                      </span>
                    </div>
                    <div className="bg-white dark:bg-gray-900 rounded p-2 text-xs">
                      <span className="text-gray-600 dark:text-gray-400">
                        Tool is currently executing, please wait for the result...
                      </span>
                    </div>
                  </div>
                ) : hasResult ? (
                  <div>
                    <div className="bg-white dark:bg-gray-900 rounded p-2 text-xs">
                      {(() => {
                        // Special handling for CV tools - don't show raw JSON
                        const toolName = toolInfo.tool?.toLowerCase();
                        if (toolName === 'writecv' || toolName?.includes('cv') || toolName?.includes('resume')) {
                          return (
                            <div className="text-gray-700 dark:text-gray-300">
                              <div className="flex items-center gap-2 mb-2">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <span className="font-medium">CV Generated Successfully</span>
                              </div>
                              <p className="text-gray-600 dark:text-gray-400">
                                The CV has been generated and is available in the CV tab. Click this tool card to view it.
                              </p>
                              <div className="mt-2 text-xs text-gray-500">
                                <strong>Tip:</strong> Raw JSON output is hidden for CV tools to keep the interface clean.
                              </div>
                            </div>
                          );
                        }
                        
                        // Regular handling for other tools
                        const formattedResult = formatResult(toolInfo.result);
                        
                        return (
                          <div>
                            {isError && (
                              <div className="flex items-center gap-2 mb-2 p-2 bg-red-50 border border-red-200 rounded">
                                <div className="h-2 w-2 bg-red-500 rounded-full"></div>
                                <span className="text-red-700 text-xs font-medium">Tool execution failed</span>
                              </div>
                            )}
                            {formattedResult.isEmpty && !isError && (
                              <div className="flex items-center gap-2 mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                                <div className="h-2 w-2 bg-yellow-500 rounded-full"></div>
                                <span className="text-yellow-700 text-xs font-medium">No content generated</span>
                              </div>
                            )}
                            {formattedResult.isHTML ? (
                              <div 
                                className={`prose prose-sm max-w-none ${isError ? 'text-red-600' : 'text-gray-700 dark:text-gray-300'}`}
                                dangerouslySetInnerHTML={{ 
                                  __html: isResultExpanded ? formattedResult.full : formattedResult.preview 
                                }}
                              />
                            ) : (
                              <pre className={`whitespace-pre-wrap ${isError ? 'text-red-600' : 'text-gray-700 dark:text-gray-300'}`}>
                                {isResultExpanded ? formattedResult.full : formattedResult.preview}
                              </pre>
                            )}
                            {formattedResult.isLarge && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setIsResultExpanded(!isResultExpanded);
                                }}
                                className="mt-2 text-gray-600 dark:text-gray-400 hover:underline text-xs"
                              >
                                {isResultExpanded ? 'Show Less' : 'Show More'}
                              </button>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 
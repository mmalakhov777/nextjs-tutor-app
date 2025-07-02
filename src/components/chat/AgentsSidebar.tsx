import { Users, X, Info, Settings, Wrench, Shield, UserCircle, Brain, Globe, Sparkles, Search, BookOpen, Code, Lightbulb, ChevronDown, ChevronUp, MessageSquare, FileText, Bold, Italic, List, Heading, Underline, ListOrdered, Edit3, TrendingUp, BarChart2, PenTool, LayoutTemplate, Video, FileImage, Mail, User, Download, Hash, Copy, FileDown, Maximize2, Minimize2 } from 'lucide-react';
import { FiLayers } from 'react-icons/fi';
import { PlusIcon } from '@/components/icons/PlusIcon';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { AgentsSidebarProps } from '@/types/chat';
import Link from 'next/link';
import { useEffect, useState, memo, useImperativeHandle, forwardRef, useCallback, useRef, useMemo } from 'react';
import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import TiptapEditor from '@/components/editors/TiptapEditor';
import ParagraphEditor, { NoteParagraph } from '@/components/editors/ParagraphEditor';
import FlashCards, { FlashCard } from './FlashCards';
import CVViewer, { CVContent } from './CVViewer';
import PresentationViewer, { PresentationViewerRef } from './PresentationViewer';
import { 
  AGENT_REGISTRY,
  getAgentIcon, 
  getAgentCircleColor, 
  getAgentTextColor, 
  getDisplayAgentName 
} from '@/lib/agents';
import { getAgentDescription } from '@/data/agentDescriptions';

// Define MSD global interface type
declare global {
  interface Window {
    MSD?: {
      getUser: () => Promise<{ 
        user?: { 
          subscription?: boolean | string;
          subscription_type?: string;
          is_subscription_cancelled?: boolean;
          subscription_valid_until?: string;
          has_paid?: boolean;
          [key: string]: any;  // Allow for any other properties
        } 
      }>;
      openSubscriptionDialog: (options: {
        isClosable: boolean;
        shouldVerifySubscriptionRetrieval: boolean;
        type: string;
        promoMode?: string;
        source?: string;
      }) => Promise<void>;
      sendAmpEvent?: (eventName: string, eventProperties?: Record<string, any>) => void;
    };
    // Add debug utilities
    show_limits_as_for_unsubscribed?: () => void;
    restore_subscription_state?: () => void;
    unlock_unlimited_messages?: (secretKey: string) => boolean;
  }
}

// Update the AgentsSidebarProps interface
interface ExtendedAgentsSidebarProps extends AgentsSidebarProps {
  onAgentsUpdate?: (updatedAgents: any[]) => void;
  onTabChange?: (tab: 'notes' | 'scenarios' | 'flashcards' | 'presentations' | 'cv') => void;
  currentConversationId?: string; // Add the current conversation ID
  onSendMessage?: (payload: { message: string; type?: 'research' | 'chat'; agent?: string }) => void; // Add agent parameter
  flashCards?: FlashCard[];
  onCreateFlashCard?: (card: Omit<FlashCard, 'id'>) => void;
  onEditFlashCard?: (cardId: string, updates: Partial<FlashCard>) => void;
  onDeleteFlashCard?: (cardId: string) => void;
  onReviewFlashCard?: (cardId: string, correct: boolean) => void;
  activeTab?: 'notes' | 'scenarios' | 'flashcards' | 'presentations' | 'cv' | null; // Add cv to activeTab prop
  // Notes props (passed from home.tsx) - now paragraph-based
  noteParagraphs?: NoteParagraph[];
  onParagraphUpdate?: (paragraphNumber: number, paragraph: NoteParagraph) => void;
  onParagraphDelete?: (paragraphNumber: number) => void;
  onParagraphAdd?: () => void;
  onReferencesUpdate?: (paragraphNumber: number, references: string[]) => void;
  onFileReferenceClick?: (fileId: string) => void;
  isSavingNotes?: boolean;
  isLoadingNotes?: boolean;
  lastSavedNoteParagraphs?: NoteParagraph[];
  // Presentations props - simplified
  agentSlides?: any[];
  onAgentSlideUpdate?: (slideNumber: number, slide: any) => void;
  // CV props
  cvContent?: CVContent | null;
  onCreateCV?: () => void;
  isLoadingCV?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

// Define a ref type for the component
export interface AgentsSidebarRef {
  refreshMessageCount: () => Promise<void>;
  incrementMessageCount: () => void;
  resetMessageCount: () => void;
  resetSidebar: () => void;
  appendToNotes: (content: string) => void;
  switchToFlashcards: () => void;
  switchToCV: () => void;
}

const MESSAGE_LIMIT = 3;

const AgentsSidebar = memo(forwardRef<AgentsSidebarRef, ExtendedAgentsSidebarProps>(function AgentsSidebar({
  agents,
  isLoadingAgents,
  showAgentsSidebar,
  onToggleAgentsSidebar,
  onToggleAgentOrTool,
  vectorStoreInfo = null,
  userId,
  onAgentsUpdate,
  onTabChange,
  currentConversationId,
  onSendMessage,
  flashCards,
  onCreateFlashCard,
  onEditFlashCard,
  onDeleteFlashCard,
  onReviewFlashCard,
  activeTab: activeTabProp,
  noteParagraphs,
  onParagraphUpdate,
  onParagraphDelete,
  onParagraphAdd,
  onReferencesUpdate,
  onFileReferenceClick,
  isSavingNotes,
  isLoadingNotes,
  lastSavedNoteParagraphs,
  agentSlides,
  onAgentSlideUpdate,
  cvContent,
  onCreateCV,
  isLoadingCV,
  isExpanded = false,
  onToggleExpand
}, ref) {
  const [searchParams, setSearchParams] = useState('');
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showAllAgents, setShowAllAgents] = useState(false);
  const [internalActiveTab, setInternalActiveTab] = useState<'notes' | 'scenarios' | 'flashcards' | 'presentations' | 'cv' | null>(null);
  
  // Use toast hook
  const { addToast } = useToast();
  
  // Use prop if provided, otherwise use internal state
  const activeTab = activeTabProp || internalActiveTab;
  
  // Constants
  const NOTES_AUTOSAVE_DELAY = 2000; // Autosave delay in milliseconds
  
  const [showComingSoon, setShowComingSoon] = useState<boolean>(false);
  
  const [lastLocalIncrement, setLastLocalIncrement] = useState<Date | null>(null);
  
  // Add debounce ref to prevent rapid successive calls
  const lastMessageSentRef = useRef<number>(0);
  const DEBOUNCE_DELAY = 500; // 500ms debounce

  // Ref for PresentationViewer
  const presentationViewerRef = useRef<PresentationViewerRef>(null);

  // State to control showing all tabs
  const [showAllTabs, setShowAllTabs] = useState(false);

  // State for outline popup
  const [showOutline, setShowOutline] = useState(false);

  // State for all assets dropdown
  const [showAllAssetsDropdown, setShowAllAssetsDropdown] = useState(false);

  // Function to extract outline from paragraphs
  const extractOutline = useCallback(() => {
    if (!noteParagraphs) return [];
    
    const outline: { text: string; level: number; paragraphIndex: number; id: string }[] = [];
    
    noteParagraphs.forEach((paragraph, index) => {
      if (!paragraph.content) return;
      
      // Parse HTML content to extract headings
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = paragraph.content;
      
      // Find all heading elements
      const headings = tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6');
      
      headings.forEach((heading) => {
        const level = parseInt(heading.tagName.charAt(1));
        const text = heading.textContent?.trim() || '';
        if (text) {
          outline.push({
            text,
            level,
            paragraphIndex: index,
            id: `heading-${index}-${outline.length}`
          });
        }
      });
      
      // If no headings found but paragraph has content, add paragraph preview
      if (headings.length === 0 && paragraph.content.trim() && paragraph.content !== '<p></p>') {
        const textContent = tempDiv.textContent?.trim() || '';
        if (textContent) {
          const preview = textContent.length > 60 ? textContent.substring(0, 60) + '...' : textContent;
          outline.push({
            text: preview,
            level: 0, // Use level 0 for paragraph previews
            paragraphIndex: index,
            id: `paragraph-${index}`
          });
        }
      }
    });
    
    return outline;
  }, [noteParagraphs]);

  // Function to scroll to a specific paragraph
  const scrollToParagraph = useCallback((paragraphIndex: number) => {
    // Find the paragraph element by its index
    const paragraphElements = document.querySelectorAll('[data-paragraph-index]');
    const targetElement = Array.from(paragraphElements).find(
      el => el.getAttribute('data-paragraph-index') === paragraphIndex.toString()
    );
    
    if (targetElement) {
      // Get the scrollable container (the editor container)
      const scrollContainer = targetElement.closest('.overflow-auto');
      
      if (scrollContainer) {
        // Calculate the position to scroll to show the title at the top
        const containerRect = scrollContainer.getBoundingClientRect();
        const elementRect = targetElement.getBoundingClientRect();
        const currentScrollTop = scrollContainer.scrollTop;
        
        // Calculate the target scroll position
        // We want the element to be at the top of the container with some padding
        const targetScrollTop = currentScrollTop + (elementRect.top - containerRect.top) - 20; // 20px padding from top
        
        // Smooth scroll to the calculated position
        scrollContainer.scrollTo({
          top: Math.max(0, targetScrollTop), // Ensure we don't scroll to negative values
          behavior: 'smooth'
        });
      } else {
        // Fallback to default scroll behavior if container not found
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      
      // Add a temporary highlight effect
      targetElement.classList.add('highlight-paragraph');
      setTimeout(() => {
        targetElement.classList.remove('highlight-paragraph');
      }, 2000);
    }
    
    // Close the outline popup after navigation
    setShowOutline(false);
  }, []);

  // Function to copy all text from sections in markdown format
  const copyAllText = useCallback(async () => {
    if (!noteParagraphs) return;
    
    let markdownText = '';
    
    noteParagraphs.forEach((paragraph, index) => {
      if (!paragraph.content) return;
      
      let contentToProcess = paragraph.content;
      
      // Check if content is JSON and extract the content field
      if (contentToProcess.trim().startsWith('{') && contentToProcess.trim().endsWith('}')) {
        try {
          const parsed = JSON.parse(contentToProcess);
          if (parsed.content) {
            contentToProcess = parsed.content;
          }
        } catch (error) {
          // If JSON parsing fails, use original content
          console.log('Failed to parse JSON content, using as-is');
        }
      }
      
      // Convert escaped newlines to actual newlines
      contentToProcess = contentToProcess.replace(/\\n/g, '\n');
      
      // Convert HTML to markdown
      const htmlToMarkdown = (html: string): string => {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        
        // Remove any reference elements or links that might be references
        const referenceElements = tempDiv.querySelectorAll('a[href*="reference"], .reference, [data-reference]');
        referenceElements.forEach(el => el.remove());
        
        let markdown = '';
        
        // Process each child node
        const processNode = (node: Node): string => {
          if (node.nodeType === Node.TEXT_NODE) {
            return node.textContent || '';
          }
          
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            const tagName = element.tagName.toLowerCase();
            const textContent = element.textContent || '';
            
            switch (tagName) {
              case 'h1':
                return `# ${textContent}\n\n`;
              case 'h2':
                return `## ${textContent}\n\n`;
              case 'h3':
                return `### ${textContent}\n\n`;
              case 'h4':
                return `#### ${textContent}\n\n`;
              case 'h5':
                return `##### ${textContent}\n\n`;
              case 'h6':
                return `###### ${textContent}\n\n`;
              case 'p':
                const pContent = Array.from(element.childNodes).map(processNode).join('');
                return pContent ? `${pContent}\n\n` : '';
              case 'strong':
              case 'b':
                return `**${textContent}**`;
              case 'em':
              case 'i':
                return `*${textContent}*`;
              case 'u':
                return `<u>${textContent}</u>`;
              case 's':
              case 'strike':
                return `~~${textContent}~~`;
              case 'code':
                return `\`${textContent}\``;
              case 'pre':
                return `\`\`\`\n${textContent}\n\`\`\`\n\n`;
              case 'blockquote':
                return `> ${textContent}\n\n`;
              case 'ul':
                let ulContent = '';
                Array.from(element.children).forEach(li => {
                  if (li.tagName.toLowerCase() === 'li') {
                    ulContent += `- ${li.textContent || ''}\n`;
                  }
                });
                return ulContent + '\n';
              case 'ol':
                let olContent = '';
                Array.from(element.children).forEach((li, idx) => {
                  if (li.tagName.toLowerCase() === 'li') {
                    olContent += `${idx + 1}. ${li.textContent || ''}\n`;
                  }
                });
                return olContent + '\n';
              case 'a':
                const href = element.getAttribute('href');
                if (href && !href.includes('reference')) {
                  return `[${textContent}](${href})`;
                }
                return textContent;
              case 'br':
                return '\n';
              default:
                return Array.from(element.childNodes).map(processNode).join('');
            }
          }
          
          return '';
        };
        
        Array.from(tempDiv.childNodes).forEach(node => {
          markdown += processNode(node);
        });
        
        return markdown.trim();
      };
      
             const markdownContent = htmlToMarkdown(contentToProcess);
      
      if (markdownContent) {
        // Add section separator
        if (markdownText) {
          markdownText += '\n\n---\n\n';
        }
        markdownText += markdownContent;
      }
    });
    
    if (markdownText) {
      try {
        await navigator.clipboard.writeText(markdownText);
        addToast({
          type: 'success',
          message: 'All text copied as markdown!'
        });
      } catch (error) {
        console.error('Failed to copy text:', error);
        addToast({
          type: 'error',
          message: 'Failed to copy text to clipboard'
        });
      }
    } else {
      addToast({
        type: 'warning',
        message: 'No text content to copy'
      });
    }
  }, [noteParagraphs, addToast]);

  // Function to download all text as Word document
  const downloadAsWord = useCallback(() => {
    if (!noteParagraphs) return;
    
    let htmlContent = '';
    
    noteParagraphs.forEach((paragraph, index) => {
      if (!paragraph.content) return;
      
      let contentToProcess = paragraph.content;
      
      // Check if content is JSON and extract the content field
      if (contentToProcess.trim().startsWith('{') && contentToProcess.trim().endsWith('}')) {
        try {
          const parsed = JSON.parse(contentToProcess);
          if (parsed.content) {
            contentToProcess = parsed.content;
          }
        } catch (error) {
          console.log('Failed to parse JSON content, using as-is');
        }
      }
      
      // Convert escaped newlines to actual newlines and then to HTML
      contentToProcess = contentToProcess.replace(/\\n/g, '\n');
      
      // Convert newlines to HTML paragraphs if it's plain text
      if (!contentToProcess.includes('<')) {
        const paragraphs = contentToProcess.split('\n\n').filter(p => p.trim());
        contentToProcess = paragraphs.map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
      }
      
      htmlContent += contentToProcess;
    });
    
    if (!htmlContent) {
      addToast({
        type: 'warning',
        message: 'No content to download'
      });
      return;
    }
    
    // Create Word document HTML structure with proper styling
    const wordDocument = `
<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" 
      xmlns:w="urn:schemas-microsoft-com:office:word" 
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <title>Document</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>90</w:Zoom>
      <w:DoNotPromptForConvert/>
      <w:DoNotShowInsertionsAndDeletions/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page {
      size: 8.5in 11in;
      margin: 1in 1.25in 1in 1.25in;
      mso-header-margin: 0.5in;
      mso-footer-margin: 0.5in;
    }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 12pt;
      line-height: 1.5;
      #232323;
      background: white;
      margin: 0;
      padding: 0;
    }
    h1 {
      font-size: 18pt;
      font-weight: bold;
      margin-top: 12pt;
      margin-bottom: 6pt;
      page-break-after: avoid;
      #232323;
    }
    h2 {
      font-size: 16pt;
      font-weight: bold;
      margin-top: 12pt;
      margin-bottom: 6pt;
      page-break-after: avoid;
      #232323;
    }
    h3 {
      font-size: 14pt;
      font-weight: bold;
      margin-top: 12pt;
      margin-bottom: 6pt;
      page-break-after: avoid;
      #232323;
    }
    h4, h5, h6 {
      font-size: 12pt;
      font-weight: bold;
      margin-top: 12pt;
      margin-bottom: 6pt;
      page-break-after: avoid;
      #232323;
    }
    p {
      margin-top: 0pt;
      margin-bottom: 12pt;
      text-align: justify;
      text-indent: 0pt;
    }
    strong, b {
      font-weight: bold;
    }
    em, i {
      font-style: italic;
    }
    u {
      text-decoration: underline;
    }
    s, strike {
      text-decoration: line-through;
    }
    ul {
      margin-top: 6pt;
      margin-bottom: 6pt;
      margin-left: 36pt;
    }
    ol {
      margin-top: 6pt;
      margin-bottom: 6pt;
      margin-left: 36pt;
    }
    li {
      margin-bottom: 6pt;
    }
    blockquote {
      margin-left: 36pt;
      margin-right: 36pt;
      margin-top: 6pt;
      margin-bottom: 6pt;
      font-style: italic;
      border-left: 2pt solid #cccccc;
      padding-left: 12pt;
    }
    code {
      font-family: 'Courier New', Courier, monospace;
      font-size: 10pt;
      background-color: #f5f5f5;
      padding: 2pt;
      border: 1pt solid #cccccc;
    }
    pre {
      font-family: 'Courier New', Courier, monospace;
      font-size: 10pt;
      background-color: #f5f5f5;
      padding: 12pt;
      border: 1pt solid #cccccc;
      margin-top: 6pt;
      margin-bottom: 6pt;
      white-space: pre-wrap;
    }
    a {
      color: #0000ff;
      text-decoration: underline;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin-top: 6pt;
      margin-bottom: 6pt;
    }
    th, td {
      border: 1pt solid #232323;
      padding: 6pt;
      text-align: left;
    }
    th {
      background-color: #f0f0f0;
      font-weight: bold;
    }
    .page-break {
      page-break-before: always;
    }
  </style>
</head>
<body>
${htmlContent}
</body>
</html>`;
    
    // Create blob and download
    const blob = new Blob([wordDocument], { 
      type: 'application/msword;charset=utf-8' 
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `document-${new Date().toISOString().split('T')[0]}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    addToast({
      type: 'success',
      message: 'Document downloaded successfully!'
    });
  }, [noteParagraphs, addToast]);

  // Define tab configuration with content checks
  const tabConfig = useMemo(() => {
    const tabs = [
      {
        id: 'notes' as const,
        label: 'Text',
        hasContent: noteParagraphs && noteParagraphs.length > 0 && noteParagraphs.some(p => p.content && p.content.trim() !== '' && p.content !== '<p></p>'),
        alwaysVisible: false
      },
      {
        id: 'flashcards' as const,
        label: 'FlashCards',
        hasContent: flashCards && flashCards.length > 0,
        alwaysVisible: false
      },
      {
        id: 'cv' as const,
        label: 'CV',
        hasContent: cvContent !== null && cvContent !== undefined,
        alwaysVisible: false
      },
      {
        id: 'presentations' as const,
        label: 'Presentations',
        hasContent: agentSlides && agentSlides.length > 0,
        alwaysVisible: false
      }
    ];

    // All tabs go to dropdown - no visible tabs in header
    const visibleTabs: typeof tabs = [];
    const hiddenTabs = tabs; // All tabs are hidden (in dropdown)

    // If showAllTabs is true, show all tabs
    const displayTabs = showAllTabs ? tabs : visibleTabs;

    return { displayTabs, visibleTabs, hiddenTabs, hasHiddenTabs: hiddenTabs.length > 0 };
  }, [flashCards, cvContent, agentSlides, noteParagraphs, showAllTabs]);



  // Download presentation function
  const downloadPresentation = useCallback(() => {
    if (!agentSlides || agentSlides.length === 0) {
      addToast({
        type: 'warning',
        message: 'No presentation slides to download'
      });
      return;
    }

    // Create HTML content for the presentation
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Presentation</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@4.3.1/dist/reveal.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@4.3.1/dist/theme/white.css">
    <style>
        .reveal .slides section {
            text-align: left;
        }
        .reveal h1, .reveal h2, .reveal h3 {
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="reveal">
        <div class="slides">
            ${agentSlides.map(slide => `
                <section>
                    <h2>${slide.title}</h2>
                    <div>${slide.content}</div>
                </section>
            `).join('')}
        </div>
    </div>
    <script src="https://cdn.jsdelivr.net/npm/reveal.js@4.3.1/dist/reveal.js"></script>
    <script>
        Reveal.initialize({
            hash: true,
            controls: true,
            progress: true,
            center: true,
            transition: 'slide'
        });
    </script>
</body>
</html>`;

    // Create and download the file
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'presentation.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    addToast({
      type: 'success',
      message: 'Presentation downloaded successfully!'
    });
  }, [agentSlides, addToast]);

  // Generate system agents from the agent registry
  const systemAgents = React.useMemo(() => {
    return Object.entries(AGENT_REGISTRY).map(([name, config], index) => ({
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name,
      enabled: true,
      can_disable: false,
      type: 'agent' as const,
      instructions: config.systemPrompt,
      model: config.model?.modelId || 'gpt-4.1'
    }));
  }, []);
  
  // Get URL query parameters when the component mounts
  useEffect(() => {
    const params = window.location.search;
    setSearchParams(params);
  }, []);

  // Add handler for tab changes that notifies parent
  const handleTabChange = useCallback((tab: 'notes' | 'scenarios' | 'flashcards' | 'presentations' | 'cv') => {
    // Handle all tabs including flashcards, presentations, and cv
    if (tab === 'notes' || tab === 'scenarios' || tab === 'flashcards' || tab === 'presentations' || tab === 'cv') {
      setInternalActiveTab(tab);
    }
    if (onTabChange) {
      onTabChange(tab);
    }
  }, [onTabChange]);

  // Add function to switch to flashcards tab
  const switchToFlashcards = useCallback(() => {
    console.log('[SwitchToFlashcards] Switching to flashcards tab');
    
    // Switch to flashcards tab
    handleTabChange('flashcards');
  }, [handleTabChange]);

  // Add function to switch to CV tab
  const switchToCV = useCallback(() => {
    console.log('[SwitchToCV] Switching to CV tab');
    
    // Switch to CV tab
    handleTabChange('cv');
  }, [handleTabChange]);

   // Expose functions through the ref
  useImperativeHandle(ref, () => ({
    refreshMessageCount: () => Promise.resolve(),
    incrementMessageCount: () => {},
    resetMessageCount: () => {},
    resetSidebar: () => {},
    appendToNotes: (content: string) => {
      // Notes are now handled in home.tsx, so this is a no-op
      console.log('[AgentsSidebar] appendToNotes called but notes are handled in home.tsx');
    },
    switchToFlashcards,
    switchToCV
  }), [switchToFlashcards, switchToCV]);
  
  // Detect mobile screen size
  useEffect(() => {
    const checkIfMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
    };
    
    // Initial check
    checkIfMobile();
    
    // Add resize listener
    window.addEventListener('resize', checkIfMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  // Component to fetch and display first slide preview from database
  const FirstSlidePreview: React.FC<{
    agentSlides: any[];
    currentConversationId?: string;
    userId?: string | null;
    onOpenPresentation: () => void;
  }> = ({ agentSlides, currentConversationId, userId, onOpenPresentation }) => {
    const [firstSlideImage, setFirstSlideImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [imageLoadError, setImageLoadError] = useState(false);

    useEffect(() => {
      const fetchOrGenerateFirstSlide = async () => {
        console.log('🚀 FirstSlidePreview useEffect triggered:', {
          agentSlides: agentSlides?.length || 0,
          currentConversationId,
          userId
        });
        
        if (!agentSlides || agentSlides.length === 0) {
          console.log('❌ No agent slides available');
          setIsLoading(false);
          return;
        }

        const firstSlide = agentSlides[0];
        console.log('🎯 First slide data:', {
          title: firstSlide?.title,
          hasImagePrompt: !!firstSlide?.imagePrompt,
          imagePrompt: firstSlide?.imagePrompt?.substring(0, 100)
        });
        
        if (!firstSlide?.imagePrompt) {
          console.log('📭 No image prompt for first slide');
          setIsLoading(false);
          return;
        }

        try {
          setError(null);
          console.log('🖼️ Checking for existing first slide image...');
          
          // First, check if image exists in database
          const params = new URLSearchParams();
          params.append('slideId', '1');
          params.append('imagePrompt', firstSlide.imagePrompt);
          if (currentConversationId) params.append('sessionId', currentConversationId);
          if (userId) params.append('userId', userId);
          
          const checkResponse = await fetch(`/api/presentations/save-slide-image?${params.toString()}`);
          
          if (checkResponse.ok) {
            const checkData = await checkResponse.json();
            const existingImages = checkData.slideImages || [];
            
            // Look for existing image with exact same prompt
            const existingImage = existingImages.find((img: any) => 
              img.image_prompt === firstSlide.imagePrompt &&
              img.session_id === currentConversationId
            );
            
            if (existingImage) {
              console.log('✅ Found existing first slide image in database');
              console.log('🖼️ Image data details:', {
                mimeType: existingImage.image_mime_type,
                dataLength: existingImage.image_data?.length || 0,
                dataPreview: existingImage.image_data?.substring(0, 50) + '...'
              });
              const imageDataUrl = `data:${existingImage.image_mime_type};base64,${existingImage.image_data}`;
              console.log('🎨 Setting image data URL:', imageDataUrl.substring(0, 100) + '...');
              setFirstSlideImage(imageDataUrl);
              setIsLoading(false);
              return;
            }
          }
          
          // No existing image found, generate new one
          console.log('🎨 Generating new first slide image...');
          setIsLoading(false);
          setIsGenerating(true);
          
          const generateResponse = await fetch('/api/presentations/generate-slide-image', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              imagePrompt: firstSlide.imagePrompt
            }),
          });

          if (!generateResponse.ok) {
            const errorData = await generateResponse.json();
            throw new Error(errorData.error || 'Failed to generate image');
          }

          const generateData = await generateResponse.json();
          const imageDataUrl = `data:${generateData.image.mimeType};base64,${generateData.image.base64}`;
          
          // Save the generated image to database
          try {
            await fetch('/api/presentations/save-slide-image', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                slideId: '1',
                slideNumber: 1,
                sessionId: currentConversationId,
                userId: userId,
                title: firstSlide.title || 'Slide 1',
                imagePrompt: firstSlide.imagePrompt,
                imageData: generateData.image.base64,
                imageMimeType: generateData.image.mimeType,
                imageWidth: generateData.image.width,
                imageHeight: generateData.image.height,
                backgroundColor: firstSlide.backgroundColor,
                style: firstSlide.style,
                transition: firstSlide.transition,
                provider: generateData.provider || 'gemini',
                generationMetadata: {
                  originalFormat: generateData.originalFormat, // Track original format before WebP conversion
                  generatedAt: new Date().toISOString()
                }
              }),
            });
            console.log('💾 Saved generated image to database');
          } catch (saveError) {
            console.error('⚠️ Failed to save image to database:', saveError);
            // Don't fail the preview if save fails
          }
          
          setFirstSlideImage(imageDataUrl);
          console.log('✅ First slide image generated successfully');
          
        } catch (error) {
          console.error('❌ Error with first slide image:', error);
          setError(error instanceof Error ? error.message : 'Failed to load image');
        } finally {
          setIsGenerating(false);
          setIsLoading(false);
        }
      };

      fetchOrGenerateFirstSlide();
    }, [agentSlides, currentConversationId, userId]);

    console.log('🎨 FirstSlidePreview render state:', {
      isLoading,
      isGenerating,
      hasError: !!error,
      hasImage: !!firstSlideImage,
      imagePreview: firstSlideImage?.substring(0, 50) + '...'
    });

    return (
      <div 
        className="relative bg-white border border-gray-200 rounded-lg overflow-hidden cursor-pointer hover:border-gray-300 transition-all duration-200 group"
        onClick={onOpenPresentation}
        style={{ aspectRatio: '16/9' }}
      >
                          {isLoading ? (
            // Pulsating loading state like ImagePresentation
            <div 
              className="absolute inset-0"
              style={{
                background: 'rgba(35, 35, 35, 0.6)',
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
              }}
            >
            </div>
         ) : isGenerating ? (
           // Generating state - creating new image
           <div 
             className="absolute inset-0 flex items-center justify-center"
             style={{ backgroundColor: agentSlides[0]?.backgroundColor || '#2c3e50' }}
           >
             <div className="text-center text-white">
               <div className="relative mb-4">
                 <div className="animate-spin rounded-full h-12 w-12 border-4 border-white/20 border-t-white mx-auto"></div>
               </div>
               <p className="text-lg font-semibold mb-2">Generating slide image...</p>
               <p className="text-sm opacity-80">Creating visual preview</p>
             </div>
           </div>
         ) : error ? (
           // Error state
           <div 
             className="absolute inset-0 flex items-center justify-center p-4"
             style={{ backgroundColor: agentSlides[0]?.backgroundColor || '#2c3e50' }}
           >
             <div className="text-center text-white">
               <p className="text-lg font-semibold mb-2">Failed to generate image</p>
               <p className="text-sm opacity-80 mb-4">{error}</p>
               <div className="text-xs opacity-60">
                 <p className="font-medium">{agentSlides[0]?.title || 'Untitled Slide'}</p>
               </div>
             </div>
           </div>
         ) : firstSlideImage && !imageLoadError ? (
           // Show actual slide image with transparent hover overlay
           <>
             <img 
               src={firstSlideImage} 
               alt={agentSlides[0]?.title || 'First slide'} 
               className="absolute inset-0 w-full h-full object-cover"
               onLoad={() => {
                 console.log('🖼️ Image loaded successfully');
                 setImageLoadError(false);
               }}
               onError={(e) => {
                 console.error('❌ Image failed to load:', e);
                 setImageLoadError(true);
               }}
             />
             
             {/* Transparent overlay with hover effects */}
             <div className="absolute inset-0 bg-[#232323]/0 group-hover:bg-[#232323]/20 transition-all duration-200 flex items-center justify-center">
               <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-lg">
                 <span className="text-sm font-medium text-gray-900">View Presentation</span>
               </div>
             </div>
             
             {/* Slide counter */}
             <div className="absolute bottom-2 right-2 bg-[#232323]/70 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
               {agentSlides.length} slide{agentSlides.length !== 1 ? 's' : ''}
             </div>
           </>
         ) : imageLoadError ? (
           // Image load error state
           <div className="absolute inset-0 flex items-center justify-center bg-red-50">
             <div className="text-center">
               <p className="text-red-600 font-medium mb-2">Failed to load image</p>
               <p className="text-sm text-red-500">The slide image could not be displayed</p>
             </div>
           </div>
         ) : (
           // Fallback to text preview if no image prompt available
           <div className="absolute inset-0 p-4 flex flex-col">
             <div className="mb-2">
               <h4 className="text-sm font-semibold text-gray-900 line-clamp-2">
                 {agentSlides[0]?.title || 'Untitled Slide'}
               </h4>
             </div>
             <div 
               className="text-xs text-gray-600 line-clamp-4 overflow-hidden"
               dangerouslySetInnerHTML={{
                 __html: agentSlides[0]?.content?.replace(/<[^>]*>/g, '').substring(0, 150) + '...' || 'No content'
               }}
             />
           </div>
         )}
        
        
      </div>
    );
  };

  return (
    <div 
      className={`flex flex-col h-full min-h-0 w-full ${isMobile ? 'w-full' : 'w-full'} bg-white transition-all duration-300 ease-in-out`}
      style={{
        borderRight: isMobile ? 'none' : '1px solid #E8E8E5'
      }}
    >
      <div 
        className={`sticky top-0 z-10 flex items-center h-[60px] px-4 ${isMobile ? 'hidden' : ''} bg-white`}
        style={{ 
          borderBottom: '1px solid var(--light)',
          alignSelf: 'stretch',
          minHeight: '60px'
        }}
      >
        <div className="flex items-center" style={{ width: 'auto' }}>
                    {/* Assets button - show when multiple asset types exist */}
          {(() => {
            const availableAssets = [
              {
                id: 'notes',
                label: 'Text',
                icon: '📝',
                exists: noteParagraphs && noteParagraphs.length > 0 && noteParagraphs.some(p => p.content && p.content.trim() !== '' && p.content !== '<p></p>')
              },
              {
                id: 'flashcards',
                label: 'FlashCards',
                icon: '🧠',
                exists: flashCards && flashCards.length > 0
              },
              {
                id: 'cv',
                label: 'CV',
                icon: '👤',
                exists: cvContent !== null && cvContent !== undefined
              },
              {
                id: 'presentations',
                label: 'Presentations',
                icon: '🎭',
                exists: agentSlides && agentSlides.length > 0
              }
            ].filter(asset => asset.exists);

            const hasMultipleAssets = availableAssets.length > 1;

                        return hasMultipleAssets ? (
              <div className="relative">
                <button
                  onClick={() => setShowAllAssetsDropdown(!showAllAssetsDropdown)}
                  title="Show all assets"
                  style={{
                    display: 'flex',
                    height: '40px',
                    padding: '8px 12px',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '6px',
                    borderRadius: '8px',
                    border: '1px solid var(--light)',
                    background: showAllAssetsDropdown ? 'var(--superlight)' : 'var(--white)',
                    transition: 'all 0.2s ease-in-out',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    pointerEvents: 'auto',
                    position: 'relative',
                    zIndex: 1,
                    marginRight: '12px'
                  }}
                  className="text-xs sm:text-sm"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--superlight)';
                    e.currentTarget.style.borderColor = 'var(--normal)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = showAllAssetsDropdown ? 'var(--superlight)' : 'var(--white)';
                    e.currentTarget.style.borderColor = 'var(--light)';
                  }}
                >
                  <FiLayers className="h-4 w-4 flex-shrink-0" />
                  <span className="hidden sm:inline">Assets ({availableAssets.length})</span>
                </button>

                {/* Assets Dropdown */}
                {showAllAssetsDropdown && (
                  <div
                    className="absolute top-12 left-0 z-50 w-64 rounded-lg shadow-lg"
                    style={{
                      border: '1px solid #404040',
                      background: '#232323',
                      boxShadow: '0px 4px 20px rgba(35, 35, 35, 0.3)'
                    }}
                  >
                    <div className="p-2">
                      <div className="flex items-center justify-between p-2 mb-2">
                        <h3 className="font-semibold text-white">Available Assets</h3>
                        <button
                          onClick={() => setShowAllAssetsDropdown(false)}
                          className="text-gray-400 hover:text-gray-200"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      
                      <div className="space-y-1">
                        {availableAssets.map((asset) => (
                          <div
                            key={asset.id}
                            onClick={() => {
                              handleTabChange(asset.id as 'notes' | 'flashcards' | 'cv' | 'presentations');
                              setShowAllAssetsDropdown(false);
                            }}
                            className={`flex items-center gap-3 p-3 rounded-md cursor-pointer transition-colors ${
                              activeTab === asset.id ? 'border border-gray-500' : 'hover:bg-gray-700'
                            }`}
                          >
                            <div className="text-lg">{asset.icon}</div>
                            <div className="flex-grow">
                              <p className={`font-medium ${activeTab === asset.id ? 'text-gray-100' : 'text-gray-100'}`}>
                                {asset.label}
                              </p>
                              <p className="text-xs text-gray-400">
                                {asset.id === 'notes' && `${noteParagraphs?.length || 0} sections`}
                                {asset.id === 'flashcards' && `${flashCards?.length || 0} cards`}
                                {asset.id === 'cv' && 'Ready'}
                                {asset.id === 'presentations' && `${agentSlides?.length || 0} slides`}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : null;
          })()}

          {/* Render visible tabs */}
          {tabConfig.displayTabs.map((tab, index) => (
            <button 
              key={tab.id}
              onClick={() => handleTabChange(tab.id)} 
              style={{
                color: activeTab === tab.id ? 'var(--Monochrome-Black, #232323)' : 'var(--Monochrome-Deep, #6C6C6C)',
                textAlign: 'center',
                fontSize: '19px',
                fontStyle: 'normal',
                fontWeight: 500,
                lineHeight: '24px',
                marginRight: index < tabConfig.displayTabs.length - 1 ? '12px' : '0px'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        
        <div className="flex-grow"></div>
        
        {/* Add save indicator for notes */}
        <div className="flex items-center">
          {activeTab === 'notes' && (
            <>
              {/* REMOVED: No more DB operations, so no saving indicators needed */}
              {/*
              {isLoadingNotes && (
                <span className="text-xs text-gray-500 mr-2">Loading...</span>
              )}
              {isSavingNotes && (
                <span className="text-xs text-gray-500 mr-2">Saving...</span>
              )}
              {!isLoadingNotes && !isSavingNotes && JSON.stringify(noteParagraphs) !== JSON.stringify(lastSavedNoteParagraphs) && (
                <span className="text-xs text-amber-500 mr-2">Unsaved</span>
              )}
              */}
            </>
          )}
          
          {/* Download Word button - only show in notes tab */}
          {activeTab === 'notes' && (
            <div
              onClick={downloadAsWord}
              title="Download as Word document"
              style={{
                display: 'flex',
                height: '40px',
                width: '40px',
                padding: '8px',
                justifyContent: 'center',
                alignItems: 'center',
                borderRadius: '8px',
                border: '1px solid var(--light)',
                background: 'var(--white)',
                transition: 'all 0.2s ease-in-out',
                cursor: 'pointer',
                marginRight: '8px'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'var(--superlight)';
                e.currentTarget.style.borderColor = 'var(--normal)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'var(--white)';
                e.currentTarget.style.borderColor = 'var(--light)';
              }}
            >
              <Download className="h-4 w-4 text-[#232323]" />
            </div>
          )}

          {/* Copy button - only show in notes tab */}
          {activeTab === 'notes' && (
            <div
              onClick={copyAllText}
              title="Copy all text"
              style={{
                display: 'flex',
                height: '40px',
                width: '40px',
                padding: '8px',
                justifyContent: 'center',
                alignItems: 'center',
                borderRadius: '8px',
                border: '1px solid var(--light)',
                background: 'var(--white)',
                transition: 'all 0.2s ease-in-out',
                cursor: 'pointer',
                marginRight: '8px'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'var(--superlight)';
                e.currentTarget.style.borderColor = 'var(--normal)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'var(--white)';
                e.currentTarget.style.borderColor = 'var(--light)';
              }}
            >
              <Copy className="h-4 w-4 text-[#232323]" />
            </div>
          )}

          {/* Outline button - only show in notes tab when not expanded */}
          {activeTab === 'notes' && !isExpanded && (
            <div className="relative">
              <div
                onClick={() => setShowOutline(!showOutline)}
                title="Show outline"
                style={{
                  display: 'flex',
                  height: '40px',
                  width: '40px',
                  padding: '8px',
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderRadius: '8px',
                  border: '1px solid var(--light)',
                  background: showOutline ? 'var(--superlight)' : 'var(--white)',
                  transition: 'all 0.2s ease-in-out',
                  cursor: 'pointer',
                  marginRight: '8px'
                }}
                onMouseOver={(e) => {
                  if (!showOutline) {
                    e.currentTarget.style.background = 'var(--superlight)';
                    e.currentTarget.style.borderColor = 'var(--normal)';
                  }
                }}
                onMouseOut={(e) => {
                  if (!showOutline) {
                    e.currentTarget.style.background = 'var(--white)';
                    e.currentTarget.style.borderColor = 'var(--light)';
                  }
                }}
              >
                <List className="h-4 w-4 text-[#232323]" />
              </div>
              
              {/* Outline Popup */}
              {showOutline && (
                <div
                  className="absolute top-12 right-0 z-50 w-80 max-h-96 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg"
                  style={{
                    border: '1px solid var(--light)',
                    background: 'var(--white)',
                    boxShadow: '0px 4px 20px rgba(35, 35, 35, 0.15)'
                  }}
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-900">Document Outline</h3>
                      <button
                        onClick={() => setShowOutline(false)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    
                    {(() => {
                      const outline = extractOutline();
                      
                      if (outline.length === 0) {
                        return (
                          <div className="text-center py-8 text-gray-500">
                            <List className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No headings or content found</p>
                            <p className="text-xs mt-1">Add headings to your paragraphs to see the outline</p>
                          </div>
                        );
                      }
                      
                      return (
                        <div className="space-y-1">
                          {outline.map((item, index) => (
                                                         <div
                               key={item.id}
                               onClick={() => scrollToParagraph(item.paragraphIndex)}
                               className="flex items-start gap-2 p-2 rounded-md hover:bg-gray-50 cursor-pointer transition-colors"
                             >
                              <div className="flex-shrink-0 mt-1">
                                <FileText className="h-3 w-3 text-gray-400" />
                              </div>
                              <div className="flex-grow min-w-0">
                                <p 
                                  className={`text-sm truncate ${
                                    item.level === 1 ? 'font-semibold text-gray-900' :
                                    item.level === 2 ? 'font-medium text-gray-800' :
                                    item.level > 2 ? 'text-gray-700' :
                                    'text-gray-600 text-xs'
                                  }`}
                                  title={item.text}
                                >
                                  {item.text}
                                </p>
                                <p className="text-xs text-gray-400">
                                  Section {item.paragraphIndex + 1}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Download button - only show in presentations tab */}
          {activeTab === 'presentations' && (
            <div
              onClick={() => {
                // Call the downloadSlidesAsPDF function from PresentationViewer
                if (presentationViewerRef.current) {
                  presentationViewerRef.current.downloadSlidesAsPDF();
                }
              }}
              title="Download slides as PDF"
              style={{
                display: 'flex',
                height: '40px',
                width: '40px',
                padding: '8px',
                justifyContent: 'center',
                alignItems: 'center',
                borderRadius: '8px',
                border: '1px solid var(--light)',
                background: 'var(--white)',
                transition: 'all 0.2s ease-in-out',
                cursor: 'pointer',
                marginRight: '8px'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'var(--superlight)';
                e.currentTarget.style.borderColor = 'var(--normal)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'var(--white)';
                e.currentTarget.style.borderColor = 'var(--light)';
              }}
            >
              <Download className="h-4 w-4 text-[#232323]" />
            </div>
          )}

          {/* Expand button */}
          {onToggleExpand && (
            <div
              onClick={onToggleExpand}
              title={isExpanded ? "Exit full screen" : "Expand to full screen"}
              style={{
                display: 'flex',
                height: '40px',
                width: '40px',
                padding: '8px',
                justifyContent: 'center',
                alignItems: 'center',
                borderRadius: '8px',
                border: '1px solid var(--light)',
                background: 'var(--white)',
                transition: 'all 0.2s ease-in-out',
                cursor: 'pointer',
                marginRight: '8px'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'var(--superlight)';
                e.currentTarget.style.borderColor = 'var(--normal)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'var(--white)';
                e.currentTarget.style.borderColor = 'var(--light)';
              }}
            >
              {isExpanded ? (
                <Minimize2 className="h-4 w-4 text-[#232323]" />
              ) : (
                <Maximize2 className="h-4 w-4 text-[#232323]" />
              )}
            </div>
          )}

          {/* Close button - hide in expanded view except on mobile */}
          {onToggleAgentsSidebar && (!isExpanded || isMobile) && (
            <div
              onClick={onToggleAgentsSidebar}
              title="Close sidebar"
              style={{
                display: 'flex',
                height: '40px',
                width: '40px',
                padding: '8px',
                justifyContent: 'center',
                alignItems: 'center',
                borderRadius: '8px',
                border: '1px solid var(--light)',
                background: 'var(--white)',
                transition: 'all 0.2s ease-in-out',
                cursor: 'pointer'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'var(--superlight)';
                e.currentTarget.style.borderColor = 'var(--normal)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'var(--white)';
                e.currentTarget.style.borderColor = 'var(--light)';
              }}
            >
              <X className="h-4 w-4 text-[#232323]" />
            </div>
          )}
        </div>
      </div>
      
      {(activeTab === null || (!noteParagraphs?.length && !flashCards?.length && !agentSlides?.length && !cvContent)) ? (
        <div className={`h-full overflow-auto w-full ${isExpanded ? 'max-w-7xl mx-auto px-4 sm:px-8 md:px-16 lg:px-32' : 'max-w-sm'}`}>
          <div className={`${isExpanded ? 'p-4 sm:p-8 md:p-12 lg:p-16' : 'p-4'}`}>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2" style={{ color: '#232323' }}>Start Creating</h2>
              <p className="text-sm" style={{ color: '#6C6C6C' }}>Choose what you'd like to create with AI assistance</p>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
            {/* Text Tool Card */}
            <div 
              onClick={() => onSendMessage?.({ message: 'Please help me create the first paragraph for my text content. Write about the key topics from our conversation.', type: 'chat', agent: 'Content Writer Agent' })}
              className="p-6 rounded-2xl border cursor-pointer transition-all duration-200 hover:shadow-md"
              style={{
                border: '1px solid #E8E8E5',
                background: '#FFF'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = '#F8F8F3';
                e.currentTarget.style.borderColor = '#D1D1D1';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = '#FFF';
                e.currentTarget.style.borderColor = '#E8E8E5';
              }}
            >
              <div className="flex items-center gap-4">
                <div 
                  style={{
                    width: '48px',
                    height: '48px',
                    background: '#059669',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px'
                  }}
                >
                  📝
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-semibold mb-1" style={{ color: '#232323' }}>Text</h3>
                  <p className="text-sm" style={{ color: '#6C6C6C' }}>Start writing text with Content Writer Agent</p>
                </div>
              </div>
            </div>

            {/* FlashCards Tool Card */}
            <div 
              onClick={() => onSendMessage?.({ message: 'Create flashcards based on our conversation', type: 'chat', agent: 'Flash Card Maker' })}
              className="p-6 rounded-2xl border cursor-pointer transition-all duration-200 hover:shadow-md"
              style={{
                border: '1px solid #E8E8E5',
                background: '#FFF'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = '#F8F8F3';
                e.currentTarget.style.borderColor = '#D1D1D1';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = '#FFF';
                e.currentTarget.style.borderColor = '#E8E8E5';
              }}
            >
              <div className="flex items-center gap-4">
                <div 
                  style={{
                    width: '48px',
                    height: '48px',
                    background: '#232323',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px'
                  }}
                >
                  🧠
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-semibold mb-1" style={{ color: '#232323' }}>FlashCards</h3>
                  <p className="text-sm" style={{ color: '#6C6C6C' }}>Create flashcards with Flash Card Maker Agent</p>
                </div>
              </div>
            </div>

            {/* Presentations Tool Card */}
            <div 
              onClick={() => onSendMessage?.({ message: 'Create a presentation about the key topics from our conversation', type: 'chat', agent: 'Presentation Creator Agent' })}
              className="p-6 rounded-2xl border cursor-pointer transition-all duration-200 hover:shadow-md"
              style={{
                border: '1px solid #E8E8E5',
                background: '#FFF'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = '#F8F8F3';
                e.currentTarget.style.borderColor = '#D1D1D1';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = '#FFF';
                e.currentTarget.style.borderColor = '#E8E8E5';
              }}
            >
              <div className="flex items-center gap-4">
                <div 
                  style={{
                    width: '48px',
                    height: '48px',
                    background: '#9333EA',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px'
                  }}
                >
                  🎭
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-semibold mb-1" style={{ color: '#232323' }}>Presentations</h3>
                  <p className="text-sm" style={{ color: '#6C6C6C' }}>Build presentations with Presentation Creator Agent</p>
                </div>
              </div>
            </div>

            {/* CV Tool Card */}
            <div 
              onClick={() => onSendMessage?.({ message: 'I need help creating a professional CV. Please guide me through the process and ask for all the necessary information.', type: 'chat', agent: 'CV Writer Agent' })}
              className="p-6 rounded-2xl border cursor-pointer transition-all duration-200 hover:shadow-md"
              style={{
                border: '1px solid #E8E8E5',
                background: '#FFF'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = '#F8F8F3';
                e.currentTarget.style.borderColor = '#D1D1D1';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = '#FFF';
                e.currentTarget.style.borderColor = '#E8E8E5';
              }}
            >
              <div className="flex items-center gap-4">
                <div 
                  style={{
                    width: '48px',
                    height: '48px',
                    background: '#059669',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px'
                  }}
                >
                  👤
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-semibold mb-1" style={{ color: '#232323' }}>CV</h3>
                  <p className="text-sm" style={{ color: '#6C6C6C' }}>Create professional CVs with CV Writer Agent</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      ) : activeTab === 'notes' ? (
        <div className={`flex ${isExpanded ? 'flex-col lg:flex-row' : 'flex-col'} h-full w-full overflow-hidden ${isExpanded ? 'max-w-7xl mx-auto' : ''}`}>
          <div className={`flex flex-col h-full w-full overflow-hidden ${isExpanded ? 'flex-grow lg:mr-8' : ''}`}>
            {/* Editor container with its own scroll - flexGrow makes it fill remaining space */}
            <div className={`flex-grow overflow-auto ${isExpanded ? 'px-4 sm:px-8 md:px-16 lg:px-32' : ''}`} style={{ height: 0, minHeight: 0 }}>
              {noteParagraphs && noteParagraphs.length === 0 ? (
                <div className="p-6 h-full flex flex-col items-center justify-center text-center">
                  <div className="mb-6">
                    <div 
                      className="w-16 h-16 rounded-full flex items-center justify-center"
                      style={{ background: '#6C6C6C' }}
                    >
                      <FileText className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  
                  <p className="mb-4 max-w-md" style={{ color: '#3C3C3C', fontSize: '16px' }}>
                    No text content yet. Use the overview to create your first paragraph.
                  </p>
                </div>
              ) : (
                <ParagraphEditor 
                  paragraphs={noteParagraphs || []}
                  onParagraphUpdate={onParagraphUpdate || (() => {})}
                  onParagraphAdd={onParagraphAdd || (() => {})}
                  onReferencesUpdate={onReferencesUpdate || (() => {})}
                  onFileReferenceClick={onFileReferenceClick}
                  onSendMessage={onSendMessage}
                  flashCards={flashCards}
                  agentSlides={agentSlides}
                  cvContent={cvContent}
                />
              )}
            </div>
          </div>
          
          {/* Full-size outline sidebar - only show when expanded and on larger screens */}
          {isExpanded && (
            <div className="hidden lg:block w-96 h-full border-l border-gray-200 overflow-hidden flex-shrink-0">
              <div className="h-full overflow-y-auto p-4">
                {/* Presentation Preview - show if presentations exist */}
                {(() => {
                  console.log('🎯 Checking presentation preview conditions:', {
                    agentSlides: agentSlides?.length || 0,
                    isExpanded,
                    activeTab: activeTab,
                    firstSlide: agentSlides?.[0]
                  });
                  
                  return agentSlides && agentSlides.length > 0 && (
                    <div className="mb-6">
                                          <div className="mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Presentation Preview</h3>
                    </div>
                      
                      <FirstSlidePreview 
                        agentSlides={agentSlides}
                        currentConversationId={currentConversationId}
                        userId={userId}
                        onOpenPresentation={() => handleTabChange('presentations')}
                      />
                    </div>
                  );
                })()}
                
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Document Outline</h3>
                </div>
                
                {(() => {
                  const outline = extractOutline();
                  
                  if (outline.length === 0) {
                    return (
                      <div className="text-center py-12 text-gray-500">
                        <List className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-base font-medium mb-2">No outline available</p>
                        <p className="text-sm">Add headings to your paragraphs to see the document structure</p>
                      </div>
                    );
                  }
                  
                  return (
                    <div className="space-y-2">
                      {outline.map((item, index) => (
                        <div
                          key={item.id}
                          onClick={() => scrollToParagraph(item.paragraphIndex)}
                          className="flex items-start p-2 rounded-lg hover:bg-white cursor-pointer transition-all duration-200"
                        >
                          <div className="flex-grow min-w-0">
                            <p 
                              className={`text-sm leading-relaxed ${
                                item.level === 1 ? 'font-bold text-gray-900 text-base' :
                                item.level === 2 ? 'font-semibold text-gray-800' :
                                item.level > 2 ? 'font-medium text-gray-700' :
                                'text-gray-600 text-xs'
                              }`}
                              title={item.text}
                            >
                              {item.text}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              Section {item.paragraphIndex + 1}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      ) : activeTab === 'flashcards' ? (
        <div className={`flex flex-col h-full w-full overflow-hidden ${isExpanded ? 'max-w-7xl mx-auto px-4 sm:px-8 md:px-16 lg:px-32' : ''}`}>
          <FlashCards 
            userId={userId || undefined}
            currentConversationId={currentConversationId}
            flashCards={flashCards || []}
            onCreateCard={onCreateFlashCard || (() => {})}
            onEditCard={onEditFlashCard || (() => {})}
            onDeleteCard={onDeleteFlashCard || (() => {})}
            onReviewCard={onReviewFlashCard || (() => {})}
            onSendMessage={onSendMessage ? (message, agent) => onSendMessage({ message, type: 'chat', agent }) : undefined}
          />
        </div>
      ) : activeTab === 'cv' ? (
        <div className={`flex flex-col h-full w-full overflow-hidden ${isExpanded ? 'max-w-7xl mx-auto px-4 sm:px-8 md:px-16 lg:px-32' : ''}`}>
          <CVViewer 
            cvContent={cvContent}
            onCreateCV={onCreateCV}
            onSendMessage={onSendMessage ? (message, agent) => onSendMessage({ message, type: 'chat', agent }) : undefined}
            isLoading={isLoadingCV}
          />
        </div>
      ) : activeTab === 'presentations' ? (
        <PresentationViewer 
          ref={presentationViewerRef}
          agentSlides={agentSlides}
          currentConversationId={currentConversationId}
          userId={userId}
        />
      ) : null}
    </div>
  );
}));

export { AgentsSidebar }; 
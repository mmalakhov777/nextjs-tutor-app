import React, { useState, useCallback, useEffect } from 'react';
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import BoldExtension from '@tiptap/extension-bold';
import ItalicExtension from '@tiptap/extension-italic';
import UnderlineExtension from '@tiptap/extension-underline';
import HeadingExtension from '@tiptap/extension-heading';
import BulletListExtension from '@tiptap/extension-bullet-list';
import OrderedListExtension from '@tiptap/extension-ordered-list';
import LinkExtension from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import ImageExtension from '@tiptap/extension-image';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import CodeBlockExtension from '@tiptap/extension-code-block';
import CodeExtension from '@tiptap/extension-code';
import StrikethroughExtension from '@tiptap/extension-strike';
import BlockquoteExtension from '@tiptap/extension-blockquote';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import { Plus, Trash2, Edit3, GripVertical, Bold, Italic, Underline, Strikethrough, List, ListOrdered, Quote, Code, Heading1, Heading2, Heading3, Link, AlignLeft, AlignCenter, AlignRight, Highlighter, Palette, Type, BookOpen, X, FileText, ExternalLink } from 'lucide-react';
import { marked } from 'marked';
import { useFileContext } from '@/contexts/FileContext';
import { FileReference } from '@/lib/tiptap-extensions/FileReference';
import { FileReferenceCircle } from '@/lib/tiptap-extensions/FileReferenceCircle';
import { fileReferenceInputRule } from '@/lib/tiptap-extensions/FileReferenceInputRule';

export interface NoteParagraph {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  references?: string[];
}

interface ParagraphEditorProps {
  paragraphs: NoteParagraph[];
  onParagraphUpdate: (paragraphNumber: number, paragraph: NoteParagraph) => void;
  onParagraphAdd?: () => void;
  onReferencesUpdate?: (paragraphNumber: number, references: string[]) => void;
  onSendMessage?: (payload: { message: string; type?: 'research' | 'chat'; agent?: string }) => void;
  onFileReferenceClick?: (fileId: string) => void;
  // Props to check existing assets
  flashCards?: any[];
  agentSlides?: any[];
  cvContent?: any;
}

interface SingleParagraphEditorProps {
  paragraph: NoteParagraph;
  paragraphNumber: number;
  onUpdate: (content: string) => void;
  placeholder?: string;
  onReferencesUpdate?: (references: string[]) => void;
  onFileReferenceClick?: (fileId: string) => void;
}

const filterCodeBlockWrappers = (text: string): string => {
  if (!text) return text;
  
  const codeBlockPattern = /^```[a-zA-Z0-9_-]*\n?([\s\S]*?)\n?```$/gm;
  let filtered = text.replace(codeBlockPattern, '$1');
  filtered = filtered.replace(/^```[a-zA-Z0-9_-]*\n?/, '');
  filtered = filtered.replace(/\n?```$/, '');
  
  return filtered.trim();
};

// Add function to extract references from JSON content
const extractReferencesFromContent = (content: string): string[] => {
  if (!content) return [];
  
  // Try to parse as JSON if it looks like JSON
  if (content.trim().startsWith('{') && content.trim().endsWith('}')) {
    try {
      const parsed = JSON.parse(content);
      if (parsed.references && Array.isArray(parsed.references)) {
        return parsed.references;
      }
    } catch (error) {
      // If JSON parsing fails, return empty array
      console.log('Failed to parse JSON for references extraction');
    }
  }
  
  return [];
};

// Function to aggressively clean content before processing
const cleanContentBeforeProcessing = (content: string): string => {
  if (!content) return content;
  
  let cleaned = content;
  
  // Remove all empty paragraphs first
  cleaned = cleaned.replace(/<p>\s*<\/p>/g, '');
  cleaned = cleaned.replace(/<p>(&nbsp;|\s|<br\s*\/?>)*<\/p>/g, '');
  
  // Replace multiple consecutive paragraph breaks with single ones
  cleaned = cleaned.replace(/(<\/p>\s*<p>){2,}/g, '</p><p>');
  
  // Specific pattern: paragraph followed by empty paragraph followed by paragraph
  cleaned = cleaned.replace(/<\/p>\s*<p>\s*<\/p>\s*<p>/g, '</p><p>');
  
  // Remove any paragraph that contains only whitespace, nbsp, or br tags
  cleaned = cleaned.replace(/<p>[\s\u00A0]*<\/p>/g, '');
  cleaned = cleaned.replace(/<p>(<br\s*\/?>|\s|\u00A0)*<\/p>/g, '');
  
  // Remove excessive br tags
  cleaned = cleaned.replace(/(<br\s*\/?>){2,}/gi, '<br>');
  
  // Clean up whitespace between tags
  cleaned = cleaned.replace(/>\s+</g, '><');
  
  console.log('cleanContentBeforeProcessing - input:', content);
  console.log('cleanContentBeforeProcessing - output:', cleaned);
  
  return cleaned;
};

// Add function to process content with escaped newlines
const processContentForEditor = (content: string): string => {
  if (!content) return content;
  
  // Clean content first
  content = cleanContentBeforeProcessing(content);
  
  // First, try to parse as JSON if it looks like JSON
  if (content.trim().startsWith('{') && content.trim().endsWith('}')) {
    try {
      const parsed = JSON.parse(content);
      if (parsed.content) {
        // Extract only the content field from JSON
        content = parsed.content;
      }
    } catch (error) {
      // If JSON parsing fails, continue with the original content
      console.log('Failed to parse JSON content, using as-is');
    }
  }
  
  // Handle escaped newlines from JSON content
  let processedContent = content;
  
  // Replace escaped newlines with actual newlines
  processedContent = processedContent.replace(/\\n/g, '\n');
  
  // Clean up excessive line breaks - replace 2 or more consecutive newlines with just 1
  processedContent = processedContent.replace(/\n{2,}/g, '\n');
  
  // Clean up excessive <br> tags in HTML content - remove all consecutive br tags
  processedContent = processedContent.replace(/(<br\s*\/?>){2,}/gi, '<br>');
  
  // Clean up empty paragraphs and excessive spacing between paragraphs
  processedContent = processedContent.replace(/<p>\s*<\/p>/g, '');
  processedContent = processedContent.replace(/<p>\s*<br\s*\/?>\s*<\/p>/g, '');
  processedContent = processedContent.replace(/(<\/p>\s*){2,}(<p>)/g, '</p>$2');
  
  // Remove multiple consecutive empty paragraphs in any form
  processedContent = processedContent.replace(/(<p>(&nbsp;|\s|<br\s*\/?>)*<\/p>\s*){2,}/g, '');
  
  // Log for debugging
  console.log('processContentForEditor - cleaned content:', processedContent);
  
  // If content has newlines and is not already HTML, convert to HTML paragraphs
  if (processedContent.includes('\n') && !processedContent.includes('<p>')) {
    // Split by any newline to create paragraphs
    const paragraphs = processedContent
      .split(/\n+/)
      .map(p => p.trim())
      .filter(p => p.length > 0);
    
    // Wrap each paragraph in <p> tags if not already HTML
    const htmlParagraphs = paragraphs.map(p => {
      if (p.startsWith('<') && p.includes('>')) {
        // Already contains HTML tags
        return p;
      } else {
        // Plain text, wrap in paragraph
        return `<p>${p}</p>`;
      }
    });
    
    return htmlParagraphs.join('');
  }
  
  // If content has single newlines and is not HTML, convert to <br> tags
  if (processedContent.includes('\n') && !processedContent.includes('<')) {
    processedContent = processedContent.replace(/\n/g, '<br>');
  }
  
  // If content doesn't start with HTML tags and isn't already wrapped, wrap in paragraph
  if (!processedContent.trim().startsWith('<')) {
    processedContent = `<p>${processedContent}</p>`;
  }
  
  // Ensure file references are not double-wrapped
  processedContent = processedContent.replace(/<p>(<p>|<h[1-6]>)/g, '$1');
  processedContent = processedContent.replace(/(<\/p>|<\/h[1-6]>)<\/p>/g, '$1');
  
  // Final cleanup - remove any remaining empty paragraphs and excessive spacing
  processedContent = processedContent.replace(/<p>\s*<\/p>/g, '');
  processedContent = processedContent.replace(/<p>(\s|&nbsp;|<br\s*\/?>)*<\/p>/g, '');
  processedContent = processedContent.replace(/(<\/p>\s*<p>){2,}/g, '</p><p>');
  
  // Remove newlines between HTML tags to prevent spacing issues
  processedContent = processedContent.replace(/>\s*\n\s*</g, '><');
  
  return processedContent;
};

const parseMarkdown = async (text: string): Promise<string> => {
  const filteredText = filterCodeBlockWrappers(text);
  
  const markdownPatterns = [
    /^\|.*\|.*$/gm, // tables
    /^#{1,6}\s/gm, // headings
    /\*\*.*\*\*/g, // bold
    /__.*__/g, // bold alternative
    /\*.*\*/g, // italic
    /_.*_/g, // italic alternative
    /~~.*~~/g, // strikethrough
    /`.*`/g, // inline code
    /```[\s\S]*?```/g, // code blocks
    /^\s*[-*+]\s/gm, // bullet lists
    /^\s*\d+\.\s/gm, // numbered lists
    /\[.*\]\(.*\)/g, // links
    /^>\s/gm, // blockquotes
  ];
  
  const hasMarkdown = markdownPatterns.some(pattern => pattern.test(filteredText));
  
  if (!hasMarkdown) {
    return filteredText;
  }

  try {
    marked.setOptions({
      gfm: true,
      breaks: true,
    });
    
    const html = await marked(filteredText);
    return html;
  } catch (error) {
    console.error('Error parsing markdown:', error);
    return filteredText;
  }
};

// Add function to extract file IDs from content
const extractFileIdsFromContent = (content: string): string[] => {
  if (!content) return [];
  
  const fileIds: string[] = [];
  
  // Regular expression to match both single and multiple file ID patterns
  // Matches: ["file-id"] or ["file-id1", "file-id2", ...]
  const fileIdPattern = /\[([^\]]+)\]/g;
  const matches = content.matchAll(fileIdPattern);
  
  for (const match of matches) {
    const inner = match[1];
    try {
      // Try to parse as JSON array
      const parsed = JSON.parse(`[${inner}]`);
      if (Array.isArray(parsed)) {
        // Add all valid string IDs from the array
        for (const id of parsed) {
          if (typeof id === 'string' && id.trim()) {
            fileIds.push(id.trim());
          }
        }
      }
    } catch {
      // If JSON parsing fails, try to extract quoted strings manually
      const quotedPattern = /"([^"]+)"/g;
      const quotedMatches = inner.matchAll(quotedPattern);
      for (const quotedMatch of quotedMatches) {
        if (quotedMatch[1] && quotedMatch[1].trim()) {
          fileIds.push(quotedMatch[1].trim());
        }
      }
    }
  }
  
  return [...new Set(fileIds)]; // Remove duplicates
};

const SingleParagraphEditor: React.FC<SingleParagraphEditorProps> = ({ 
  paragraph, 
  paragraphNumber, 
  onUpdate, 
  placeholder = "Write your paragraph content...",
  onReferencesUpdate,
  onFileReferenceClick
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showReferences, setShowReferences] = useState(false);
  const [newReference, setNewReference] = useState('');
  const { getFileMetadataFromLocalStorage } = useFileContext();
  const [displayedFileIds, setDisplayedFileIds] = useState<string[]>([]);
  
  // Extract file IDs from paragraph content
  const fileIds = extractFileIdsFromContent(paragraph.content);
  
  // Initialize displayed file IDs when component mounts or content changes
  useEffect(() => {
    if (fileIds.length > 0) {
      setDisplayedFileIds(fileIds);
    }
  }, []); // Run only on mount
  
  // Update displayed file IDs when paragraph content changes
  useEffect(() => {
    const newFileIds = extractFileIdsFromContent(paragraph.content);
    if (newFileIds.length > 0) {
      setDisplayedFileIds(newFileIds);
    }
  }, [paragraph.content]);
  
  // Process content to prepare it for the editor
  const prepareContentForEditor = (content: string): string => {
    if (!content) return processContentForEditor(content);
    
    // Clean the content first
    content = cleanContentBeforeProcessing(content);
    
    // First, normalize all existing superscripts back to raw ID syntax to prevent duplication
    let normalizedContent = content.replace(/<sup[^>]*class="file-reference"[^>]*data-file-id="([^"]*)"[^>]*>\[\d+(?:,\d+)*\]<\/sup>/g,
      (_, fileIds) => {
        // Handle both single and multiple file IDs
        const ids = fileIds.split(',').map((id: string) => id.trim());
        if (ids.length === 1) {
          return `["${ids[0]}"]`;
        } else {
          return `[${ids.map((id: string) => `"${id}"`).join(', ')}]`;
        }
      }
    );
    
    // Also remove any duplicate consecutive file ID patterns that might exist
    // This handles cases like ["file-id"]["file-id"] -> ["file-id"] and ["id1","id2"]["id1","id2"] -> ["id1","id2"]
    normalizedContent = normalizedContent.replace(/(\[[^\]]+\])(\1)+/g, '$1');
    
    // Extract file IDs directly from normalized content
    const contentFileIds = extractFileIdsFromContent(normalizedContent);
    console.log('Extracted file IDs from content:', contentFileIds);
    if (contentFileIds.length === 0) {
      return processContentForEditor(normalizedContent);
    }
    
    // First process the normalized content normally
    let processed = processContentForEditor(normalizedContent);
    
    // Keep track of all file IDs encountered and their assigned indices
    const fileIdToIndexMap = new Map<string, number>();
    let currentIndex = 1;
    
    // Replace any bracketed ID arrays (single or multiple) with separate circle divs
    // Use a more precise regex to avoid double-processing
    processed = processed.replace(/\[\s*((?:"[^"]+"\s*)(?:,\s*"[^"]+"\s*)*)\]/g, (match, inner) => {
      // Skip if this is already inside a span tag
      if (match.includes('<span') || match.includes('</span>')) {
        return match;
      }
      
      let idsArr: string[] = [];
      try {
        idsArr = JSON.parse("[" + inner.trim() + "]");
      } catch {
        return match;
      }
      
      // Create separate circle divs for each file ID
      const circles = idsArr.map(id => {
        // Assign index based on first occurrence order
        const isNew = !fileIdToIndexMap.has(id);
        if (isNew) {
          fileIdToIndexMap.set(id, currentIndex++);
        }
        const index = fileIdToIndexMap.get(id)!;
        console.log(`File ID "${id}" - isNew: ${isNew}, assigned index: ${index}`);
        return `<span class=\"file-reference-circle\" data-file-id=\"${id}\" data-index=\"${index}\">${index}</span>`;
      });
      
      console.log('Converting file IDs to circles:', { 
        match, 
        idsArr, 
        circles, 
        fileIdToIndexMap: Object.fromEntries(fileIdToIndexMap),
        currentIndex 
      });
      return circles.join('');
    });

    return processed;
  };
  
  const editor = useEditor({
    extensions: [
      StarterKit,
      BoldExtension,
      ItalicExtension,
      UnderlineExtension,
      StrikethroughExtension,
      HeadingExtension.configure({
        levels: [1, 2, 3, 4, 5, 6],
      }),
      BulletListExtension,
      OrderedListExtension,
      LinkExtension.configure({
        openOnClick: false,
      }),
      CodeExtension,
      CodeBlockExtension.configure({
        HTMLAttributes: {
          class: 'hljs',
        },
      }),
      BlockquoteExtension,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Highlight.configure({
        multicolor: true,
      }),
      TextStyle,
      Color,
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
      ImageExtension,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableCell,
      TableHeader,
      FileReferenceCircle,
    ],
    content: prepareContentForEditor(paragraph.content),
    editable: true,
    autofocus: false,
    onCreate: ({ editor }) => {
      // Force initial processing of file references after editor is ready
      const preparedContent = prepareContentForEditor(paragraph.content);
      
      // Clean up the HTML content to remove excessive spacing
      let cleanedContent = preparedContent;
      
      // Get the HTML and clean it
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = cleanedContent;
      
      // Remove empty paragraphs
      const paragraphs = tempDiv.querySelectorAll('p');
      paragraphs.forEach(p => {
        // Check if paragraph is empty or only contains br tags
        const textContent = p.textContent?.trim() || '';
        const onlyHasBr = p.childNodes.length === 1 && p.firstChild?.nodeName === 'BR';
        if (!textContent || onlyHasBr) {
          p.remove();
        }
      });
      
      // Clean up excessive br tags
      tempDiv.innerHTML = tempDiv.innerHTML.replace(/(<br\s*\/?>){2,}/gi, '<br>');
      
      // Additional cleanup for any remaining empty paragraphs
      tempDiv.innerHTML = tempDiv.innerHTML.replace(/<p>(&nbsp;|\s|<br\s*\/?>)*<\/p>/g, '');
      
      // Remove any paragraphs that only contain whitespace
      const allParagraphs = tempDiv.querySelectorAll('p');
      allParagraphs.forEach(p => {
        if (!p.textContent?.trim()) {
          p.remove();
        }
      });
      
      cleanedContent = tempDiv.innerHTML;
      
      console.log('onCreate - original content:', paragraph.content);
      console.log('onCreate - prepared content:', preparedContent);
      console.log('onCreate - cleaned content:', cleanedContent);
      
      // Always set content to ensure file references are properly rendered
      editor.commands.setContent(cleanedContent);
      
      // Update displayed file IDs
      const newFileIds = extractFileIdsFromContent(paragraph.content);
      if (newFileIds.length > 0) {
        setDisplayedFileIds(newFileIds);
      }
    },
    onUpdate: ({ editor }) => {
      let html = editor.getHTML();
      
      // Clean up excessive spacing in the HTML
      html = html.replace(/<p>\s*<\/p>/g, ''); // Remove empty paragraphs
      html = html.replace(/<p>(&nbsp;|\s|<br\s*\/?>)*<\/p>/g, ''); // Remove paragraphs with only whitespace/br
      html = html.replace(/(<br\s*\/?>){2,}/gi, '<br>'); // Remove consecutive br tags
      html = html.replace(/(<\/p>\s*){2,}(<p>)/g, '</p>$2'); // Clean up multiple closing/opening p tags
      
      // Remove consecutive empty paragraphs
      html = html.replace(/(<p>\s*<\/p>\s*){2,}/g, '');
      
      console.log('onUpdate - cleaned HTML:', html);
      
      // Extract file IDs that are currently displayed
      const currentFileIds: string[] = [];
      const fileIdMatches = html.matchAll(/data-file-id="([^"]*)"/g);
      for (const match of fileIdMatches) {
        if (match[1] && match[1].trim()) {
          // Each data-file-id now contains only one file ID
          const id = match[1].trim();
          if (!currentFileIds.includes(id)) {
            currentFileIds.push(id);
          }
        }
      }
      
      // Also extract any raw file IDs that haven't been converted yet
      const rawFileIds = extractFileIdsFromContent(html);
      for (const fileId of rawFileIds) {
        if (!currentFileIds.includes(fileId)) {
          currentFileIds.push(fileId);
        }
      }
      
      setDisplayedFileIds(currentFileIds);
      
      // Convert individual circle references back to file IDs for storage
      // Group consecutive circle references and convert them back to file ID arrays
      let normalizedHtml = html;
      
      // First, find all consecutive circle references and group them
      normalizedHtml = normalizedHtml.replace(/(<span[^>]*class="file-reference-circle"[^>]*data-file-id="([^"]*)"[^>]*>\d+<\/span>)+/g, (match) => {
        // Extract all file IDs from consecutive circle references
        const fileIds: string[] = [];
        const spanRegex = /<span[^>]*class="file-reference-circle"[^>]*data-file-id="([^"]*)"[^>]*>\d+<\/span>/g;
        let spanMatch;
        while ((spanMatch = spanRegex.exec(match)) !== null) {
          if (spanMatch[1] && !fileIds.includes(spanMatch[1])) {
            fileIds.push(spanMatch[1]);
          }
        }
        
        // Convert back to file ID array format
        if (fileIds.length === 1) {
          return `["${fileIds[0]}"]`;
        } else if (fileIds.length > 1) {
          return `[${fileIds.map(id => `"${id}"`).join(', ')}]`;
        }
        return match;
      });
      
      onUpdate(normalizedHtml);
    },
    onFocus: () => {
      setIsFocused(true);
    },
    onBlur: () => {
      setIsFocused(false);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none',
      },
      handleClick(view, pos, event) {
        const target = event.target as HTMLElement;
        if (target.classList.contains('file-reference-circle')) {
          const fileId = target.getAttribute('data-file-id');
          if (fileId && onFileReferenceClick) {
            // Each circle reference now contains only one file ID
            onFileReferenceClick(fileId.trim());
            return true;
          }
        }
        return false;
      },
      handlePaste(view, event, slice) {
        const html = event.clipboardData?.getData('text/html');
        const text = event.clipboardData?.getData('text/plain');
        
        if (html && editor) {
          editor.commands.insertContent(html);
          return true;
        } else if (text && editor) {
          const filteredText = filterCodeBlockWrappers(text);
          
          const markdownPatterns = [
            /^\|.*\|.*$/gm,
            /^#{1,6}\s/gm,
            /\*\*.*\*\*/g,
            /__.*__/g,
            /\*.*\*/g,
            /_.*_/g,
            /~~.*~~/g,
            /`.*`/g,
            /```[\s\S]*?```/g,
            /^\s*[-*+]\s/gm,
            /^\s*\d+\.\s/gm,
            /\[.*\]\(.*\)/g,
            /^>\s/gm,
          ];
          
          const hasMarkdown = markdownPatterns.some(pattern => pattern.test(filteredText));
          
          if (hasMarkdown) {
            parseMarkdown(filteredText).then(parsedHtml => {
              editor.commands.insertContent(parsedHtml);
            }).catch(error => {
              console.error('Error parsing markdown:', error);
              editor.commands.insertContent(filteredText);
            });
            return true;
          } else if (filteredText.trim().startsWith('<') && filteredText.trim().endsWith('>')) {
            editor.commands.insertContent(filteredText);
            return true;
          } else {
            editor.commands.insertContent(filteredText);
            return true;
          }
        }
        return false;
      },
    },
  });

  const isEmpty = !paragraph.content || paragraph.content.trim() === '' || paragraph.content === '<p></p>';

  // References management - combine paragraph references with any references from JSON content
  const contentReferences = extractReferencesFromContent(paragraph.content);
  const paragraphReferences = paragraph.references || [];
  const references = [...new Set([...paragraphReferences, ...contentReferences])];
  
  const addReference = () => {
    if (newReference.trim() && onReferencesUpdate) {
      const updatedReferences = [...references, newReference.trim()];
      onReferencesUpdate(updatedReferences);
      setNewReference('');
    }
  };

  const removeReference = (index: number) => {
    if (onReferencesUpdate) {
      const updatedReferences = references.filter((_, i) => i !== index);
      onReferencesUpdate(updatedReferences);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addReference();
    }
  };

  return (
    <div 
      className={`group relative border rounded-lg transition-all duration-200 ${
        isFocused ? 'shadow-md' : 
        isEmpty ? 'border-gray-200 hover:border-gray-300' : 'border-gray-200 hover:border-gray-300'
      }`}
      style={{
        borderColor: isFocused ? '#70D6FF' : undefined,
        backgroundColor: isFocused ? 'rgba(112, 214, 255, 0.1)' : undefined
      }}
      data-paragraph-index={paragraphNumber - 1}
    >
      {/* Paragraph Number and Controls */}
      <div className={`absolute -left-8 top-2 flex items-center gap-1 transition-opacity duration-200 ${
        isFocused ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'
      }`}>
        <span className="text-xs font-mono text-gray-500 w-6 text-center">
          {paragraphNumber}
        </span>
      </div>

      {/* Editor Content */}
      <div 
        className="p-4"
        onClick={(e) => {
          e.preventDefault();
          setIsFocused(true);
          // Use setTimeout to ensure the editor is ready
          setTimeout(() => {
            if (editor && !editor.isFocused) {
              editor.commands.focus();
            }
          }, 10);
        }}
      >
        <EditorContent 
          editor={editor} 
          className="prose prose-sm max-w-none focus:outline-none"
          onClick={(e) => {
            e.stopPropagation();
            if (editor && !editor.isFocused) {
              editor.commands.focus();
            }
          }}
        />
        
        {/* Bubble Menu (appears on text selection) */}
        {editor && (
          <BubbleMenu 
            editor={editor} 
            tippyOptions={{ 
              duration: 100,
              placement: 'top',
              arrow: true,
              theme: 'light-border',
              interactive: true,
            }}
            className="bg-white border border-gray-300 rounded-lg shadow-lg p-2 flex items-center gap-1"
          >
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`p-1.5 rounded text-sm ${editor.isActive('bold') ? 'text-white' : 'hover:bg-gray-100'}`}
              style={{
                backgroundColor: editor.isActive('bold') ? '#70D6FF' : undefined
              }}
              title="Bold"
            >
              <Bold className="h-4 w-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`p-1.5 rounded text-sm ${editor.isActive('italic') ? 'text-white' : 'hover:bg-gray-100'}`}
              style={{
                backgroundColor: editor.isActive('italic') ? '#70D6FF' : undefined
              }}
              title="Italic"
            >
              <Italic className="h-4 w-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={`p-1.5 rounded text-sm ${editor.isActive('underline') ? 'text-white' : 'hover:bg-gray-100'}`}
              style={{
                backgroundColor: editor.isActive('underline') ? '#70D6FF' : undefined
              }}
              title="Underline"
            >
              <Underline className="h-4 w-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleStrike().run()}
              className={`p-1.5 rounded text-sm ${editor.isActive('strike') ? 'text-white' : 'hover:bg-gray-100'}`}
              style={{
                backgroundColor: editor.isActive('strike') ? '#70D6FF' : undefined
              }}
              title="Strikethrough"
            >
              <Strikethrough className="h-4 w-4" />
            </button>
            <div className="w-px h-6 bg-gray-300 mx-1"></div>
            <button
              onClick={() => editor.chain().focus().toggleHighlight().run()}
              className={`p-1.5 rounded text-sm ${editor.isActive('highlight') ? 'bg-yellow-100 text-yellow-700' : 'hover:bg-gray-100'}`}
              title="Highlight"
            >
              <Highlighter className="h-4 w-4" />
            </button>
            <div className="w-px h-6 bg-gray-300 mx-1"></div>
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              className={`p-1.5 rounded text-sm ${editor.isActive('heading', { level: 1 }) ? 'text-white' : 'hover:bg-gray-100'}`}
              style={{
                backgroundColor: editor.isActive('heading', { level: 1 }) ? '#70D6FF' : undefined
              }}
              title="Heading 1"
            >
              <Heading1 className="h-4 w-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className={`p-1.5 rounded text-sm ${editor.isActive('heading', { level: 2 }) ? 'text-white' : 'hover:bg-gray-100'}`}
              style={{
                backgroundColor: editor.isActive('heading', { level: 2 }) ? '#70D6FF' : undefined
              }}
              title="Heading 2"
            >
              <Heading2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              className={`p-1.5 rounded text-sm ${editor.isActive('heading', { level: 3 }) ? 'text-white' : 'hover:bg-gray-100'}`}
              style={{
                backgroundColor: editor.isActive('heading', { level: 3 }) ? '#70D6FF' : undefined
              }}
              title="Heading 3"
            >
              <Heading3 className="h-4 w-4" />
            </button>
            <div className="w-px h-6 bg-gray-300 mx-1"></div>
            <button
              onClick={() => {
                const url = window.prompt('Enter URL:');
                if (url) {
                  editor.chain().focus().setLink({ href: url }).run();
                }
              }}
              className={`p-1.5 rounded text-sm ${editor.isActive('link') ? 'text-white' : 'hover:bg-gray-100'}`}
              style={{
                backgroundColor: editor.isActive('link') ? '#70D6FF' : undefined
              }}
              title="Add Link"
            >
              <Link className="h-4 w-4" />
            </button>
          </BubbleMenu>
        )}
      </div>

      {/* File References Section - Perplexity Style */}
      {displayedFileIds.length > 0 && displayedFileIds.some(fileId => {
        const fileMetadata = getFileMetadataFromLocalStorage(fileId);
        return fileMetadata?.name || fileMetadata?.doc_title;
      }) && (
        <div className="border-t border-gray-100">
          <div className="px-4 py-3 space-y-2">
            <div className="text-xs font-medium text-gray-500 mb-2">Sources</div>
            <div className="flex flex-wrap gap-2">
              {displayedFileIds
                .map((fileId, index) => {
                  const fileMetadata = getFileMetadataFromLocalStorage(fileId);
                  const fileName = fileMetadata?.name || fileMetadata?.doc_title;
                  const fileType = fileMetadata?.doc_type || 'document';
                  
                  // Only show files that have valid metadata (name or doc_title)
                  if (!fileName) {
                    return null;
                  }
                  
                  return {
                    fileId,
                    fileName,
                    fileType,
                    fileMetadata,
                    originalIndex: index
                  };
                })
                .filter((fileData): fileData is NonNullable<typeof fileData> => fileData !== null)
                .map((fileData, displayIndex) => (
                  <div
                    key={fileData.fileId}
                    className="group flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 border border-gray-200 rounded-full text-sm transition-all cursor-pointer"
                    title={fileData.fileName}
                    onClick={() => {
                      if (onFileReferenceClick) {
                        onFileReferenceClick(fileData.fileId);
                      }
                    }}
                  >
                    <span className="flex items-center justify-center w-5 h-5 rounded-full text-xs font-medium" style={{ backgroundColor: '#C7EFFF', color: '#232323' }}>
                      {displayIndex + 1}
                    </span>
                    <span className="text-gray-700 truncate max-w-[200px]">
                      {(() => {
                        const words = fileData.fileName.split(' ');
                        return words.length > 7 
                          ? words.slice(0, 7).join(' ') + '...'
                          : fileData.fileName;
                      })()}
                    </span>
                    <ExternalLink className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* References Section - HIDDEN FROM UI */}
      {false && onReferencesUpdate && (
        <div className="mt-2 border-t border-gray-200 rounded-b-lg overflow-hidden">
          <div className="flex items-center justify-between p-3 bg-gray-50">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">
                References ({references.length})
              </span>
            </div>
            <button
              onClick={() => setShowReferences(!showReferences)}
              className="text-xs font-medium"
              style={{ color: '#70D6FF' }}
            >
              {showReferences ? 'Hide' : 'Show'}
            </button>
          </div>
          
          {showReferences && (
            <div className="p-3 space-y-3">
              {/* Existing References */}
              {references.length > 0 && (
                <div className="space-y-2">
                  {references.map((reference, index) => (
                    <div key={index} className="flex items-start gap-2 p-2 bg-white border border-gray-200 rounded text-sm">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium" style={{ backgroundColor: '#70D6FF', color: 'white' }}>
                        {index + 1}
                      </span>
                      <span className="flex-grow text-gray-700 break-words">{reference}</span>
                      <button
                        onClick={() => removeReference(index)}
                        className="flex-shrink-0 text-gray-400 hover:text-red-600 transition-colors"
                        title="Remove reference"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Add New Reference */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newReference}
                  onChange={(e) => setNewReference(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Add a reference (URL, citation, etc.)"
                  className="flex-grow px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{
                    '--tw-ring-color': '#70D6FF'
                  } as React.CSSProperties}
                />
                <button
                  onClick={addReference}
                  disabled={!newReference.trim()}
                  className="px-3 py-2 text-sm text-white rounded-md hover:opacity-80 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  style={{
                    backgroundColor: '#70D6FF'
                  }}
                >
                  Add
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <style jsx global>{`
        .ProseMirror {
          outline: none;
          min-height: 60px;
          line-height: 1.6;
          cursor: text;
          caret-color: #70D6FF !important;
        }
        .ProseMirror * {
          cursor: text;
        }
        .ProseMirror:focus {
          caret-color: #70D6FF !important;
        }
        .ProseMirror p {
          caret-color: #70D6FF !important;
        }
        .ProseMirror.is-editor-empty:first-child::before {
          color: #9ca3af;
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
        .prose p {
          margin-top: 0.5em;
          margin-bottom: 0.5em;
          line-height: 1.7;
        }
        .prose p:first-child {
          margin-top: 0;
        }
        .prose p:last-child {
          margin-bottom: 0;
        }
        .prose br {
          display: block;
          margin: 0.5em 0;
        }
        .prose h1, .prose h2, .prose h3, .prose h4, .prose h5, .prose h6 {
          margin-top: 0.75em;
          margin-bottom: 0.5em;
          font-weight: 600;
          line-height: 1.25;
        }
        .prose h1 {
          font-size: 2em;
          color: #1f2937;
        }
        .prose h2 {
          font-size: 1.5em;
          color: #374151;
        }
        .prose h3 {
          font-size: 1.25em;
          color: #4b5563;
        }
        .prose ul, .prose ol {
          margin-top: 0.5em;
          margin-bottom: 0.5em;
          padding-left: 1.5em;
        }
        .prose li {
          margin: 0.25em 0;
        }
        .prose blockquote {
          border-left: 4px solid #e5e7eb;
          padding-left: 1em;
          margin: 1em 0;
          font-style: italic;
          color: #6b7280;
        }
        .prose code {
          background-color: #f3f4f6;
          padding: 0.125em 0.25em;
          border-radius: 0.25em;
          font-size: 0.875em;
          color: #dc2626;
        }
        .prose pre {
          background-color: #1f2937;
          color: #f9fafb;
          padding: 1em;
          border-radius: 0.5em;
          overflow-x: auto;
          margin: 1em 0;
        }
        .prose pre code {
          background-color: transparent;
          color: inherit;
          padding: 0;
        }
        .prose a {
          color: #70D6FF;
          text-decoration: underline;
        }
        .prose a:hover {
          color: #70D6FF;
          opacity: 0.8;
        }
        .prose strong {
          font-weight: 600;
          color: #111827;
        }
        .prose em {
          font-style: italic;
        }
        .prose u {
          text-decoration: underline;
        }
        .prose s {
          text-decoration: line-through;
        }
        .prose mark {
          background-color: #fef08a;
          padding: 0.125em 0.25em;
          border-radius: 0.125em;
        }
        .prose table {
          width: 100%;
          border-collapse: collapse;
          margin: 1em 0;
        }
        .prose th, .prose td {
          border: 1px solid #e5e7eb;
          padding: 0.5em;
          text-align: left;
        }
        .prose th {
          background-color: #f9fafb;
          font-weight: 600;
        }
        .prose img {
          max-width: 100%;
          height: auto;
          border-radius: 0.5em;
          margin: 1em 0;
        }
        /* Text alignment classes */
        .prose [style*="text-align: center"] {
          text-align: center;
        }
        .prose [style*="text-align: right"] {
          text-align: right;
        }
        .prose [style*="text-align: left"] {
          text-align: left;
        }
        /* Custom highlight colors */
        .prose mark[data-color="yellow"] {
          background-color: #fef08a;
        }
        .prose mark[data-color="green"] {
          background-color: #bbf7d0;
        }
        .prose mark[data-color="blue"] {
          background-color: #bfdbfe;
        }
        .prose mark[data-color="pink"] {
          background-color: #fce7f3;
        }
        /* Paragraph highlight animation - REMOVED */
        /* File reference circle styles */
        .prose .file-reference-circle {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          background-color: #C7EFFF;
          color: #232323;
          border-radius: 50%;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          margin: 0 2px;
          vertical-align: text-top;
          line-height: 1;
        }
        .prose .file-reference-circle:hover {
          background-color: #A3E4FF;
          color: #232323;
          transform: scale(1.1);
        }
      `}</style>
    </div>
  );
};

const ParagraphEditor: React.FC<ParagraphEditorProps> = ({ 
  paragraphs, 
  onParagraphUpdate, 
  onParagraphAdd,
  onReferencesUpdate,
  onSendMessage,
  onFileReferenceClick,
  flashCards,
  agentSlides,
  cvContent
}) => {
  const handleParagraphUpdate = useCallback((paragraphNumber: number, content: string) => {
    const paragraph = paragraphs[paragraphNumber - 1];
    if (paragraph) {
      const updatedParagraph: NoteParagraph = {
        ...paragraph,
        content,
        updatedAt: new Date()
      };
      onParagraphUpdate(paragraphNumber, updatedParagraph);
    }
  }, [paragraphs, onParagraphUpdate]);

  const handleAddParagraph = useCallback(() => {
    if (onParagraphAdd) {
      onParagraphAdd();
    }
  }, [onParagraphAdd]);

  const handleReferencesUpdate = useCallback((paragraphNumber: number, references: string[]) => {
    if (onReferencesUpdate) {
      onReferencesUpdate(paragraphNumber, references);
    }
  }, [onReferencesUpdate]);

  return (
    <div className="space-y-2 p-4">
      {paragraphs.map((paragraph, index) => (
        <SingleParagraphEditor
          key={paragraph.id}
          paragraph={paragraph}
          paragraphNumber={index + 1}
          onUpdate={(content) => handleParagraphUpdate(index + 1, content)}
          placeholder={`Paragraph ${index + 1} content...`}
          onReferencesUpdate={(references) => handleReferencesUpdate(index + 1, references)}
          onFileReferenceClick={onFileReferenceClick}
        />
      ))}
      
      {/* Add New Paragraph Button */}
      {onSendMessage && (
        <button
          onClick={() => onSendMessage({ message: `Please add a new paragraph to my text content. Continue writing about the topics we've been discussing. This will be paragraph ${paragraphs.length + 1}.`, type: 'chat', agent: 'Content Writer Agent' })}
          className="w-full border rounded-lg p-4 transition-all duration-200 flex items-center justify-center gap-2 border-gray-200 hover:border-gray-300 text-gray-500 hover:text-gray-600"
        >
          <Plus className="h-4 w-4" />
          Add new paragraph
        </button>
      )}

      {/* Create Other Content Buttons */}
      {onSendMessage && paragraphs.length > 0 && (
        <div className="mt-4 space-y-3">
          <div className="text-sm text-gray-600 font-medium mb-3">Create from your text:</div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Create Flashcards Button - show if no flashcards exist */}
            {(!flashCards || flashCards.length === 0) && (
              <button
                onClick={() => onSendMessage({ message: 'Create flashcards based on my text content', type: 'chat', agent: 'Flash Card Maker' })}
                className="border rounded-lg p-4 transition-all duration-200 flex items-center gap-3 border-gray-200 hover:border-gray-300 text-gray-700 hover:text-gray-800 hover:bg-gray-50"
              >
                <div 
                  style={{
                    width: '32px',
                    height: '32px',
                    background: '#232323',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px'
                  }}
                >
                  🧠
                </div>
                <div className="flex-1 text-left">
                  <div className="font-medium">Create Flashcards</div>
                  <div className="text-sm text-gray-500">Generate study cards from your text</div>
                </div>
              </button>
            )}

            {/* Create Presentation Button - show if no presentations exist */}
            {(!agentSlides || agentSlides.length === 0) && (
              <button
                onClick={() => onSendMessage({ message: 'Create a presentation about the key topics from my text content', type: 'chat', agent: 'Presentation Creator Agent' })}
                className="border rounded-lg p-4 transition-all duration-200 flex items-center gap-3 border-gray-200 hover:border-gray-300 text-gray-700 hover:text-gray-800 hover:bg-gray-50"
              >
                <div 
                  style={{
                    width: '32px',
                    height: '32px',
                    background: '#9333EA',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px'
                  }}
                >
                  🎭
                </div>
                <div className="flex-1 text-left">
                  <div className="font-medium">Create Presentation</div>
                  <div className="text-sm text-gray-500">Build slides from your content</div>
                </div>
              </button>
            )}

            {/* Create CV Button - show if no CV exists */}
            {(!cvContent || cvContent === null) && (
              <button
                onClick={() => onSendMessage({ message: 'Help me create a professional CV using information from my text content', type: 'chat', agent: 'CV Writer Agent' })}
                className="border rounded-lg p-4 transition-all duration-200 flex items-center gap-3 border-gray-200 hover:border-gray-300 text-gray-700 hover:text-gray-800 hover:bg-gray-50"
              >
                <div 
                  style={{
                    width: '32px',
                    height: '32px',
                    background: '#059669',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px'
                  }}
                >
                  👤
                </div>
                <div className="flex-1 text-left">
                  <div className="font-medium">Create CV</div>
                  <div className="text-sm text-gray-500">Generate a professional resume</div>
                </div>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ParagraphEditor; 
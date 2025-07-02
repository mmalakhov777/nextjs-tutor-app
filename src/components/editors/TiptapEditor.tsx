import { useEditor, EditorContent } from '@tiptap/react';
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
import { Bold, Italic, List, Heading, Underline, ListOrdered, Link as LucideLink, Table as TableIcon, Code, Quote, Strikethrough } from 'lucide-react';
import { useCallback, useEffect } from 'react';
import { marked } from 'marked';
import { RewriteIcon } from '@/components/icons/RewriteIcon';

interface TiptapEditorProps {
  content: string;
  onUpdate: (html: string) => void;
}

// Function to filter out markdown code block wrappers
const filterCodeBlockWrappers = (text: string): string => {
  if (!text) return text;
  
  // Remove markdown code block wrappers like ```html, ```javascript, ```css, etc.
  // This regex matches:
  // - Start of line (^) or newline
  // - Three backticks
  // - Optional language identifier (letters, numbers, hyphens, underscores)
  // - Optional newline
  // - Content (captured)
  // - Optional newline
  // - Three backticks
  // - End of line ($) or newline
  const codeBlockPattern = /^```[a-zA-Z0-9_-]*\n?([\s\S]*?)\n?```$/gm;
  
  // Replace code blocks with just their content
  let filtered = text.replace(codeBlockPattern, '$1');
  
  // Also handle cases where the content starts/ends with just the wrapper
  // Remove leading ```language at the start
  filtered = filtered.replace(/^```[a-zA-Z0-9_-]*\n?/, '');
  
  // Remove trailing ``` at the end
  filtered = filtered.replace(/\n?```$/, '');
  
  // Trim any extra whitespace
  return filtered.trim();
};

// Enhanced function to detect and convert all markdown to HTML
const parseMarkdown = async (text: string): Promise<string> => {
  // First filter out code block wrappers
  const filteredText = filterCodeBlockWrappers(text);
  
  // Check if text contains any markdown syntax
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
    // Configure marked to handle all markdown features
    marked.setOptions({
      gfm: true,
      breaks: true,
    });
    
    // Convert markdown to HTML
    const html = await marked(filteredText);
    return html;
  } catch (error) {
    console.error('Error parsing markdown:', error);
    return filteredText;
  }
};

const TiptapEditor = ({ content, onUpdate }: TiptapEditorProps) => {
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
      Placeholder.configure({
        placeholder: 'Take notes during your conversation...',
        emptyEditorClass: 'is-editor-empty',
      }),
      ImageExtension,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableCell,
      TableHeader,
    ],
    content,
    onUpdate: ({ editor }) => {
      onUpdate(editor.getHTML());
    },
    editorProps: {
      handlePaste(view, event, slice) {
        const html = event.clipboardData?.getData('text/html');
        const text = event.clipboardData?.getData('text/plain');
        
        if (html && editor) {
          // If clipboard has HTML (from web, Word, etc.), use it
          editor.commands.insertContent(html);
          return true;
        } else if (text && editor) {
          // First filter out code block wrappers
          const filteredText = filterCodeBlockWrappers(text);
          
          // Check if the text contains markdown syntax
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
          
          if (hasMarkdown) {
            // Parse all markdown and convert to HTML asynchronously
            parseMarkdown(filteredText).then(parsedHtml => {
              editor.commands.insertContent(parsedHtml);
            }).catch(error => {
              console.error('Error parsing markdown:', error);
              // Fallback to inserting filtered text
              editor.commands.insertContent(filteredText);
            });
            return true;
          } else if (filteredText.trim().startsWith('<') && filteredText.trim().endsWith('>')) {
            // If filtered text is plain text but looks like HTML code, treat as HTML
            editor.commands.insertContent(filteredText);
            return true;
          } else {
            // Insert the filtered text
            editor.commands.insertContent(filteredText);
            return true;
          }
        }
        // fallback to default
        return false;
      },
    },
  });

  // Update editor content when the content prop changes
  useEffect(() => {
    if (editor && content !== undefined) {
      const currentContent = editor.getHTML();
      
      // Filter incoming content to remove code block wrappers
      const filteredContent = filterCodeBlockWrappers(content);
      
      // Only update if the content is different
      if (currentContent !== filteredContent) {
        console.log('[TiptapEditor] Updating content from prop, length:', filteredContent.length);
        
        // Save current selection
        const { from, to } = editor.state.selection;
        
        // Update content with filtered content
        editor.commands.setContent(filteredContent, false);
        
        // Try to restore selection (at the end if beyond content)
        const newLength = editor.state.doc.content.size;
        const newFrom = Math.min(from, newLength);
        const newTo = Math.min(to, newLength);
        
        editor.commands.setTextSelection({ from: newFrom, to: newTo });
      }
    }
  }, [content, editor]);

  // Toggle link dialog - define this hook before any conditional returns
  const setLink = useCallback(() => {
    if (!editor) return;
    
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    // cancelled
    if (url === null) {
      return;
    }

    // empty
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    // update link
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  // Insert table function
  const insertTable = useCallback(() => {
    if (!editor) return;
    
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }, [editor]);

  // Handle rewrite function
  const handleRewrite = useCallback(() => {
    if (!editor) return;
    
    // Get the HTML content from the editor
    const htmlContent = editor.getHTML();
    
    // Strip HTML tags to get plain text
    const stripHtml = (html: string) => {
      if (!html) return '';
      const tmp = document.createElement('div');
      tmp.innerHTML = html;
      return tmp.textContent || tmp.innerText || '';
    };
    
    const plainText = stripHtml(htmlContent);
    
    // Open rewrite studio with the content
    const url = `https://mystylus.ai/rewrite-studio/?text=${encodeURIComponent(plainText)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }, [editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Fixed toolbar positioned at the top */}
      <div className="border-b border-gray-200 flex items-center gap-1 px-2 py-1 bg-white w-full">
        {/* Left side buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1 rounded ${editor.isActive('bold') ? 'bg-gray-100' : ''} hover:bg-gray-50`}
            title="Bold"
          >
            <Bold className="h-4 w-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1 rounded ${editor.isActive('italic') ? 'bg-gray-100' : ''} hover:bg-gray-50`}
            title="Italic"
          >
            <Italic className="h-4 w-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`p-1 rounded ${editor.isActive('underline') ? 'bg-gray-100' : ''} hover:bg-gray-50`}
            title="Underline"
          >
            <Underline className="h-4 w-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`p-1 rounded ${editor.isActive('strike') ? 'bg-gray-100' : ''} hover:bg-gray-50`}
            title="Strikethrough"
          >
            <Strikethrough className="h-4 w-4" />
          </button>
          <div className="w-px h-4 bg-gray-300 mx-1" />
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`p-1 rounded ${editor.isActive('heading', { level: 1 }) ? 'bg-gray-100' : ''} hover:bg-gray-50`}
            title="Heading 1"
          >
            <Heading className="h-4 w-4" />
          </button>
          <div className="w-px h-4 bg-gray-300 mx-1" />
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-1 rounded ${editor.isActive('bulletList') ? 'bg-gray-100' : ''} hover:bg-gray-50`}
            title="Bullet List"
          >
            <List className="h-4 w-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-1 rounded ${editor.isActive('orderedList') ? 'bg-gray-100' : ''} hover:bg-gray-50`}
            title="Numbered List"
          >
            <ListOrdered className="h-4 w-4" />
          </button>
          <div className="w-px h-4 bg-gray-300 mx-1" />
          <button
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={`p-1 rounded ${editor.isActive('code') ? 'bg-gray-100' : ''} hover:bg-gray-50`}
            title="Inline Code"
          >
            <Code className="h-4 w-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`p-1 rounded ${editor.isActive('blockquote') ? 'bg-gray-100' : ''} hover:bg-gray-50`}
            title="Quote"
          >
            <Quote className="h-4 w-4" />
          </button>
          <div className="w-px h-4 bg-gray-300 mx-1" />
          <button
            onClick={setLink}
            className={`p-1 rounded ${editor.isActive('link') ? 'bg-gray-100' : ''} hover:bg-gray-50`}
            title="Link"
          >
            <LucideLink className="h-4 w-4" />
          </button>
          <div className="w-px h-4 bg-gray-300 mx-1" />
          <button
            onClick={insertTable}
            className="p-1 rounded hover:bg-gray-50"
            title="Insert Table"
          >
            <TableIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div 
        className="flex-grow w-full h-full cursor-text overflow-auto"
        onClick={() => editor.chain().focus().run()}
      >
        <EditorContent 
          editor={editor} 
          className="w-full h-full"
          style={{
            padding: '16px',
            outline: 'none',
          }}
        />
      </div>
      
      {/* Footer with rewrite button - same size as toolbar */}
      <div className="border-t border-gray-200 flex items-center gap-1 px-2 py-1 bg-white w-full">
        <button
          onClick={handleRewrite}
          className="flex items-center gap-2 px-3 py-1 rounded hover:bg-gray-50 text-sm"
          title="Open in Rewrite Studio"
        >
          <RewriteIcon className="h-4 w-4" />
          <span>Rewrite</span>
        </button>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .ProseMirror {
          outline: none !important;
          box-shadow: none !important;
          border: none !important;
        }
        .ProseMirror:focus {
          outline: none !important;
          box-shadow: none !important;
          border: none !important;
        }
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #adb5bd;
          pointer-events: none;
          height: 0;
        }
        .ProseMirror img {
          max-width: 100%;
          height: auto;
          display: block;
          margin: 12px 0;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(35, 35, 35, 0.04);
        }
        .ProseMirror table {
          width: 100%;
          border-collapse: collapse;
          margin: 16px 0;
          background: #fff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(35, 35, 35, 0.03);
          border: 1px solid #e5e7eb;
        }
        .ProseMirror th, .ProseMirror td {
          border: 1px solid #e5e7eb;
          padding: 12px 16px;
          text-align: left;
          vertical-align: top;
        }
        .ProseMirror th {
          background: #f8fafc;
          font-weight: 600;
          color: #374151;
          border-bottom: 2px solid #d1d5db;
        }
        .ProseMirror tbody tr:nth-child(even) {
          background: #f9fafb;
        }
        .ProseMirror tbody tr:hover {
          background: #f3f4f6;
        }
        .ProseMirror code {
          background: #f1f5f9;
          color: #e11d48;
          padding: 2px 6px;
          border-radius: 4px;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 0.875em;
        }
        .ProseMirror pre {
          background: #1e293b;
          color: #e2e8f0;
          padding: 16px;
          border-radius: 8px;
          margin: 16px 0;
          overflow-x: auto;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 0.875em;
          line-height: 1.5;
        }
        .ProseMirror pre code {
          background: transparent;
          color: inherit;
          padding: 0;
          border-radius: 0;
          font-size: inherit;
        }
        .ProseMirror blockquote {
          border-left: 4px solid #e5e7eb;
          padding-left: 16px;
          margin: 16px 0;
          color: #6b7280;
          font-style: italic;
        }
        .ProseMirror h1, .ProseMirror h2, .ProseMirror h3, .ProseMirror h4, .ProseMirror h5, .ProseMirror h6 {
          margin: 24px 0 16px 0;
          font-weight: 600;
          line-height: 1.25;
        }
        .ProseMirror h1 { font-size: 2em; }
        .ProseMirror h2 { font-size: 1.5em; }
        .ProseMirror h3 { font-size: 1.25em; }
        .ProseMirror h4 { font-size: 1.125em; }
        .ProseMirror h5 { font-size: 1em; }
        .ProseMirror h6 { font-size: 0.875em; }
        .dark .ProseMirror table {
          background: #1f2937;
          border-color: #374151;
        }
        .dark .ProseMirror th {
          background: #374151;
          color: #f9fafb;
          border-bottom-color: #4b5563;
        }
        .dark .ProseMirror th, .dark .ProseMirror td {
          border-color: #4b5563;
        }
        .dark .ProseMirror tbody tr:nth-child(even) {
          background: #374151;
        }
        .dark .ProseMirror tbody tr:hover {
          background: #4b5563;
        }
        .dark .ProseMirror code {
          background: #374151;
          color: #fbbf24;
        }
        .dark .ProseMirror blockquote {
          border-left-color: #4b5563;
          color: #9ca3af;
        }
      `}} />
    </div>
  );
};

export default TiptapEditor; 
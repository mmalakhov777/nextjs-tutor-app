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
import { Bold, Italic, List, Heading, Underline, ListOrdered, Link as LucideLink } from 'lucide-react';
import { useCallback } from 'react';

interface TiptapEditorProps {
  content: string;
  onUpdate: (html: string) => void;
}

const TiptapEditor = ({ content, onUpdate }: TiptapEditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      BoldExtension,
      ItalicExtension,
      UnderlineExtension,
      HeadingExtension.configure({
        levels: [1, 2, 3],
      }),
      BulletListExtension,
      OrderedListExtension,
      LinkExtension.configure({
        openOnClick: false,
      }),
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
        } else if (text && editor && text.trim().startsWith('<') && text.trim().endsWith('>')) {
          // If clipboard is plain text but looks like HTML code, treat as HTML
          editor.commands.insertContent(text);
          return true;
        }
        // fallback to default
        return false;
      },
    },
  });

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

  if (!editor) {
    return null;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Fixed toolbar positioned at the top */}
      <div className="border-b border-gray-200 flex items-center gap-1 px-2 py-1 bg-white w-full">
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
          onClick={setLink}
          className={`p-1 rounded ${editor.isActive('link') ? 'bg-gray-100' : ''} hover:bg-gray-50`}
          title="Link"
        >
          <LucideLink className="h-4 w-4" />
        </button>
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
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }
        .ProseMirror table {
          width: 100%;
          border-collapse: collapse;
          margin: 16px 0;
          background: #fff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.03);
        }
        .ProseMirror th, .ProseMirror td {
          border: 1px solid #e5e7eb;
          padding: 8px 12px;
          text-align: left;
        }
        .ProseMirror th {
          background: #f3f4f6;
          font-weight: 600;
        }
      `}} />
    </div>
  );
};

export default TiptapEditor; 
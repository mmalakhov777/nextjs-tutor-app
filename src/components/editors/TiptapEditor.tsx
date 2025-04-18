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
    ],
    content,
    onUpdate: ({ editor }) => {
      onUpdate(editor.getHTML());
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
      <div className="border-b border-gray-200 flex items-center gap-1 px-2 py-1">
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
        className="flex-grow w-full h-full cursor-text"
        onClick={() => editor.chain().focus().run()}
      >
        <EditorContent 
          editor={editor} 
          className="w-full h-full overflow-y-auto"
          style={{
            height: 'calc(100vh - 100px)',
            padding: '16px',
            outline: 'none',
          }}
        />
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        .ProseMirror {
          min-height: calc(100vh - 100px);
          height: 100%;
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
      `}} />
    </div>
  );
};

export default TiptapEditor; 
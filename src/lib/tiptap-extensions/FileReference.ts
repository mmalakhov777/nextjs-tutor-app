import { Mark, mergeAttributes, markInputRule } from '@tiptap/core';

export interface FileReferenceOptions {
  HTMLAttributes: Record<string, any>;
  fileIds?: string[];
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fileReference: {
      /**
       * Set a file reference mark
       */
      setFileReference: (attributes: { fileId: string; index: number }) => ReturnType;
      /**
       * Toggle a file reference mark
       */
      toggleFileReference: (attributes: { fileId: string; index: number }) => ReturnType;
      /**
       * Unset a file reference mark
       */
      unsetFileReference: () => ReturnType;
    };
  }
}

export const FileReference = Mark.create<FileReferenceOptions>({
  name: 'fileReference',

  addOptions() {
    return {
      HTMLAttributes: {},
      fileIds: [] as string[],
    };
  },

  addAttributes() {
    return {
      fileId: {
        default: null,
        parseHTML: element => element.getAttribute('data-file-id'),
        renderHTML: attributes => {
          if (!attributes.fileId) {
            return {};
          }
          return {
            'data-file-id': attributes.fileId,
          };
        },
      },
      index: {
        default: 1,
        parseHTML: element => {
          const text = element.textContent || '';
          // For circle references, the text is just the number (no brackets)
          const num = parseInt(text, 10);
          return isNaN(num) ? 1 : num;
        },
        renderHTML: attributes => {
          return {};
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span.file-reference-circle',
      },
    ];
  },

  renderHTML({ HTMLAttributes, mark }) {
    const index = mark.attrs.index || 1;
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: 'file-reference-circle',
      }),
      `${index}`,
    ];
  },

  addCommands() {
    return {
      setFileReference:
        (attributes) =>
        ({ commands }) => {
          return commands.setMark(this.name, attributes);
        },
      toggleFileReference:
        (attributes) =>
        ({ commands }) => {
          return commands.toggleMark(this.name, attributes);
        },
      unsetFileReference:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        },
    };
  },

  addInputRules() {
    return [
      markInputRule({
        find: /\["([a-zA-Z0-9-]+)"\]$/,
        type: this.type,
        getAttributes: (match) => {
          const fileId = match[1];
          const fileIds = this.options.fileIds || [];
          const index = fileIds.indexOf(fileId) + 1;
          
          if (index === 0) {
            // File ID not in list, don't apply mark
            return false;
          }
          
          return {
            fileId,
            index,
          };
        },
      }),
    ];
  },
}); 
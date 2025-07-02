import { InputRule } from '@tiptap/core';

/**
 * Creates an input rule that converts ["file-id"] patterns to file reference marks
 */
export function fileReferenceInputRule(fileIds: string[]) {
  return new InputRule({
    // Match ["file-id"] pattern
    find: /\["([a-zA-Z0-9-]+)"\]$/,
    handler: ({ state, range, match, commands }) => {
      const fileId = match[1];
      const index = fileIds.indexOf(fileId) + 1;
      
      if (index === 0) {
        // File ID not found in the list, don't convert
        return null;
      }

      const start = range.from;
      const end = range.to;

      // Delete the matched text and insert the numbered reference
      commands.deleteRange({ from: start, to: end });
      commands.insertContentAt(start, {
        type: 'text',
        text: `[${index}]`,
        marks: [
          {
            type: 'fileReference',
            attrs: {
              fileId,
              index,
            },
          },
        ],
      });
    },
  });
} 
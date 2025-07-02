import { Node } from '@tiptap/core';

export const FileReferenceCircle = Node.create({
  name: 'fileReferenceCircle',

  group: 'inline',
  
  inline: true,
  
  atom: true,

  addAttributes() {
    return {
      'data-file-id': {
        default: null,
        parseHTML: element => element.getAttribute('data-file-id'),
        renderHTML: attributes => {
          if (!attributes['data-file-id']) {
            return {};
          }
          return {
            'data-file-id': attributes['data-file-id'],
          };
        },
      },
      class: {
        default: 'file-reference-circle',
        parseHTML: element => element.getAttribute('class'),
        renderHTML: attributes => {
          return {
            class: attributes.class || 'file-reference-circle',
          };
        },
      },
      index: {
        default: '1',
        parseHTML: element => element.getAttribute('data-index') || element.textContent || '1',
        renderHTML: attributes => {
          return {
            'data-index': attributes.index,
          };
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

  renderHTML({ HTMLAttributes, node }) {
    return [
      'span',
      {
        class: 'file-reference-circle',
        'data-file-id': HTMLAttributes['data-file-id'],
      },
      node.attrs.index || '1',
    ];
  },

  renderText({ node }) {
    return node.textContent || '1';
  },
}); 
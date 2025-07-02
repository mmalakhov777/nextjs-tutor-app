import { z } from 'zod';

export const editParagraphTool = {
  name: 'editParagraph',
  description: 'Create or edit a paragraph by paragraph number. Use this to build notes paragraph by paragraph. Each paragraph should contain meaningful content.',
  parameters: z.object({
    paragraphNumber: z.number().describe('The paragraph number (1, 2, 3, etc.) to create or edit'),
    content: z.string().describe('The paragraph content in HTML format with proper styling. Use p, h1-h6, ul, li, strong, em, blockquote, code tags. Include inline styles for colors, fonts, layouts, etc. IMPORTANT: When referencing information from uploaded files, include file IDs directly in the text using format: ["file-abc123"] or ["file-abc123", "doc-xyz789"] immediately after statements that reference those files. Use only file IDs from the __FILES_METADATA__ section.'),
    references: z.array(z.string()).optional().describe('Optional array of references for this paragraph (URLs, citations, sources, etc.)')
  }),
  execute: async ({ 
    paragraphNumber, 
    content,
    references
  }: { 
    paragraphNumber: number; 
    content: string; 
    references?: string[];
  }) => {
    console.log('[EDITPARAGRAPH][EXECUTE] Tool called with parameters:', {
      paragraphNumber,
      contentLength: content.length,
      contentPreview: content.substring(0, 100) + '...',
      referencesCount: references?.length || 0,
      references: references || [],
      hasInlineFileIds: /\["[^"]*"\]/.test(content),
      inlineFileIdsFound: content.match(/\["[^"]*"\]/g) || []
    });

    // Validate paragraph number
    if (paragraphNumber < 1) {
      throw new Error('Paragraph number must be 1 or greater');
    }

    // Create the paragraph object
    const paragraph = {
      id: paragraphNumber.toString(),
      content: content.trim(),
      createdAt: new Date(),
      updatedAt: new Date(),
      references: references || []
    };

    console.log('[EDITPARAGRAPH][RESULT] Tool completed successfully:', {
      paragraphNumber,
      contentLength: paragraph.content.length,
      referencesCount: paragraph.references.length,
      contentPreview: paragraph.content.substring(0, 200) + '...',
      hasInlineFileIds: /\["[^"]*"\]/.test(paragraph.content),
      inlineFileIdsFound: paragraph.content.match(/\["[^"]*"\]/g) || [],
      finalReferences: paragraph.references
    });

    // Return the paragraph data that the component can use
    return {
      success: true,
      paragraphNumber,
      paragraph,
      message: `Paragraph ${paragraphNumber} has been ${paragraphNumber <= 5 ? 'created' : 'updated'} successfully.`
    };
  },
}; 
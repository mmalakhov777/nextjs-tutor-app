import { z } from 'zod';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

export const writeTextTool = {
  name: 'writeText',
  description: 'Write comprehensive, expert-level content for a given prompt or topic (minimum 500 words)',
  parameters: z.object({
    prompt: z.string().describe('The prompt or topic to write about'),
    style: z.string().optional().describe('Optional writing style or tone'),
    length: z.string().optional().describe('Optional length or word count (minimum 500 words)'),
    references: z.array(z.string()).optional().describe('Optional array of references to include with this content (URLs, citations, sources, etc.)'),
    dialogue: z.array(z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string(),
      agentName: z.string().optional(),
      timestamp: z.string().optional()
    })).optional().describe('Full conversation history for context')
  }),
  execute: async ({ prompt, style, length, references, dialogue }: { 
    prompt: string; 
    style?: string; 
    length?: string;
    references?: string[];
    dialogue?: Array<{
      role: 'user' | 'assistant' | 'system';
      content: string;
      agentName?: string;
      timestamp?: string;
    }>;
  }) => {
    console.log('[WRITETEXT][EXECUTE] Tool called with parameters:', {
      prompt: prompt.substring(0, 100) + '...',
      style,
      length,
      referencesCount: references?.length || 0,
      hasDialogue: !!dialogue,
      dialogueLength: dialogue?.length || 0,
      references: references || []
    });

    // Check for FILES_METADATA in the prompt and extract actual file IDs
    let availableFileIds: string[] = [];
    console.log('[WRITETEXT][PROMPT_ANALYSIS] Analyzing prompt for file metadata:', {
      promptLength: prompt.length,
      hasFilesMetadataString: prompt.includes('__FILES_METADATA__'),
      promptPreview: prompt.substring(0, 500) + '...',
      promptEnd: '...' + prompt.substring(prompt.length - 500)
    });

    const hasFilesMetadata = prompt.includes('__FILES_METADATA__');
    let metadataMatch: RegExpMatchArray | null = null;
    
    if (hasFilesMetadata) {
      try {
        metadataMatch = prompt.match(/__FILES_METADATA__\n(.*?)\n__END_FILES_METADATA__/s);
        console.log('[WRITETEXT][REGEX_MATCH] Metadata extraction attempt:', {
          hasMatch: !!metadataMatch,
          matchLength: metadataMatch?.[1]?.length || 0,
          rawMatch: metadataMatch?.[1]?.substring(0, 200) + '...' || 'No match'
        });

        if (metadataMatch) {
          const filesMetadata = JSON.parse(metadataMatch[1]);
          availableFileIds = filesMetadata.map((f: any) => f.id).filter(Boolean);
          
          console.log('[WRITETEXT][FILES_METADATA] Successfully parsed files metadata:', {
            totalFiles: filesMetadata.length,
            fileIds: availableFileIds,
            fileNames: filesMetadata.map((f: any) => f.name || f.doc_title),
            fileSummaries: filesMetadata.map((f: any) => ({ id: f.id, summary: f.doc_summary?.substring(0, 100) + '...' })),
            fullMetadata: filesMetadata
          });
          
          console.log('[WRITETEXT][AVAILABLE_FILE_IDS] Exact file IDs available for referencing:', availableFileIds);
        } else {
          console.warn('[WRITETEXT][FILES_METADATA] Found __FILES_METADATA__ string but regex failed to match');
        }
      } catch (error) {
        console.warn('[WRITETEXT][FILES_METADATA] Error parsing files metadata:', error);
        console.log('[WRITETEXT][FILES_METADATA] Raw metadata content for debugging:', metadataMatch?.[1]);
      }
    } else {
      console.log('[WRITETEXT][FILES_METADATA] No __FILES_METADATA__ string found in prompt');
    }

    // Log references parameter vs available files
    console.log('[WRITETEXT][REFERENCES_CHECK] Reference parameter analysis:', {
      referencesProvided: references || [],
      referencesCount: references?.length || 0,
      availableFileIds: availableFileIds,
      availableFileIdsCount: availableFileIds.length,
      referencesMatchAvailable: references ? references.filter(ref => availableFileIds.includes(ref)) : [],
      invalidReferences: references ? references.filter(ref => !availableFileIds.includes(ref)) : []
    });

    // Build dialogue context if provided
    let dialogueContext = '';
    let conversationSummary = '';
    
    if (dialogue && dialogue.length > 0) {
      console.log('🔍 Processing dialogue context:', {
        messageCount: dialogue.length,
        messageTypes: dialogue.map(d => d.role),
        firstMessage: dialogue[0]?.content.substring(0, 50) + '...',
        lastMessage: dialogue[dialogue.length - 1]?.content.substring(0, 50) + '...'
      });

      // Create detailed conversation context
      dialogueContext = `

CONVERSATION CONTEXT:
The following is the complete conversation history that led to this writing request. Pay close attention to the user's specific requirements, preferences, and any details mentioned throughout the discussion:

${dialogue.map((msg, index) => {
  const speaker = msg.role === 'user' ? 'User' : 
                 msg.role === 'assistant' ? (msg.agentName || 'Assistant') : 
                 'System';
  const timestamp = msg.timestamp ? ` (${new Date(msg.timestamp).toLocaleString()})` : '';
  return `${index + 1}. ${speaker}${timestamp}: ${msg.content}`;
}).join('\n\n')}

IMPORTANT: Based on this conversation context, ensure your content:
- Addresses the specific requirements and preferences mentioned by the user
- Maintains consistency with the discussion topics and themes
- Incorporates any specific examples, focus areas, or constraints mentioned
- Reflects the tone and style preferences expressed in the conversation
- Builds upon any previous context or background information provided`;

      // Create a summary for the user prompt
      const userMessages = dialogue.filter(d => d.role === 'user');
      const lastUserMessage = userMessages[userMessages.length - 1];
      const specificRequirements = userMessages
        .map(msg => msg.content)
        .join(' ')
        .match(/focus on|include|mention|cover|address|discuss|highlight|emphasize|ensure|make sure|specifically|particularly/gi);

      if (userMessages.length > 1 || specificRequirements) {
        conversationSummary = `

CONVERSATION SUMMARY:
Based on our discussion, the user has specifically requested content that:
${userMessages.map((msg, i) => `- ${msg.content}`).join('\n')}

${specificRequirements ? `Key requirements identified: ${specificRequirements.join(', ')}` : ''}`;
      }
    } else {
      console.log('⚠️ No dialogue context provided to writeText tool');
    }

    // Comprehensive system prompt based on classic writing principles
    const systemPrompt = `You are an expert writer who embodies the principles of the greatest writing guides:

CORE WRITING PRINCIPLES:
- Follow William Zinsser's "On Writing Well": Write with clarity, simplicity, brevity, and humanity. Eliminate clutter and unnecessary words.
- Apply Strunk & White's "Elements of Style": Use active voice, concrete language, and precise word choice. Avoid needless words.
- Embrace Ann Handley's "Everybody Writes": Write with empathy, tell stories, and make complex ideas accessible.
- Use Kenneth Roman & Joel Raphaelson's "Writing That Works": Structure content logically, use clear transitions, and write for your audience.
- Apply Chip & Dan Heath's "Made to Stick": Make ideas memorable through simplicity, unexpectedness, concreteness, credibility, emotions, and stories.

CONTENT REQUIREMENTS:
- Generate AT LEAST 500 words of substantive, valuable content
- Avoid generic boilerplate text, filler content, or repetitive phrases
- Use specific examples, case studies, and concrete details
- Include actionable insights and practical applications
- Write in LONG SECTIONS divided by paragraphs, NOT subchapters
- DO NOT use subchapters, subsections, or multiple headings - write flowing content in extended sections
- Structure with minimal headings and focus on paragraph-based organization
- Write in HTML format with proper semantic markup (mainly <p> tags and minimal headings)
- Use varied sentence structures and engaging prose
- Include relevant statistics, quotes, or research when appropriate
- NEVER INCLUDE REFERENCE section in generated text
${availableFileIds.length > 0 ? `
AVAILABLE FILE IDs FOR REFERENCING: ${availableFileIds.join(', ')}
- INCLUDE FILE IDs INLINE: When referencing information from uploaded files, use these exact file IDs: ${availableFileIds.join(', ')}
- Format: ["${availableFileIds[0] || 'file-id'}"] or ["${availableFileIds[0] || 'file-id-1'}", "${availableFileIds[1] || 'file-id-2'}"] for multiple files
- Place file IDs immediately after statements that reference those specific files
- Example: "According to the uploaded research document ["${availableFileIds[0] || 'file-id'}"], findings show..."
- ONLY use these exact file IDs: ${availableFileIds.join(', ')}` : `
NO UPLOADED FILES AVAILABLE:
- Do NOT include any file IDs in brackets like ["file-xyz"] in your content
- There are no uploaded files to reference`}
- File IDs should be placed naturally within the text flow, not as footnotes or separate citations

FACTUAL POINTS REQUIREMENT:
- When providing factual points or key information, always start by referencing the title of the content being written
- Begin factual statements with context that ties back to the main title or theme
- Example: "In the context of [TITLE TOPIC], the key fact is..." or "Building on [TITLE CONCEPT], research shows..."
- Ensure factual points flow naturally from the established title and main theme

WRITING STYLE:
- Write with authority and expertise while remaining accessible
- Use active voice predominantly
- Employ concrete, specific language over abstract generalizations
- Create smooth transitions between ideas and paragraphs
- Include compelling anecdotes and real-world examples within flowing paragraphs
- Maintain reader engagement throughout long sections
- End sections with clear takeaways or action items
- Focus on paragraph-to-paragraph flow rather than section breaks

STRUCTURE GUIDELINES:
- Always start with h2 as the main heading level (never use h1)
- Use h2 for primary sections and h3 for any subsections if needed
- NO subchapters, subsections, or multiple h3/h4/h5/h6 headings unless absolutely necessary
- Organize content through well-structured paragraphs that flow naturally
- Each paragraph should be substantial and contribute to the overall narrative
- Use paragraph breaks strategically to guide the reader through complex ideas
- Maintain thematic coherence within long sections

${style ? `ADDITIONAL STYLE GUIDANCE: ${style}` : ''}
${length ? `TARGET LENGTH: ${length}` : 'TARGET LENGTH: Minimum 500 words'}

${dialogueContext}

Format the content in clean HTML with minimal headings and focus on well-structured paragraphs (<p> tags) that create long, flowing sections.`;
    
    // Enhanced user prompt that includes conversation context
    const userPrompt = `Write comprehensive, expert-level content about: ${prompt}${conversationSummary}

Please ensure the content is:
- Strictly follow the number of words specified in the length parameter
- Free from boilerplate or filler text
- Written with the expertise and clarity of master writers
- Organized into LONG SECTIONS with flowing paragraphs, NOT subchapters or subsections
- NO subchapters, subsections, or multiple headings - focus on paragraph-based flow
- Use only 1-2 main headings maximum and organize everything else through well-structured paragraphs
- Filled with specific examples and actionable insights woven into flowing paragraphs
- Formatted in clean HTML markup with minimal headings and emphasis on <p> tags for paragraph structure
- GENERATE ONLY THE CONTENT, NO OTHER TEXT and not CSS and not JS not html complex components -- just content formatted with basic HTML paragraph tags and minimal headings
${availableFileIds.length > 0 ? `- INCLUDE FILE IDs INLINE: When referencing information from uploaded files, use these exact file IDs: ${availableFileIds.join(', ')}
- Format: ["${availableFileIds[0]}"] or ["${availableFileIds[0]}", "${availableFileIds[1] || availableFileIds[0]}"] for multiple files
- Place file IDs immediately after statements that reference information from those specific files` : `- DO NOT include any file IDs in brackets - no uploaded files are available for referencing`}
- Tailored to the specific requirements and context from our conversation above
- Use tables to organize data and information

CRITICAL: Write in extended, flowing sections divided by substantial paragraphs. Do NOT break content into subchapters or use multiple heading levels. Focus on creating smooth paragraph-to-paragraph transitions within long thematic sections. Always start with h2 as the main heading level (never use h1).`;

    console.log('[WRITETEXT][OPENAI] Calling OpenAI with enhanced prompts:', {
      systemPromptLength: systemPrompt.length,
      userPromptLength: userPrompt.length,
      hasDialogueContext: !!dialogue && dialogue.length > 0,
      model: 'gpt-4.1',
      temperature: 0.7,
      maxTokens: 20000
    });

    // Use GPT-4 Turbo with higher token limits for comprehensive content
    const result = await generateText({
      model: openai('gpt-4.1'),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      maxTokens: 20000, // Increased to accommodate longer content
    });
    
    // Extract file IDs from generated content
    const generatedFileIds = result.text.match(/\["[^"]*"\]/g) || [];
    const extractedIds = generatedFileIds.map(match => {
      const ids = match.slice(2, -2).split('", "');
      return ids;
    }).flat();

    console.log('[WRITETEXT][RESULT] Tool completed successfully:', {
      contentLength: result.text.length,
      hasDialogueContext: !!dialogue && dialogue.length > 0,
      referencesCount: references?.length || 0,
      contentPreview: result.text.substring(0, 200) + '...',
      hasInlineFileIds: /\["[^"]*"\]/.test(result.text),
      inlineFileIdsFound: generatedFileIds,
      extractedFileIds: extractedIds,
      availableFileIds: availableFileIds,
      usingRealFileIds: extractedIds.every(id => availableFileIds.includes(id)),
      fakeFileIds: extractedIds.filter(id => !availableFileIds.includes(id)),
      validFileIds: extractedIds.filter(id => availableFileIds.includes(id))
    });

    // Check if content is empty or too short
    const contentText = result.text.trim();
    if (!contentText || contentText.length < 50) {
      const errorMessage = `Content generation failed - received ${contentText.length} characters. Expected minimum 500 words of substantive content. The AI may have failed to generate proper content or returned empty/minimal text.`;
      console.error('[WRITETEXT][ERROR]', errorMessage, {
        originalPrompt: prompt.substring(0, 200) + '...',
        resultLength: result.text.length,
        resultText: result.text
      });
      throw new Error(errorMessage);
    }

    // Warning if fake file IDs are detected
    const fakeIds = extractedIds.filter(id => !availableFileIds.includes(id));
    if (fakeIds.length > 0) {
      console.warn('[WRITETEXT][WARNING] Generated content contains FAKE file IDs:', {
        fakeIds: fakeIds,
        availableRealIds: availableFileIds,
        message: 'The AI used example/fake file IDs instead of real ones from uploaded files'
      });
    }

    // Return an object that includes both content and references
    return {
      content: result.text,
      references: references || []
    };
  },
}; 
import { neon } from '@neondatabase/serverless';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { marked } from 'marked';

// Get database connection
const chatDbConnectionString = process.env.CHAT_DATABASE_URL;
if (!chatDbConnectionString) {
  throw new Error('CHAT_DATABASE_URL environment variable is not set!');
}
const sql = neon(chatDbConnectionString);

// Configure marked options
marked.setOptions({
  gfm: true,
  breaks: true,
});

// Types
interface SaveMessageParams {
  chat_session_id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  agent_name?: string;
  user_id?: string;
  metadata?: Record<string, any>;
  tool_action?: string;
}

interface SaveMessageIfUniqueParams extends SaveMessageParams {
  check_hash?: boolean;
}

// In-memory cache for message hashes (no longer used since we always save)
// const savedMessageHashes = new Set<string>();

// Clean user message by removing HTML tags and metadata
export function cleanUserMessage(content: string): string {
  if (!content || typeof content !== 'string') {
    return content;
  }

  const originalContent = content;
  
  // Remove metadata block
  const metaStartIndex = content.indexOf('__FILES_METADATA__');
  if (metaStartIndex !== -1) {
    content = content.substring(0, metaStartIndex).trim();
  }

  // Remove HTML tags
  content = content.replace(/<[^>]*>/g, '');

  // Clean up file references
  content = content.replace(/@\[file-[a-zA-Z0-9-_]+:([^\]]+)\]/g, '$1');
  content = content.replace(/#\[file-[a-zA-Z0-9-_]+:([^\]]+)\]/g, '#$1');

  return content.trim();
}

// Convert Markdown to HTML for assistant messages
export async function convertMarkdownToHtml(markdownContent: string): Promise<string> {
  try {
    // Use marked to convert markdown to HTML
    const htmlContent = await marked(markdownContent);
    return htmlContent;
  } catch (error) {
    console.error('Failed to convert Markdown to HTML:', error);
    return markdownContent; // Return original content if conversion fails
  }
}

// Compute content hash for deduplication
export function computeContentHash(agent_name: string, content: string): string {
  const hash = crypto.createHash('md5');
  hash.update(`${agent_name}:${content}`, 'utf8');
  return hash.digest('hex');
}

// Update chat session's updated_at timestamp
async function updateChatSessionTimestamp(chat_session_id: string) {
  const now = new Date().toISOString();
  try {
    await sql`
      UPDATE chat_sessions
      SET updated_at = ${now}
      WHERE id = ${chat_session_id}
    `;
  } catch (error) {
    console.error('Error updating chat session timestamp:', error);
  }
}

// Basic message save function
export async function saveMessage({
  chat_session_id,
  role,
  content,
  agent_name,
  user_id,
  metadata,
  tool_action
}: SaveMessageParams): Promise<{ success: boolean; message_id?: string; error?: string }> {
  try {
    const message_id = uuidv4();
    const now = new Date().toISOString();

    console.log('🗄️ Inserting message into database:', {
      messageId: message_id,
      chatSessionId: chat_session_id,
      role,
      agentName: agent_name,
      userId: user_id,
      contentLength: content.length,
      hasMetadata: !!metadata,
      toolAction: tool_action,
      timestamp: now
    });

    await sql`
      INSERT INTO messages (
        id, 
        chat_session_id, 
        role, 
        content, 
        agent_name, 
        user_id, 
        metadata, 
        tool_action, 
        created_at
      )
      VALUES (
        ${message_id}, 
        ${chat_session_id}, 
        ${role}, 
        ${content}, 
        ${agent_name || null}, 
        ${user_id || null}, 
        ${metadata ? JSON.stringify(metadata) : null}, 
        ${tool_action || null}, 
        ${now}
      )
    `;

    console.log('✅ Database insertion successful:', {
      messageId: message_id,
      chatSessionId: chat_session_id,
      role
    });

    // Update chat session timestamp
    await updateChatSessionTimestamp(chat_session_id);

    return { success: true, message_id };
  } catch (error) {
    console.error('❌ Database insertion failed:', {
      chatSessionId: chat_session_id,
      role,
      error: error instanceof Error ? error.message : 'Unknown error',
      contentLength: content.length
    });
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// Advanced message save with deduplication
export async function saveMessageIfUnique({
  chat_session_id,
  role,
  content,
  agent_name,
  user_id,
  metadata = {},
  tool_action,
  check_hash = false // Changed default to false - ALWAYS SAVE
}: SaveMessageIfUniqueParams): Promise<{ success: boolean; message_id?: string; error?: string }> {
  try {
    console.log('🔍 Processing message for save (no duplicate check):', {
      chatSessionId: chat_session_id,
      role,
      agentName: agent_name,
      userId: user_id,
      originalContentLength: content.length,
      hasMetadata: Object.keys(metadata).length > 0
    });

    let processedContent = content;
    
    // Process content based on role
    if (role === 'user') {
      processedContent = cleanUserMessage(content);
      console.log('🧹 User message content cleaned:', {
        originalLength: content.length,
        cleanedLength: processedContent.length,
        wasModified: content !== processedContent
      });
    } else if (role === 'assistant' || role === 'system' || role === 'tool') {
      // Convert markdown to HTML for non-user messages
      processedContent = await convertMarkdownToHtml(content);
      console.log('📝 Content converted from markdown to HTML:', {
        originalLength: content.length,
        htmlLength: processedContent.length,
        role
      });
    }

    // Check if processed content is empty
    if (!processedContent || processedContent.trim() === '') {
      console.warn('⚠️ Processed content is empty, skipping save:', {
        role,
        originalLength: content.length,
        chatSessionId: chat_session_id
      });
      return { success: false, error: 'Empty content after processing' };
    }

    // Compute content hash for metadata only (not for deduplication)
    const contentHash = computeContentHash(agent_name || role, processedContent);
    
    console.log('🔐 Content hash computed (for metadata only):', {
      hash: contentHash,
      agentName: agent_name || role,
      contentLength: processedContent.length
    });
    
    console.log('✨ Always saving message (duplicate check disabled):', {
      hash: contentHash,
      chatSessionId: chat_session_id,
      role
    });

    // Add content hash to metadata for reference only
    const enhancedMetadata = {
      ...metadata,
      content_hash: contentHash
    };

    // Save the message (always save, no duplicate checking)
    const result = await saveMessage({
      chat_session_id,
      role,
      content: processedContent,
      agent_name,
      user_id,
      metadata: enhancedMetadata,
      tool_action
    });

    if (result.success && result.message_id) {
      console.log('💾 Message saved successfully:', {
        messageId: result.message_id,
        hash: contentHash,
        chatSessionId: chat_session_id,
        role
      });
    }

    return result;
  } catch (error) {
    console.error('❌ Error in saveMessageIfUnique:', {
      chatSessionId: chat_session_id,
      role,
      error: error instanceof Error ? error.message : 'Unknown error',
      contentLength: content.length
    });
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// Save streaming response with accumulation
export async function saveStreamingResponse({
  chat_session_id,
  content,
  agent_name,
  user_id,
  metadata = {},
  is_final = false
}: {
  chat_session_id: string;
  content: string;
  agent_name: string;
  user_id?: string;
  metadata?: Record<string, any>;
  is_final?: boolean;
}): Promise<{ success: boolean; message_id?: string; error?: string }> {
  // Only save if it's the final response
  if (!is_final) {
    return { success: true, message_id: 'streaming' };
  }

  console.log('💬 Saving final streaming response (always save):', {
    chatSessionId: chat_session_id,
    agentName: agent_name,
    userId: user_id,
    contentLength: content.length,
    isFinal: is_final
  });

  return saveMessageIfUnique({
    chat_session_id,
    role: 'assistant',
    content,
    agent_name,
    user_id,
    metadata: {
      ...metadata,
      event_type: 'final_response',
      is_final: true
    },
    check_hash: false // Always save final responses - no duplicate checking
  });
}

// Save system message (e.g., agent transitions)
export async function saveSystemMessage({
  chat_session_id,
  content,
  agent_name,
  user_id,
  metadata = {}
}: {
  chat_session_id: string;
  content: string;
  agent_name?: string;
  user_id?: string;
  metadata?: Record<string, any>;
}): Promise<{ success: boolean; message_id?: string; error?: string }> {
  return saveMessage({
    chat_session_id,
    role: 'system',
    content,
    agent_name,
    user_id,
    metadata: {
      ...metadata,
      event_type: metadata.event_type || 'system_message'
    }
  });
}

// Save tool message (e.g., file citations)
export async function saveToolMessage({
  chat_session_id,
  content,
  agent_name,
  user_id,
  tool_action,
  metadata = {}
}: {
  chat_session_id: string;
  content: string;
  agent_name?: string;
  user_id?: string;
  tool_action: string;
  metadata?: Record<string, any>;
}): Promise<{ success: boolean; message_id?: string; error?: string }> {
  return saveMessage({
    chat_session_id,
    role: 'tool',
    content,
    agent_name,
    user_id,
    tool_action,
    metadata: {
      ...metadata,
      tool_action
    }
  });
}

// Get messages for a chat session
export async function getMessagesForSession(chat_session_id: string) {
  try {
    const messages = await sql`
      SELECT * FROM messages 
      WHERE chat_session_id = ${chat_session_id}
      ORDER BY created_at ASC
    `;
    return messages;
  } catch (error) {
    console.error('Error fetching messages:', error);
    return [];
  }
}

// Clear in-memory hash cache (useful for testing or memory management)
export function clearMessageHashCache() {
  // savedMessageHashes.clear();
} 
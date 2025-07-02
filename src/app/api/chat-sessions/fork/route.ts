import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { originalSessionId, userId } = body;
    
    if (!originalSessionId || !userId) {
      return NextResponse.json({ 
        error: 'Missing originalSessionId or userId' 
      }, { status: 400 });
    }
    
    console.log(`Forking chat session ${originalSessionId} for user ${userId}`);
    
    // Get database connection
    const chatDbConnectionString = process.env.CHAT_DATABASE_URL;
    if (!chatDbConnectionString) {
      throw new Error('CHAT_DATABASE_URL not set');
    }
    
    const sql = neon(chatDbConnectionString);
    
    // First, get the original chat session
    const originalSessions = await sql`
      SELECT * FROM chat_sessions 
      WHERE id = ${originalSessionId}
      LIMIT 1
    `;
    
    if (!originalSessions || originalSessions.length === 0) {
      return NextResponse.json({ 
        error: 'Original chat session not found' 
      }, { status: 404 });
    }
    
    const originalSession = originalSessions[0];
    
    // Check if the user is trying to access their own chat
    if (originalSession.user_id === userId) {
      return NextResponse.json({ 
        error: 'Cannot fork your own chat',
        shouldRedirect: false
      }, { status: 400 });
    }
    
    // Check if it's a private chat (only fork private chats)
    if (originalSession.visibility === 'public') {
      return NextResponse.json({ 
        error: 'Public chats should be accessed directly',
        shouldRedirect: false
      }, { status: 400 });
    }
    
    // Create new session ID and timestamp
    const newSessionId = uuidv4();
    const now = new Date().toISOString();
    
    // Create the forked chat session (always private)
    await sql`
      INSERT INTO chat_sessions (
        id, title, user_id, created_at, updated_at, 
        visibility, is_public, scenario_id, scenario_progress,
        scenario_started_at, scenario_completed_at
      )
      VALUES (
        ${newSessionId}, 
        ${originalSession.title + ' (Copy)'}, 
        ${userId}, 
        ${now}, 
        ${now},
        ${'private'},
        ${false},
        ${originalSession.scenario_id || null},
        ${originalSession.scenario_progress ? JSON.stringify(originalSession.scenario_progress) : null},
        ${originalSession.scenario_started_at || null},
        ${originalSession.scenario_completed_at || null}
      )
    `;
    
    // Get all messages from the original chat
    const originalMessages = await sql`
      SELECT * FROM messages 
      WHERE chat_session_id = ${originalSessionId}
      ORDER BY created_at ASC
    `;
    
    // Copy all messages to the new chat session
    if (originalMessages && originalMessages.length > 0) {
      for (const message of originalMessages) {
        const newMessageId = uuidv4();
        await sql`
          INSERT INTO messages (
            id, chat_session_id, role, content, agent_name, 
            user_id, metadata, tool_action, created_at
          )
          VALUES (
            ${newMessageId},
            ${newSessionId},
            ${message.role},
            ${message.content},
            ${message.agent_name || null},
            ${userId}, -- Set the new user as the owner of all messages
            ${message.metadata ? JSON.stringify(message.metadata) : null},
            ${message.tool_action || null},
            ${message.created_at} -- Keep original timestamps for context
          )
        `;
      }
    }
    
    // Create vector store for the new chat
    const vectorStoreId = 'vs_' + uuidv4();
    await sql`
      INSERT INTO vector_stores (id, name, owner_id, created_at, store_type)
      VALUES (${vectorStoreId}, ${'Chat ' + newSessionId}, ${userId}, ${now}, ${'chat'})
    `;
    
    // Update the new chat session with vector store ID
    await sql`
      UPDATE chat_sessions
      SET vector_store_id = ${vectorStoreId}, updated_at = ${now}
      WHERE id = ${newSessionId}
    `;
    
    console.log(`Successfully forked chat ${originalSessionId} to ${newSessionId} for user ${userId}`);
    
    return NextResponse.json({
      success: true,
      newSessionId,
      originalTitle: originalSession.title,
      newTitle: originalSession.title + ' (Copy)',
      messageCount: originalMessages?.length || 0,
      shouldRedirect: true
    });
    
  } catch (error) {
    console.error('Error forking chat session:', error);
    return NextResponse.json({ 
      error: 'Failed to fork chat session',
      details: String(error)
    }, { status: 500 });
  }
} 
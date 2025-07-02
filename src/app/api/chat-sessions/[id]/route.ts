import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    // Properly await the params object in Next.js 14+
    const { id } = await context.params;
    
    if (!id) {
      console.error("Missing session ID in params");
      return NextResponse.json({ error: 'Missing session id' }, { status: 400 });
    }
    
    const sessionId = id;
    console.log(`Fetching session: ${sessionId}`);
    
    // Get database connection
    const chatDbConnectionString = process.env.CHAT_DATABASE_URL;
    if (!chatDbConnectionString) {
      console.error("CHAT_DATABASE_URL not set");
      throw new Error('CHAT_DATABASE_URL not set');
    }
    
    // Create database client
    const sql = neon(chatDbConnectionString);
    
    // Query the session
    try {
      const sessions = await sql`
        SELECT * FROM chat_sessions 
        WHERE id = ${sessionId}
        LIMIT 1
      `;
      
      if (!sessions || sessions.length === 0) {
        console.error(`Session not found: ${sessionId}`);
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }
      
      const session = sessions[0];
      console.log(`Found session: ${session.id} - ${session.title}`);
      
      // Also fetch messages for this session
      const messages = await sql`
        SELECT * FROM messages 
        WHERE chat_session_id = ${sessionId}
        ORDER BY created_at ASC
      `;
      
      // Return session with messages
      return NextResponse.json({ 
        chat_session: {
          ...session,
          messages: messages || []
        }
      });
    } catch (queryErr) {
      console.error(`Database query error for session ${sessionId}:`, queryErr);
      return NextResponse.json({ 
        error: 'Database query error', 
        details: String(queryErr) 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in GET /api/chat-sessions/[id]:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: String(error) 
    }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    // Properly await the params object in Next.js 14+
    const { id } = await context.params;
    
    if (!id) {
      console.error("Missing session ID in params");
      return NextResponse.json({ error: 'Missing session id' }, { status: 400 });
    }
    
    const sessionId = id;
    console.log(`Updating session: ${sessionId}`);
    
    // Parse request body
    const body = await request.json();
    const { title, vector_store_id, visibility, public_url, tool_call_types } = body;
    
    // Get database connection
    const chatDbConnectionString = process.env.CHAT_DATABASE_URL;
    if (!chatDbConnectionString) {
      console.error("CHAT_DATABASE_URL not set");
      throw new Error('CHAT_DATABASE_URL not set');
    }
    
    // Create database client
    const sql = neon(chatDbConnectionString);
    
    // Check if we have fields to update
    if (title === undefined && vector_store_id === undefined && visibility === undefined && public_url === undefined && tool_call_types === undefined) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }
    
    // Execute the update query using Neon's template literal syntax
    try {
      console.log('Update fields:', { title, vector_store_id, visibility, public_url });
      
      // Use a simple approach with conditional updates
      let result;
      
      // Handle visibility update (most common case for our new feature)
      if (visibility !== undefined && public_url !== undefined && tool_call_types !== undefined) {
        result = await sql`
          UPDATE chat_sessions 
          SET visibility = ${visibility}, public_url = ${public_url}, tool_call_types = ${tool_call_types}, updated_at = NOW()
          WHERE id = ${sessionId}
          RETURNING *
        `;
      } else if (visibility !== undefined && public_url !== undefined) {
        result = await sql`
          UPDATE chat_sessions 
          SET visibility = ${visibility}, public_url = ${public_url}, updated_at = NOW()
          WHERE id = ${sessionId}
          RETURNING *
        `;
      } else if (visibility !== undefined) {
        result = await sql`
          UPDATE chat_sessions 
          SET visibility = ${visibility}, updated_at = NOW()
          WHERE id = ${sessionId}
          RETURNING *
        `;
      } else if (title !== undefined && vector_store_id !== undefined) {
        result = await sql`
          UPDATE chat_sessions 
          SET title = ${title}, vector_store_id = ${vector_store_id}, updated_at = NOW()
          WHERE id = ${sessionId}
          RETURNING *
        `;
      } else if (title !== undefined) {
        result = await sql`
          UPDATE chat_sessions 
          SET title = ${title}, updated_at = NOW()
          WHERE id = ${sessionId}
          RETURNING *
        `;
      } else if (vector_store_id !== undefined) {
        result = await sql`
          UPDATE chat_sessions 
          SET vector_store_id = ${vector_store_id}, updated_at = NOW()
          WHERE id = ${sessionId}
          RETURNING *
        `;
      } else if (public_url !== undefined) {
        result = await sql`
          UPDATE chat_sessions 
          SET public_url = ${public_url}, updated_at = NOW()
          WHERE id = ${sessionId}
          RETURNING *
        `;
      }
      
      if (!result || result.length === 0) {
        console.error(`Session not found for update: ${sessionId}`);
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }
      
      const updatedSession = result[0];
      console.log(`Updated session: ${updatedSession.id} - ${updatedSession.title}`);
      
      return NextResponse.json({ 
        success: true,
        chat_session: updatedSession
      });
    } catch (queryErr) {
      console.error(`Database query error for session update ${sessionId}:`, queryErr);
      return NextResponse.json({ 
        error: 'Database query error', 
        details: String(queryErr) 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in PUT /api/chat-sessions/[id]:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: String(error) 
    }, { status: 500 });
  }
} 
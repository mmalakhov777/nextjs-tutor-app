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
    console.log(`Fetching messages for session: ${sessionId}`);
    
    // Get database connection
    const chatDbConnectionString = process.env.CHAT_DATABASE_URL;
    if (!chatDbConnectionString) {
      console.error("CHAT_DATABASE_URL not set");
      throw new Error('CHAT_DATABASE_URL not set');
    }
    
    // Create database client
    const sql = neon(chatDbConnectionString);
    
    // Check if the session exists
    const sessionCheck = await sql`SELECT id FROM chat_sessions WHERE id = ${sessionId} LIMIT 1`;
    
    if (!sessionCheck || sessionCheck.length === 0) {
      console.error(`Session not found: ${sessionId}`);
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    
    // Debug: log the session ID
    console.log(`Session exists, ID: ${sessionId}`);
    
    // Query messages with the correct column name: chat_session_id
    try {
      const messages = await sql`
        SELECT * FROM messages 
        WHERE chat_session_id = ${sessionId}
        ORDER BY created_at ASC
      `;
      
      console.log(`Found ${messages?.length || 0} messages for session ${sessionId}`);
      
      return NextResponse.json({ messages });
    } catch (queryErr) {
      console.error(`Database query error for session ${sessionId}:`, queryErr);
      return NextResponse.json({ 
        error: 'Database query error', 
        details: String(queryErr) 
      }, { status: 500 });
    }
  } catch (e) {
    console.error("API error:", e);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: String(e)
    }, { status: 500 });
  }
} 
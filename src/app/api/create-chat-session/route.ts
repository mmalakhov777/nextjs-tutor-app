import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  const { userId } = await request.json();
  const debug: any = {};
  
  try {
    const chatDbConnectionString = process.env.CHAT_DATABASE_URL;
    if (!chatDbConnectionString) {
      throw new Error('CHAT_DATABASE_URL not set');
    }
    
    const sql = neon(chatDbConnectionString);

    // Debug: list tables
    debug.tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;

    // Create chat session
    const sessionId = uuidv4();
    const now = new Date().toISOString();
    
    await sql`
      INSERT INTO chat_sessions (id, title, user_id, created_at, updated_at, visibility, is_public)
      VALUES (${sessionId}, ${'New Chat'}, ${userId}, ${now}, ${now}, ${'private'}, ${false})
    `;

    // Create vector store (add store_type)
    const vectorStoreId = 'vs_' + uuidv4();
    
    await sql`
      INSERT INTO vector_stores (id, name, owner_id, created_at, store_type)
      VALUES (${vectorStoreId}, ${'Chat ' + sessionId}, ${userId}, ${now}, ${'chat'})
    `;

    // Update chat session with vector store ID
    await sql`
      UPDATE chat_sessions
      SET vector_store_id = ${vectorStoreId}, updated_at = ${now}
      WHERE id = ${sessionId}
    `;

    return NextResponse.json({
      session: { id: sessionId, title: 'New Chat', user_id: userId, created_at: now, updated_at: now, vector_store_id: vectorStoreId, visibility: 'private', is_public: false },
      vectorStore: { id: vectorStoreId, name: 'Chat ' + sessionId, owner_id: userId, created_at: now, store_type: 'chat' },
      debug
    });
  } catch (e) {
    debug.error = String(e);
    return NextResponse.json({ error: String(e), debug }, { status: 500 });
  }
} 
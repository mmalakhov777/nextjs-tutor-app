import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('user_id');
  const sessionId = searchParams.get('session_id');
  if (!userId || !sessionId) {
    return NextResponse.json({ error: 'Missing user_id or session_id' }, { status: 400 });
  }
  try {
    const chatDbConnectionString = process.env.CHAT_DATABASE_URL;
    if (!chatDbConnectionString) {
      throw new Error('CHAT_DATABASE_URL not set');
    }
    const sql = neon(chatDbConnectionString);
    const notes = await sql`
      SELECT * FROM notes WHERE user_id = ${userId} AND session_id = ${sessionId}
    `;
    return NextResponse.json({ notes });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user_id, session_id, content } = await request.json();
    console.log('Notes POST request:', { user_id, session_id, content: content?.substring(0, 50) + '...' });
    
    if (!user_id || !session_id || typeof content !== 'string') {
      return NextResponse.json({ error: 'Missing user_id, session_id, or content' }, { status: 400 });
    }
    
    const chatDbConnectionString = process.env.CHAT_DATABASE_URL;
    if (!chatDbConnectionString) {
      throw new Error('CHAT_DATABASE_URL not set');
    }
    
    const sql = neon(chatDbConnectionString);
    console.log('Notes table structure check...');
    
    // Check if table has id column as serial/autoincrement
    const tableInfo = await sql`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'notes'
    `;
    
    console.log('Notes table columns:', tableInfo);
    
    // Check if a note already exists for this user/session
    const existingNote = await sql`
      SELECT id FROM notes WHERE user_id = ${user_id} AND session_id = ${session_id}
    `;
    
    if (existingNote && existingNote.length > 0) {
      console.log('Updating existing note with ID:', existingNote[0].id);
      
      // Update existing note
      await sql`
        UPDATE notes 
        SET content = ${content}, updated_at = NOW() 
        WHERE user_id = ${user_id} AND session_id = ${session_id}
      `;
      
      const updated = await sql`
        SELECT * FROM notes WHERE user_id = ${user_id} AND session_id = ${session_id}
      `;
      
      return NextResponse.json({ note: updated[0] });
    } else {
      console.log('Creating new note');
      
      // Check if id is auto-incrementing
      const hasAutoIncrementId = tableInfo.some(col => 
        col.column_name === 'id' && 
        (col.column_default?.includes('nextval') || col.data_type === 'serial')
      );
      
      console.log('Has auto-increment ID:', hasAutoIncrementId);
      
      // Insert new note with or without explicit ID
      let result;
      
      if (hasAutoIncrementId) {
        result = await sql`
          INSERT INTO notes (user_id, session_id, content, created_at, updated_at)
          VALUES (${user_id}, ${session_id}, ${content}, NOW(), NOW())
          RETURNING *
        `;
      } else {
        // Generate a random integer ID
        const randomId = Math.floor(Math.random() * 1000000) + 1;
        
        result = await sql`
          INSERT INTO notes (id, user_id, session_id, content, created_at, updated_at)
          VALUES (${randomId}, ${user_id}, ${session_id}, ${content}, NOW(), NOW())
          RETURNING *
        `;
      }
      
      console.log('Note created:', result[0]?.id);
      return NextResponse.json({ note: result[0] });
    }
  } catch (e) {
    console.error('Error saving note:', e);
    return NextResponse.json({ 
      error: 'Failed to save note', 
      details: String(e) 
    }, { status: 500 });
  }
} 
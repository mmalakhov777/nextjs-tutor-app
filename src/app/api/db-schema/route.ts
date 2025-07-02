import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export async function GET(request: NextRequest) {
  try {
    const chatDbConnectionString = process.env.CHAT_DATABASE_URL;
    if (!chatDbConnectionString) {
      throw new Error('CHAT_DATABASE_URL not set');
    }
    
    const sql = neon(chatDbConnectionString);
    
    // List all tables
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    
    // Get columns for each table
    const tableSchemas: Record<string, any> = {};
    
    for (const table of tables) {
      const tableName = table.table_name;
      const columns = await sql`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = ${tableName}
        ORDER BY ordinal_position
      `;
      
      tableSchemas[tableName] = columns;
    }
    
    // Try to check first few rows of the messages table
    let messagesExample = [];
    try {
      messagesExample = await sql`
        SELECT * FROM messages LIMIT 2
      `;
    } catch (err) {
      messagesExample = ['Error fetching messages sample: ' + String(err)];
    }
    
    return NextResponse.json({
      tables: tables.map(t => t.table_name),
      schemas: tableSchemas,
      messagesExample
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
} 
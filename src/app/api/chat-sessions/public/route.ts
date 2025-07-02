import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '6');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    const chatDbConnectionString = process.env.CHAT_DATABASE_URL;
    if (!chatDbConnectionString) {
      throw new Error('CHAT_DATABASE_URL not set');
    }
    
    const sql = neon(chatDbConnectionString);
    
    // Fetch public chat sessions with basic info
    const publicSessions = await sql`
      SELECT 
        cs.id,
        cs.title,
        cs.created_at,
        cs.updated_at,
        cs.user_id,
        cs.public_url,
        cs.made_public_at,
        cs.tool_call_types,
        -- Get first few words of the first user message as preview
        (
          SELECT SUBSTRING(content FROM 1 FOR 150) 
          FROM messages 
          WHERE chat_session_id = cs.id 
            AND role = 'user' 
            AND content NOT LIKE '%<FILE_QUICK_ACTION>%'
          ORDER BY created_at ASC 
          LIMIT 1
        ) as preview,
        -- Count total messages
        (
          SELECT COUNT(*) 
          FROM messages 
          WHERE chat_session_id = cs.id
        ) as message_count
      FROM chat_sessions cs
      WHERE cs.visibility = 'public' 
        AND cs.is_public = true
      ORDER BY cs.made_public_at DESC, cs.updated_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;
    
    // Get total count for pagination
    const totalCountResult = await sql`
      SELECT COUNT(*) as total
      FROM chat_sessions 
      WHERE visibility = 'public' AND is_public = true
    `;
    
    const totalCount = parseInt(totalCountResult[0]?.total || '0');
    
    return NextResponse.json({
      success: true,
      sessions: publicSessions,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      }
    });
  } catch (error) {
    console.error('Error fetching public sessions:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch public sessions',
        sessions: [],
        pagination: { total: 0, limit: 6, offset: 0, hasMore: false }
      },
      { status: 500 }
    );
  }
} 
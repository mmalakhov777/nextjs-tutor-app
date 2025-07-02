import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('user_id');

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  try {
    const chatDbConnectionString = process.env.CHAT_DATABASE_URL;
    if (!chatDbConnectionString) {
      throw new Error('CHAT_DATABASE_URL not set');
    }
    
    const sql = neon(chatDbConnectionString);
    
    // Get today's date (start of day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    // Count user messages from today across all sessions with a single query
    const result = await sql`
      SELECT COUNT(*) as count 
      FROM messages 
      WHERE user_id = ${userId} 
        AND role = 'user' 
        AND created_at >= ${todayISO}
    `;

    const count = parseInt(result[0]?.count || '0', 10);
    console.log(`[MSD] Today's message count for user ${userId}: ${count}`);

    return NextResponse.json({ 
      count: count,
      date: todayISO
    });
  } catch (error: any) {
    console.error('Error in today-message-count API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 
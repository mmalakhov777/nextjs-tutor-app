import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('user_id');
  if (!userId) {
    return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });
  }
  try {
    const chatDbConnectionString = process.env.CHAT_DATABASE_URL;
    if (!chatDbConnectionString) {
      throw new Error('CHAT_DATABASE_URL not set');
    }
    const sql = neon(chatDbConnectionString);
    const agents = await sql`
      SELECT * FROM custom_agents WHERE user_id = ${userId}
    `;
    return NextResponse.json(agents);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
} 
import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export async function PUT(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    // Properly await the params object in Next.js 14+
    const { id } = await context.params;
    
    if (!id) {
      console.error("Missing agent ID in params");
      return NextResponse.json({ error: 'Missing agent id' }, { status: 400 });
    }
    
    const agentId = id;
    console.log(`Updating agent: ${agentId}`);
    
    // Get request body
    const body = await request.json().catch(err => {
      console.error("Error parsing request body:", err);
      throw new Error('Invalid request body');
    });
    
    const { name, instructions } = body;
    
    if (!name || !instructions) {
      console.error("Missing required fields in request body");
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Get database connection
    const chatDbConnectionString = process.env.CHAT_DATABASE_URL;
    if (!chatDbConnectionString) {
      console.error("CHAT_DATABASE_URL not set");
      throw new Error('CHAT_DATABASE_URL not set');
    }
    
    // Create database client
    const sql = neon(chatDbConnectionString);
    
    // Check if the agent exists
    const agentCheck = await sql`SELECT id FROM custom_agents WHERE id = ${agentId} LIMIT 1`;
    
    if (!agentCheck || agentCheck.length === 0) {
      console.error(`Agent not found: ${agentId}`);
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }
    
    // Update the agent
    try {
      await sql`
        UPDATE custom_agents 
        SET name = ${name}, instructions = ${instructions}, updated_at = NOW() 
        WHERE id = ${agentId}
      `;
      
      // Fetch the updated agent
      const updated = await sql`SELECT * FROM custom_agents WHERE id = ${agentId}`;
      
      if (!updated || updated.length === 0) {
        throw new Error('Failed to retrieve updated agent');
      }
      
      console.log(`Agent ${agentId} updated successfully`);
      return NextResponse.json({ agent: updated[0] });
    } catch (queryErr) {
      console.error(`Database query error for agent ${agentId}:`, queryErr);
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
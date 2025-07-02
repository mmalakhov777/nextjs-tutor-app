import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { ScenarioProgress } from '@/types/chat';

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { id } = await context.params;
    
    if (!id) {
      return NextResponse.json({ error: 'Missing session id' }, { status: 400 });
    }
    
    const chatDbConnectionString = process.env.CHAT_DATABASE_URL;
    if (!chatDbConnectionString) {
      throw new Error('CHAT_DATABASE_URL not set');
    }
    
    const sql = neon(chatDbConnectionString);
    
    // Get scenario progress for the session
    const result = await sql`
      SELECT scenario_id, scenario_progress, scenario_started_at, scenario_completed_at
      FROM chat_sessions 
      WHERE id = ${id}
    `;
    
    if (!result || result.length === 0) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    
    const session = result[0];
    
    return NextResponse.json({
      scenario_id: session.scenario_id,
      scenario_progress: session.scenario_progress,
      scenario_started_at: session.scenario_started_at,
      scenario_completed_at: session.scenario_completed_at
    });
  } catch (error) {
    console.error('Error fetching scenario progress:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scenario progress' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { id } = await context.params;
    
    if (!id) {
      return NextResponse.json({ error: 'Missing session id' }, { status: 400 });
    }
    
    const body = await request.json();
    const { scenario_progress, scenario_id, completed } = body;
    
    if (!scenario_progress) {
      return NextResponse.json({ error: 'Missing scenario_progress' }, { status: 400 });
    }
    
    const chatDbConnectionString = process.env.CHAT_DATABASE_URL;
    if (!chatDbConnectionString) {
      throw new Error('CHAT_DATABASE_URL not set');
    }
    
    const sql = neon(chatDbConnectionString);
    const now = new Date().toISOString();
    
    // Update scenario progress with timestamp
    const updatedProgress = {
      ...scenario_progress,
      lastUpdatedAt: now
    };
    
    // Check if this is the first time setting scenario progress
    const currentSession = await sql`
      SELECT scenario_started_at, scenario_id
      FROM chat_sessions 
      WHERE id = ${id}
    `;
    
    if (!currentSession || currentSession.length === 0) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    
    const isFirstTime = !currentSession[0].scenario_started_at || currentSession[0].scenario_id !== scenario_id;
    
    // Update the session with scenario progress
    if (completed) {
      // Mark scenario as completed
      await sql`
        UPDATE chat_sessions
        SET 
          scenario_progress = ${JSON.stringify(updatedProgress)},
          scenario_id = ${scenario_id},
          scenario_started_at = COALESCE(scenario_started_at, ${now}),
          scenario_completed_at = ${now},
          updated_at = ${now}
        WHERE id = ${id}
      `;
    } else {
      // Update progress without marking as completed
      await sql`
        UPDATE chat_sessions
        SET 
          scenario_progress = ${JSON.stringify(updatedProgress)},
          scenario_id = ${scenario_id},
          scenario_started_at = COALESCE(scenario_started_at, ${now}),
          updated_at = ${now}
        WHERE id = ${id}
      `;
    }
    
    return NextResponse.json({
      success: true,
      message: completed ? 'Scenario completed' : 'Scenario progress updated',
      scenario_progress: updatedProgress
    });
  } catch (error) {
    console.error('Error updating scenario progress:', error);
    return NextResponse.json(
      { error: 'Failed to update scenario progress' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { id } = await context.params;
    
    if (!id) {
      return NextResponse.json({ error: 'Missing session id' }, { status: 400 });
    }
    
    const chatDbConnectionString = process.env.CHAT_DATABASE_URL;
    if (!chatDbConnectionString) {
      throw new Error('CHAT_DATABASE_URL not set');
    }
    
    const sql = neon(chatDbConnectionString);
    const now = new Date().toISOString();
    
    // Clear scenario progress
    await sql`
      UPDATE chat_sessions
      SET 
        scenario_progress = NULL,
        scenario_id = NULL,
        scenario_started_at = NULL,
        scenario_completed_at = NULL,
        updated_at = ${now}
      WHERE id = ${id}
    `;
    
    return NextResponse.json({
      success: true,
      message: 'Scenario progress cleared'
    });
  } catch (error) {
    console.error('Error clearing scenario progress:', error);
    return NextResponse.json(
      { error: 'Failed to clear scenario progress' },
      { status: 500 }
    );
  }
} 
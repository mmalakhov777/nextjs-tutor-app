import { NextRequest, NextResponse } from 'next/server';

// The URL of the Flask backend from environment variables
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5002';

export async function POST(request: NextRequest) {
  console.log('POST /api/agents/toggle - Request received');
  
  try {
    const body = await request.json();
    
    // Ensure we're only toggling agents, not tools
    if (body.type !== 'agent') {
      return NextResponse.json(
        { error: 'Only agent toggling is supported' },
        { status: 400 }
      );
    }
    
    const response = await fetch(`${BACKEND_URL}/api/agents/toggle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('Error response from backend:', errorData);
      return NextResponse.json(
        { error: errorData.error || `Failed to toggle agent: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      }
    });
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      { error: `Failed to toggle agent: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
} 
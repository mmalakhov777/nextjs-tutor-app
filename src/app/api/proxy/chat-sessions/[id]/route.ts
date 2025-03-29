import { NextRequest, NextResponse } from 'next/server';

// The URL of the Flask backend from environment variables
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5002';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const id = params.id;
  console.log(`GET /api/chat-sessions/${id} - Request received`);
  
  try {
    // Make the request to the backend
    const response = await fetch(`${BACKEND_URL}/api/chat-sessions/${id}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch chat session: ${response.status}`);
    }
    
    // Parse and return the response
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      { error: `Failed to fetch chat session: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
} 
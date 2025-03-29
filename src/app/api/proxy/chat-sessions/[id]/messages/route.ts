import { NextRequest, NextResponse } from 'next/server';

// The URL of the Flask backend from environment variables
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5002';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const id = params.id;
  console.log(`GET /api/chat-sessions/${id}/messages - Request received`);
  
  try {
    // Make the request to the backend
    const response = await fetch(`${BACKEND_URL}/api/chat-sessions/${id}/messages`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch chat session messages: ${response.status}`);
    }
    
    // Parse and return the response
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      { error: `Failed to fetch chat session messages: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
} 
import { NextRequest, NextResponse } from 'next/server';

// The URL of the Flask backend from environment variables
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5002';

export async function GET(request: NextRequest) {
  console.log('GET /api/chat-sessions - Request received');
  
  try {
    // Get the query parameters
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    
    // Build the URL with proper parameters
    let url = `${BACKEND_URL}/api/chat-sessions`;
    if (userId) {
      url += `?user_id=${encodeURIComponent(userId)}`;
    }
    
    // Make the request to the backend
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch chat sessions: ${response.status}`);
    }
    
    // Parse and return the response
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      { error: `Failed to fetch chat sessions: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  console.log('POST /api/chat-sessions - Request received');
  
  try {
    // Parse the request body
    const body = await request.json();
    
    // Make the request to the backend
    const response = await fetch(`${BACKEND_URL}/api/chat-sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create chat session: ${response.status}`);
    }
    
    // Parse and return the response
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      { error: `Failed to create chat session: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
} 
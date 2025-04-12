import { NextRequest, NextResponse } from 'next/server';

// The URL of the Flask backend from environment variables
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5002';

export async function GET(request: NextRequest) {
  console.log('GET /api/notes - Request received');
  
  try {
    // Get the query parameters
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');
    const userId = searchParams.get('user_id');
    
    if (!sessionId || !userId) {
      return NextResponse.json(
        { error: 'Missing required parameters: session_id and user_id are required' },
        { status: 400 }
      );
    }
    
    // Build the URL with proper parameters
    const url = `${BACKEND_URL}/api/notes?session_id=${encodeURIComponent(sessionId)}&user_id=${encodeURIComponent(userId)}`;
    
    // Make the request to the backend
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });
    
    if (!response.ok) {
      // If the notes don't exist yet, return an empty object instead of an error
      if (response.status === 404) {
        return NextResponse.json({ content: '' });
      }
      throw new Error(`Failed to fetch notes: ${response.status}`);
    }
    
    // Parse and return the response
    const data = await response.json();
    console.log('Notes fetched successfully:', data);
    
    // Return the response as-is to maintain the format from the backend
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      { error: `Failed to fetch notes: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  console.log('POST /api/notes - Request received');
  
  try {
    // Parse the request body
    const body = await request.json();
    
    // Validate the required fields
    if (!body.session_id || !body.user_id || body.content === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: session_id, user_id, and content are required' },
        { status: 400 }
      );
    }
    
    // Forward the request to the Flask backend
    const response = await fetch(`${BACKEND_URL}/api/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error response from backend: ${errorText}`);
      throw new Error(`Error: ${response.status} - ${errorText}`);
    }
    
    // Parse and return the response
    const data = await response.json();
    console.log('Note saved successfully');
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error saving note:', error);
    return NextResponse.json(
      { error: `Failed to save note: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
} 
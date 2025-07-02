import { NextRequest, NextResponse } from 'next/server';

// The URL of the Flask backend from environment variables
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5002';

export async function POST(request: NextRequest) {
  console.log('POST /api/files - Request received');
  
  try {
    const formData = await request.formData();
    
    // Make the request to the backend
    const response = await fetch(`${BACKEND_URL}/api/files`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`Failed to upload file: ${response.status}`);
    }
    
    // Parse and return the response
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      { error: `Failed to upload file: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  console.log('GET /api/files - Request received');
  
  try {
    // Get the query parameters
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const conversationId = searchParams.get('conversation_id');
    
    // Build the URL with proper parameters
    let url = `${BACKEND_URL}/api/files`;
    const params = new URLSearchParams();
    if (userId) params.append('user_id', userId);
    if (conversationId) params.append('conversation_id', conversationId);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
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
      throw new Error(`Failed to fetch files: ${response.status}`);
    }
    
    // Parse and return the response
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      { error: `Failed to fetch files: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
} 
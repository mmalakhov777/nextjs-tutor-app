import { NextRequest, NextResponse } from 'next/server';

// The URL of the Flask backend from environment variables
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5002';

export async function GET(request: NextRequest) {
  console.log('GET /api/agents - Request received');
  try {
    // Get the URL parameters
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    // Construct the backend URL with parameters
    let url = `${BACKEND_URL}/api/agents`;
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

    // Handle errors
    if (!response.ok) {
      console.error('Error response from backend:', response.status);
      return NextResponse.json(
        { error: `Failed to fetch agents: ${response.status}` },
        { status: response.status }
      );
    }

    // Forward the response
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error handling agents request:', error);
    return NextResponse.json(
      { error: `Failed to process request: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  console.log('PUT /api/agents - Request received');
  try {
    const body = await request.json();
    
    // Make the request to the backend
    const response = await fetch(`${BACKEND_URL}/api/agents`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    // Handle errors
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('Error response from backend:', errorData);
      return NextResponse.json(
        { error: errorData.error || `Failed to update agent: ${response.status}` },
        { status: response.status }
      );
    }
    
    // Forward the response
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error handling agents update:', error);
    return NextResponse.json(
      { error: `Failed to update agent: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  console.log('POST /api/agents - Request received');
  try {
    const body = await request.json();
    
    // Make the request to the backend
    const response = await fetch(`${BACKEND_URL}/api/agents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    // Handle errors
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('Error response from backend:', errorData);
      return NextResponse.json(
        { error: errorData.error || `Failed to create agent: ${response.status}` },
        { status: response.status }
      );
    }
    
    // Forward the response
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error handling agent creation:', error);
    return NextResponse.json(
      { error: `Failed to create agent: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
} 
import { NextRequest, NextResponse } from 'next/server';

// The URL of the Flask backend from environment variables
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5002';

export async function PUT(request: NextRequest) {
  try {
    // Extract IDs from URL path segments
    const pathParts = request.url.split('/');
    const messageId = pathParts.pop() || '';
    const id = pathParts[pathParts.length - 3] || ''; // Get the chat session ID

    const body = await request.json();
    const response = await fetch(`${BACKEND_URL}/api/chat-sessions/${id}/messages/${messageId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to update message: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Extract IDs from URL path segments
    const pathParts = request.url.split('/');
    const messageId = pathParts.pop() || '';
    const id = pathParts[pathParts.length - 3] || ''; // Get the chat session ID

    const response = await fetch(`${BACKEND_URL}/api/chat-sessions/${id}/messages/${messageId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to delete message: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
} 
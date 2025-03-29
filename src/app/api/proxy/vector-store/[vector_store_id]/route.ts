import { NextRequest, NextResponse } from 'next/server';

// The URL of the Flask backend from environment variables
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5002';

export async function GET(request: NextRequest) {
  try {
    // Extract vector_store_id from URL path segments
    const vector_store_id = request.url.split('/').pop() || '';

    const response = await fetch(`${BACKEND_URL}/api/vector-store/${vector_store_id}`, {
      method: 'GET',
      headers: {
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
      { error: `Failed to get vector store: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Extract vector_store_id from URL path segments
    const vector_store_id = request.url.split('/').pop() || '';

    const response = await fetch(`${BACKEND_URL}/api/vector-store/${vector_store_id}`, {
      method: 'DELETE',
      headers: {
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
      { error: `Failed to delete vector store: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
} 
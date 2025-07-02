import { NextRequest, NextResponse } from 'next/server';

// The URL of the Flask backend from environment variables
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5002';

export async function GET(request: NextRequest) {
  try {
    // Extract ID from URL path segments
    const pathParts = request.url.split('/');
    const id = pathParts[pathParts.length - 2] || ''; // Get the file ID (content is the last segment)

    const response = await fetch(`${BACKEND_URL}/api/files/${id}/content`, {
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
      { error: `Failed to get file content: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
} 
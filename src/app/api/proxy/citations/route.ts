import { NextRequest, NextResponse } from 'next/server';

// The URL of the Flask backend from environment variables
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5002';

export async function POST(request: NextRequest) {
  console.log(`POST /api/citations - Request received`);
  
  try {
    // Parse the request body
    const body = await request.json();
    
    // Forward the request to the Flask backend
    const response = await fetch(`${BACKEND_URL}/api/citations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error response from backend: ${errorText}`);
      throw new Error(`Error: ${response.status} - ${errorText}`);
    }
    
    // Parse and return the response
    const data = await response.json();
    console.log('Citation processed successfully');
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error processing citation:', error);
    return NextResponse.json(
      { error: `Failed to process citations: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
} 
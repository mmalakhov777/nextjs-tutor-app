import { NextRequest, NextResponse } from 'next/server';

// The URL of the Flask backend from environment variables
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5002';

export async function PUT(request: NextRequest, { params }: { params: { name: string } }) {
  try {
    const name = params.name;
    const body = await request.json();
    
    const response = await fetch(`${BACKEND_URL}/api/agents/${name}`, {
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
      { error: `Failed to update agent: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { name: string } }) {
  try {
    const name = params.name;
    console.log(`DELETE /api/agents/${name} - Request received`);
    
    console.log(`Making request to ${BACKEND_URL}/api/agents/${name}`);
    const response = await fetch(`${BACKEND_URL}/api/agents/${name}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error response from backend: ${errorText}`);
      throw new Error(`Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      { error: `Failed to delete agent: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
} 
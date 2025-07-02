import { NextRequest, NextResponse } from 'next/server';

// Get OpenAI API key from root .env file
const openaiApiKey = process.env.OPENAI_API_KEY;

export async function GET(request: NextRequest) {
  try {
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not found in root .env file');
    }

    // Extract fileId from URL path segments
    const pathParts = request.url.split('/');
    const fileId = pathParts[pathParts.length - 2] || ''; // Get the file ID (content is the last segment)

    // Make request to OpenAI API
    const response = await fetch(`https://api.openai.com/v1/files/${fileId}/content`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
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
      { error: `Failed to get OpenAI file content: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
} 
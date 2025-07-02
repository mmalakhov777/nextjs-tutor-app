import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';

// Determine the backend URL based on environment variables
const getBackendUrl = () => {
  const backendUrl = env.NEXT_PUBLIC_BACKEND_URL;
  console.log('Using backend URL:', backendUrl);
  return backendUrl;
};

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}

// Generic GET handler
export async function GET(request: NextRequest) {
  return handleRequest(request, 'GET');
}

// POST handler for streaming responses
export async function POST(request: NextRequest) {
  return handleRequest(request, 'POST');
}

// Handle any requests to the API
async function handleRequest(request: NextRequest, method: string) {
  try {
    const backendUrl = getBackendUrl();
    const path = request.nextUrl.pathname.replace('/api/proxy', '');
    const targetUrl = `${backendUrl}/api${path || '/status'}`;
    
    console.log(`Proxying ${method} request to:`, targetUrl);
    
    let requestBody: string | null = null;
    if (method === 'POST') {
      try {
        const body = await request.json();
        requestBody = JSON.stringify(body);
        console.log('Request body:', requestBody);
      } catch (e) {
        console.log('No JSON body or error parsing it:', e);
      }
    }
    
    // Proxy parameters
    const init: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    };
    
    // Add body for POST requests
    if (method === 'POST' && requestBody) {
      init.body = requestBody;
    }
    
    // Add accept header for streaming responses
    if (path === '/stream' || path.includes('/chat')) {
      init.headers = {
        ...init.headers,
        'Accept': 'text/event-stream',
      };
    }
    
    // Forward the request to the backend
    const response = await fetch(targetUrl, init);
    
    // Check for error responses
    if (!response.ok) {
      console.error(`Backend responded with status: ${response.status}`);
      let errorText = '';
      try {
        errorText = await response.text();
        console.error('Error response:', errorText);
      } catch (e) {
        console.error('Could not read error response body');
      }
      
      return NextResponse.json({
        error: `Backend request failed with status ${response.status}`,
        details: errorText
      }, { status: response.status });
    }
    
    // Handle streaming responses differently
    if (response.headers.get('Content-Type')?.includes('text/event-stream')) {
      // Create a new ReadableStream to forward the response
      const stream = new ReadableStream({
        async start(controller) {
          const reader = response.body?.getReader();
          if (!reader) {
            throw new Error('Failed to get reader from response');
          }
          
          try {
            console.log('Streaming response from backend');
            while (true) {
              const { value, done } = await reader.read();
              if (done) break;
              controller.enqueue(value);
            }
          } catch (error) {
            console.error('Error reading from backend:', error);
          } finally {
            controller.close();
          }
        }
      });
      
      // Return the stream
      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }
    
    // For regular JSON responses
    try {
      const data = await response.json();
      return NextResponse.json(data);
    } catch (e) {
      // If not JSON, return the raw response
      const text = await response.text();
      return new Response(text, {
        status: response.status,
        headers: {
          'Content-Type': response.headers.get('Content-Type') || 'text/plain',
        },
      });
    }
  } catch (error) {
    console.error('API route error:', error);
    
    // Return a proper error response
    return NextResponse.json({
      error: 'Backend connection error',
      message: error instanceof Error ? error.message : 'Unknown error',
      backendUrl: env.NEXT_PUBLIC_BACKEND_URL
    }, { status: 500 });
  }
} 
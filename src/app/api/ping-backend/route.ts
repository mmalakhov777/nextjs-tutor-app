import { NextResponse } from 'next/server';
import { env } from '@/lib/env';

export async function GET() {
  try {
    const backendUrl = env.NEXT_PUBLIC_BACKEND_URL;
    
    console.log(`Pinging backend directly at ${backendUrl}/api/status`);
    
    // Use node-fetch to directly attempt connection to backend
    const response = await fetch(`${backendUrl}/api/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      // Try to bypass any caching
      cache: 'no-store'
    });
    
    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    return NextResponse.json({
      success: true,
      backendResponse: data,
      backendUrl
    });
  } catch (error) {
    console.error('Backend ping failed:', error);
    
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      backendUrl: env.NEXT_PUBLIC_BACKEND_URL,
    }, { status: 500 });
  }
} 
import { NextResponse } from 'next/server';
import { env } from '@/lib/env';

export async function GET() {
  try {
    const backendUrl = env.NEXT_PUBLIC_BACKEND_URL;
    const useRealBackend = env.NEXT_PUBLIC_USE_REAL_BACKEND;
    
    console.log('Testing backend connection:', {
      backendUrl,
      useRealBackend
    });
    
    if (!useRealBackend) {
      return NextResponse.json({
        status: 'mock',
        message: 'Using mock backend (NEXT_PUBLIC_USE_REAL_BACKEND is not true)',
        backendUrl,
        useRealBackend
      });
    }
    
    // Test connection to backend
    const response = await fetch(`${backendUrl}/api/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      cache: 'no-store'
    });
    
    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    return NextResponse.json({
      status: 'connected',
      backendStatus: data,
      backendUrl,
      useRealBackend
    });
  } catch (error) {
    console.error('Backend connection error:', error);
    
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
      backendUrl: env.NEXT_PUBLIC_BACKEND_URL,
      useRealBackend: env.NEXT_PUBLIC_USE_REAL_BACKEND
    }, { status: 500 });
  }
} 
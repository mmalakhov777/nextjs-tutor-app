import { NextResponse } from 'next/server';
import { env } from '@/lib/env';

export async function GET() {
  try {
    const backendUrl = env.NEXT_PUBLIC_BACKEND_URL;
    const useRealBackend = env.NEXT_PUBLIC_USE_REAL_BACKEND;
    
    console.log('Running comprehensive connection test to:', backendUrl);
    
    // Results object
    const results = {
      timestamp: new Date().toISOString(),
      backendUrl,
      useRealBackend,
      testResults: {} as Record<string, any>
    };

    // Only run tests if real backend is enabled
    if (!useRealBackend) {
      return NextResponse.json({
        ...results,
        status: 'mock',
        message: 'Using mock backend (NEXT_PUBLIC_USE_REAL_BACKEND is not true)'
      });
    }

    // Test 1: Server-side direct request (ping-backend)
    try {
      const pingResponse = await fetch(`${backendUrl}/api/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        cache: 'no-store'
      });
      
      if (!pingResponse.ok) {
        throw new Error(`Backend responded with status: ${pingResponse.status}`);
      }
      
      const pingData = await pingResponse.json();
      results.testResults.serverDirectRequest = {
        success: true,
        data: pingData
      };
    } catch (error) {
      results.testResults.serverDirectRequest = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Test 2: Test the /api/test-backend endpoint
    try {
      const testBackendResponse = await fetch(`${backendUrl}/api/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        cache: 'no-store'
      });
      
      if (!testBackendResponse.ok) {
        throw new Error(`Backend responded with status: ${testBackendResponse.status}`);
      }
      
      const testBackendData = await testBackendResponse.json();
      results.testResults.testBackendRequest = {
        success: true,
        data: testBackendData
      };
    } catch (error) {
      results.testResults.testBackendRequest = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Test 3: Test proxy configuration
    try {
      // We'll simulate a proxy request here by directly fetching from the backend
      const proxyResponse = await fetch(`${backendUrl}/api/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'http://localhost:4200'
        },
        cache: 'no-store'
      });
      
      if (!proxyResponse.ok) {
        throw new Error(`Backend responded with status: ${proxyResponse.status}`);
      }
      
      const proxyData = await proxyResponse.json();
      
      // Also check if CORS headers are present
      const corsHeaders = {
        'Access-Control-Allow-Origin': proxyResponse.headers.get('Access-Control-Allow-Origin'),
        'Access-Control-Allow-Credentials': proxyResponse.headers.get('Access-Control-Allow-Credentials'),
        'Access-Control-Expose-Headers': proxyResponse.headers.get('Access-Control-Expose-Headers'),
        'Vary': proxyResponse.headers.get('Vary')
      };
      
      results.testResults.proxyRequest = {
        success: true,
        data: proxyData,
        corsHeaders
      };
    } catch (error) {
      results.testResults.proxyRequest = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    return NextResponse.json({
      ...results,
      status: 'success'
    });
  } catch (error) {
    console.error('Connection test failed:', error);
    
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      message: error instanceof Error ? error.message : 'Unknown error',
      backendUrl: env.NEXT_PUBLIC_BACKEND_URL,
      useRealBackend: env.NEXT_PUBLIC_USE_REAL_BACKEND
    }, { status: 500 });
  }
} 
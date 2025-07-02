'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { env } from '@/lib/env';

// Create a loading component
function LoadingComponent() {
  return (
    <div className="text-center p-8">
      <p className="text-xl">Loading backend test...</p>
    </div>
  );
}

// Create the main content component
function BackendTestContent() {
  const [loading, setLoading] = useState(true);
  const [testResults, setTestResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Use env variables directly
  const backendUrl = env.NEXT_PUBLIC_BACKEND_URL;
  const useRealBackend = env.NEXT_PUBLIC_USE_REAL_BACKEND;
  
  useEffect(() => {
    console.log('Backend test running at:', new Date().toISOString());
    
    async function runTests() {
      try {
        // Use the new consolidated test API
        const response = await fetch('/api/connection-test', {
          cache: 'no-store'
        });
        
        if (!response.ok) {
          throw new Error(`Test API responded with status: ${response.status}`);
        }
        
        const data = await response.json();
        setTestResults(data);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
        setLoading(false);
      }
    }
    
    runTests();
  }, []);
  
  // Function to render test results
  const renderTestResult = (title: string, description: string, result: any, expectedError: boolean = false) => {
    if (!testResults || !testResults.testResults) {
      return (
        <div className="bg-white border border-gray-200 p-4 rounded-md shadow-sm">
          <h2 className="text-lg font-semibold mb-2">{title}</h2>
          <p className="text-sm text-gray-600 mb-2">{description}</p>
          <pre className="bg-gray-100 p-2 rounded-md whitespace-pre-wrap text-sm overflow-auto max-h-64">
            {loading ? '"Loading..."' : error ? `"Error: ${error}"` : '"No test results available"'}
          </pre>
        </div>
      );
    }
    
    const testResult = testResults.testResults[result];
    const displayData = testResult || { error: "Test result not found" };
    const resultClass = expectedError 
      ? (!testResult?.success ? "bg-green-100" : "bg-red-100") 
      : (testResult?.success ? "bg-green-100" : "bg-red-100");
    
    return (
      <div className={`bg-white border border-gray-200 p-4 rounded-md shadow-sm ${resultClass}`}>
        <h2 className="text-lg font-semibold mb-2">{title}</h2>
        <p className="text-sm text-gray-600 mb-2">{description}</p>
        <pre className="bg-gray-100 p-2 rounded-md whitespace-pre-wrap text-sm overflow-auto max-h-64">
          {JSON.stringify(displayData, null, 2)}
        </pre>
      </div>
    );
  };
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Backend Connection Test</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-gray-100 p-4 rounded-md">
          <h2 className="text-lg font-semibold mb-2">Environment Configuration</h2>
          <p><strong>Backend URL:</strong> {backendUrl}</p>
          <p><strong>Use Real Backend:</strong> {useRealBackend ? 'Yes' : 'No'}</p>
        </div>
        
        <div className="bg-gray-100 p-4 rounded-md">
          <h2 className="text-lg font-semibold mb-2">Proxy Configuration</h2>
          <p>The frontend proxies requests to the backend using Next.js rewrites.</p>
          <p>Check <code>next.config.mjs</code> to ensure the rewrites are configured correctly.</p>
        </div>
      </div>
      
      {loading ? (
        <div className="text-center p-8">
          <p className="text-xl">Running backend connection tests...</p>
          <p className="text-sm text-gray-500 mt-2">This may take a few seconds</p>
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      ) : (
        <>
          {testResults && (
            <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded relative mb-4">
              <strong className="font-bold">Test Completed:</strong>
              <span className="block sm:inline"> {testResults.timestamp}</span>
              <p className="mt-1"><strong>Status:</strong> {testResults.status}</p>
              {testResults.message && <p className="mt-1">{testResults.message}</p>}
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderTestResult(
              "Server-Side Request", 
              "Direct server-to-server request (bypasses CORS)",
              "serverDirectRequest"
            )}
            
            {renderTestResult(
              "Backend Test API", 
              "Tests from Next.js API route",
              "testBackendRequest"
            )}
            
            {renderTestResult(
              "Proxy Request with CORS",
              "Tests proxy configuration and CORS headers",
              "proxyRequest"
            )}
          </div>
        </>
      )}
      
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-2">Troubleshooting Steps</h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li>Make sure your backend is running at <code>{backendUrl}</code></li>
          <li>Check backend logs for connection attempts and errors</li>
          <li>Verify that the backend has CORS enabled for your frontend origin (http://localhost:4200)</li>
          <li>Add these headers to your backend responses:
            <pre className="bg-gray-100 p-2 rounded-md whitespace-pre-wrap text-sm mt-2">
{`Access-Control-Allow-Origin: http://localhost:4200
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true`}
            </pre>
          </li>
        </ol>
      </div>
      
      <div className="mt-8 flex gap-4">
        <Link href="/" className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
          Return to Home
        </Link>
        <button 
          onClick={() => window.location.reload()} 
          className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
        >
          Refresh Tests
        </button>
      </div>
    </div>
  );
}

// Main component with Suspense wrapper
export default function BackendTest() {
  return (
    <Suspense fallback={<LoadingComponent />}>
      <BackendTestContent />
    </Suspense>
  );
} 
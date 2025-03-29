import Link from 'next/link';
import { env } from '@/lib/env';

// Add a flag to indicate this is a dynamic page - no static prerendering
export const dynamic = 'force-dynamic';

// Server-side component that doesn't require client JS
export default function BackendTestStatic() {
  // Get environment variables
  const backendUrl = env.NEXT_PUBLIC_BACKEND_URL;
  const useRealBackend = env.NEXT_PUBLIC_USE_REAL_BACKEND;
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Backend Connection Test (Static)</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-gray-100 p-4 rounded-md">
          <h2 className="text-lg font-semibold mb-2">Environment Configuration</h2>
          <p><strong>Backend URL:</strong> {backendUrl}</p>
          <p><strong>Use Real Backend:</strong> {useRealBackend ? 'Yes' : 'No'}</p>
          <p><strong>Environment:</strong> {process.env.VERCEL_ENV || process.env.NODE_ENV || 'local'}</p>
        </div>
        
        <div className="bg-gray-100 p-4 rounded-md">
          <h2 className="text-lg font-semibold mb-2">Proxy Configuration</h2>
          <p>The frontend proxies requests to the backend using Next.js rewrites.</p>
          <p>Check <code>next.config.mjs</code> to ensure the rewrites are configured correctly.</p>
        </div>
      </div>
      
      <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative mb-4">
        <strong className="font-bold">Static Page:</strong>
        <span className="block sm:inline"> Backend tests are only available in local development environment.</span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 p-4 rounded-md shadow-sm">
          <h2 className="text-lg font-semibold mb-2">Direct Server Request</h2>
          <p className="text-sm text-gray-600 mb-2">Server-to-server request (bypasses CORS)</p>
          <pre className="bg-gray-100 p-2 rounded-md whitespace-pre-wrap text-sm overflow-auto max-h-64">
            {"This feature is only available in development mode"}
          </pre>
        </div>
        
        <div className="bg-white border border-gray-200 p-4 rounded-md shadow-sm">
          <h2 className="text-lg font-semibold mb-2">Request with Origin Header</h2>
          <p className="text-sm text-gray-600 mb-2">Tests CORS headers from backend</p>
          <pre className="bg-gray-100 p-2 rounded-md whitespace-pre-wrap text-sm overflow-auto max-h-64">
            {"This feature is only available in development mode"}
          </pre>
        </div>
      </div>
      
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-2">Troubleshooting Steps</h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li>Make sure your backend is running at <code>{backendUrl}</code></li>
          <li>Check backend logs for connection attempts and errors</li>
          <li>Verify that the backend has CORS enabled for your frontend origin</li>
          <li>Add these headers to your backend responses:
            <pre className="bg-gray-100 p-2 rounded-md whitespace-pre-wrap text-sm mt-2">
{`Access-Control-Allow-Origin: [your frontend URL]
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
        <a href="/backend-test-static" className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600">
          Refresh Tests
        </a>
      </div>
    </div>
  );
} 
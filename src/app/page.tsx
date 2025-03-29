'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">
          Welcome to AI Tutoring
        </h1>
        <div className="space-y-4">
          <Link 
            href="/chat" 
            className="block w-full px-6 py-3 text-center text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Chat with Tutors
          </Link>
          <Link 
            href="/agents" 
            className="block w-full px-6 py-3 text-center text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
          >
            Manage Agents
          </Link>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useChat } from 'ai/react';
import { useState } from 'react';

export default function TestWeatherPage() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
    maxSteps: 3,
    body: {
      agentName: 'General Assistant',
      useTools: true,
    },
  });

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">AI Tools Test</h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
            {messages.length === 0 && (
              <p className="text-gray-500 text-center py-8">
                Try asking about weather or SEO keywords:
                <br />
                <span className="text-sm italic">
                  "What is the weather in Paris and New York?"
                  <br />
                  "Analyze SEO for sustainable living"
                  <br />
                  "What are the SEO metrics for AI technology in the UK?"
                  <br />
                  "Check keyword data for machine learning in Canada"
                </span>
              </p>
            )}
            
            {messages.map((message) => (
              <div
                key={message.id}
                className={`p-4 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-100 ml-auto max-w-[80%]'
                    : 'bg-gray-100 mr-auto max-w-[80%]'
                }`}
              >
                <div className="text-sm font-semibold mb-1">
                  {message.role === 'user' ? 'You' : 'Assistant'}
                </div>
                <div className="whitespace-pre-wrap">{message.content}</div>
                
                {/* Display tool invocations if present */}
                {message.toolInvocations && message.toolInvocations.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {message.toolInvocations.map((invocation, index) => (
                      <div
                        key={index}
                        className="bg-blue-50 border border-blue-200 rounded p-3 text-sm"
                      >
                        <div className="font-semibold text-blue-700 mb-1">
                          🛠️ Tool: {invocation.toolName}
                        </div>
                        <div className="text-blue-600">
                          <div>Arguments: {JSON.stringify(invocation.args, null, 2)}</div>
                          {invocation.state === 'result' && invocation.result && (
                            <div className="mt-2">
                              Result: {typeof invocation.result === 'string' 
                                ? invocation.result 
                                : JSON.stringify(invocation.result, null, 2)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="flex items-center space-x-2 text-gray-500">
                <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-gray-600 rounded-full"></div>
                <span>Thinking...</span>
              </div>
            )}
          </div>
          
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={handleInputChange}
              placeholder="Ask about weather or SEO keywords..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </form>
        </div>
        
        <div className="mt-4 text-sm text-gray-600">
          <p className="font-semibold mb-2">Example queries:</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="font-medium text-gray-700 mb-1">🌤️ Weather:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>What is the weather in Paris and New York?</li>
                <li>How's the weather in London?</li>
                <li>Tell me the temperature in Tokyo in Fahrenheit</li>
              </ul>
            </div>
            
            <div>
              <p className="font-medium text-gray-700 mb-1">🔍 SEO Analysis:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Analyze SEO for "sustainable living"</li>
                <li>What are the keyword suggestions for "AI technology" in the UK?</li>
                <li>Show me SEO data for "machine learning" in Spanish</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
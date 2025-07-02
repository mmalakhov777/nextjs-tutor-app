'use client';

import { useChat } from 'ai/react';
import { useState } from 'react';

export default function TestParallelToolsPage() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
    maxSteps: 5,
    body: {
      agentName: 'General Assistant',
      useTools: true,
    },
  });

  const exampleQueries = [
    "What's the weather in Paris, London, Tokyo, and New York?",
    "Analyze SEO for 'machine learning' and 'artificial intelligence' in the US",
    "Check the weather in Berlin and analyze SEO for 'sustainable living' in Canada",
    "What's the temperature in Sydney, Dubai, and Moscow? Also check SEO for 'web development'"
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Parallel Tool Calling Test</h1>
        <p className="text-gray-600 mb-8">
          Test multiple tool calls executed in parallel for faster responses
        </p>
        
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">
                  Try asking questions that require multiple tool calls:
                </p>
                <div className="space-y-2">
                  {exampleQueries.map((query, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        handleInputChange({ target: { value: query } } as any);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                    >
                      "{query}"
                    </button>
                  ))}
                </div>
              </div>
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
                  <div className="mt-3">
                    <div className="text-xs font-semibold text-gray-600 mb-2">
                      🛠️ Tool Calls ({message.toolInvocations.length} {message.toolInvocations.length > 1 ? 'in parallel' : 'tool'}):
                    </div>
                    <div className="space-y-2">
                      {message.toolInvocations.map((invocation, index) => (
                        <div
                          key={index}
                          className="bg-blue-50 border border-blue-200 rounded p-2 text-xs"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-blue-700">
                              {invocation.toolName}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              invocation.state === 'result' 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {invocation.state}
                            </span>
                          </div>
                          <div className="text-blue-600">
                            <div className="font-mono">
                              {JSON.stringify(invocation.args, null, 2)}
                            </div>
                            {invocation.state === 'result' && invocation.result && (
                              <div className="mt-1 pt-1 border-t border-blue-200">
                                <div className="text-green-700">
                                  {typeof invocation.result === 'string' 
                                    ? invocation.result.split('\n')[0] + '...'
                                    : JSON.stringify(invocation.result).substring(0, 100) + '...'}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="flex items-center space-x-2 text-gray-500">
                <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-gray-600 rounded-full"></div>
                <span>Processing tool calls...</span>
              </div>
            )}
          </div>
          
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={handleInputChange}
              placeholder="Ask for multiple things at once..."
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
        
        <div className="mt-6 bg-blue-50 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">ℹ️ About Parallel Tool Calling</h3>
          <p className="text-sm text-blue-800">
            When you ask multiple questions that require different tools, the AI can execute them in parallel 
            for faster responses. For example, checking weather in multiple cities or analyzing SEO for multiple 
            keywords can happen simultaneously instead of sequentially.
          </p>
        </div>
      </div>
    </div>
  );
} 
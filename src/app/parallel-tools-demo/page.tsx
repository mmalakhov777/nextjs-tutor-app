'use client';

import { useChat } from 'ai/react';
import { useState, useEffect } from 'react';

export default function ParallelToolsDemoPage() {
  const [toolExecutions, setToolExecutions] = useState<Array<{
    id: string;
    tool: string;
    args: any;
    startTime: number;
    endTime?: number;
    result?: string;
  }>>([]);

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
    maxSteps: 5,
    body: {
      agentName: 'General Assistant',
      useTools: true,
    },
  });

  // Monitor messages for tool invocations
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.toolInvocations) {
      lastMessage.toolInvocations.forEach(invocation => {
        // Check if we already have this tool execution
        const existingExec = toolExecutions.find(exec => 
          exec.tool === invocation.toolName && 
          JSON.stringify(exec.args) === JSON.stringify(invocation.args)
        );
        
        if (!existingExec && invocation.state === 'call') {
          // New tool call
          setToolExecutions(prev => [...prev, {
            id: `${invocation.toolName}-${Date.now()}`,
            tool: invocation.toolName,
            args: invocation.args,
            startTime: Date.now(),
          }]);
        } else if (existingExec && invocation.state === 'result' && !existingExec.endTime) {
          // Tool completed
          setToolExecutions(prev => prev.map(exec => 
            exec.id === existingExec.id
              ? { ...exec, endTime: Date.now(), result: invocation.result }
              : exec
          ));
        }
      });
    }
  }, [messages, toolExecutions]);

  const parallelExamples = [
    {
      title: "Multiple Weather Queries",
      query: "What's the weather in Paris, London, Tokyo, and New York?",
      expectedTools: 4,
      description: "All weather checks execute in parallel"
    },
    {
      title: "Multiple SEO Analyses",
      query: "Analyze SEO for 'machine learning', 'artificial intelligence', and 'deep learning' in the US",
      expectedTools: 3,
      description: "SEO analyses run simultaneously"
    },
    {
      title: "Mixed Tool Types",
      query: "Check weather in Berlin and Tokyo, and analyze SEO for 'web development' in Canada",
      expectedTools: 3,
      description: "Different tool types can run in parallel"
    }
  ];

  const resetDemo = () => {
    setToolExecutions([]);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Parallel Tool Execution Demo</h1>
        <p className="text-gray-600 mb-8">
          Watch how multiple tools execute simultaneously for faster responses
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chat Interface */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Chat Interface</h2>
            
            <div className="space-y-4 mb-6 h-96 overflow-y-auto">
              {messages.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">
                    Select an example below or type your own query:
                  </p>
                  <div className="space-y-3">
                    {parallelExamples.map((example, index) => (
                      <div key={index} className="text-left">
                        <button
                          onClick={() => {
                            resetDemo();
                            handleInputChange({ target: { value: example.query } } as any);
                          }}
                          className="w-full p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                        >
                          <div className="font-semibold text-blue-900">{example.title}</div>
                          <div className="text-sm text-blue-700 mt-1">"{example.query}"</div>
                          <div className="text-xs text-blue-600 mt-1">{example.description}</div>
                        </button>
                      </div>
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
                  <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex items-center space-x-2 text-gray-500">
                  <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-gray-600 rounded-full"></div>
                  <span>Processing...</span>
                </div>
              )}
            </div>
            
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={handleInputChange}
                placeholder="Ask for multiple things..."
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

          {/* Tool Execution Visualization */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Tool Execution Timeline</h2>
              {toolExecutions.length > 0 && (
                <button
                  onClick={resetDemo}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Clear
                </button>
              )}
            </div>
            
            {toolExecutions.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                Tool executions will appear here when you send a message
              </div>
            ) : (
              <div className="space-y-3">
                {toolExecutions.map((exec, index) => {
                  const duration = exec.endTime ? exec.endTime - exec.startTime : Date.now() - exec.startTime;
                  const isComplete = !!exec.endTime;
                  
                  return (
                    <div key={exec.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-semibold">
                            {exec.tool === 'getWeather' ? '🌤️' : '🔍'} {exec.tool}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            isComplete 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-yellow-100 text-yellow-700 animate-pulse'
                          }`}>
                            {isComplete ? 'Complete' : 'Running'}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {duration}ms
                        </span>
                      </div>
                      
                      <div className="text-xs text-gray-600 mb-2">
                        Args: {JSON.stringify(exec.args)}
                      </div>
                      
                      {/* Progress bar */}
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            isComplete ? 'bg-green-500' : 'bg-blue-500 animate-pulse'
                          }`}
                          style={{ width: isComplete ? '100%' : '60%' }}
                        />
                      </div>
                      
                      {exec.result && (
                        <div className="mt-2 text-xs text-gray-700 truncate">
                          Result: {exec.result.substring(0, 50)}...
                        </div>
                      )}
                    </div>
                  );
                })}
                
                {toolExecutions.length > 1 && (
                  <div className="mt-4 p-3 bg-green-50 rounded-lg">
                    <div className="text-sm font-semibold text-green-800 mb-1">
                      Parallel Execution Detected! 🚀
                    </div>
                    <div className="text-xs text-green-700">
                      {toolExecutions.length} tools executed simultaneously, saving time compared to sequential execution.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 bg-blue-50 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">How Parallel Tool Calling Works</h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>When the AI detects multiple independent operations, it calls tools in parallel</li>
            <li>Each tool executes simultaneously, reducing total response time</li>
            <li>Results are collected and presented together in the final response</li>
            <li>The weather tool has a 1-second delay, SEO has 0.5 seconds to demonstrate timing</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 
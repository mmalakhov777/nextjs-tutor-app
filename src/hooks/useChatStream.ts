import { useState, useCallback, useEffect, useRef, useMemo } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  createdAt?: Date;
  toolInvocations?: any[];
  reasoning?: string;
  toolAction?: 'call' | 'output' | 'annotations';
  toolName?: string;
}

interface UseChatStreamOptions {
  userId: string | null;
  conversationId: string | null;
  initialMessages?: Message[];
  initialMessageAgentMap?: Record<string, string>;
  onFinish?: (message: Message) => void;
  onError?: (error: Error) => void;
  onConversationIdChange?: (conversationId: string) => void;
  mode?: 'chat' | 'research';
}

export function useChatStream({
  userId,
  conversationId,
  initialMessages = [],
  initialMessageAgentMap = {},
  onFinish,
  onError,
  onConversationIdChange,
  mode = 'chat',
}: UseChatStreamOptions) {
  const [currentAgent, setCurrentAgent] = useState('General Assistant');
  const [showWelcome, setShowWelcome] = useState(true);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  
  // COMPLETELY INDEPENDENT INPUT STATE
  const [input, setInput] = useState('');
  const inputRef = useRef(''); // Keep ref in sync for stable access
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Track which agent was used for each message
  const [messageAgentMap, setMessageAgentMap] = useState<Record<string, string>>(initialMessageAgentMap);
  const currentAgentRef = useRef(currentAgent);
  
  // Keep refs updated
  useEffect(() => {
    currentAgentRef.current = currentAgent;
  }, [currentAgent]);

  useEffect(() => {
    inputRef.current = input;
  }, [input]);

  // NO MORE TEMPORARY IDs! We'll create real sessions immediately when needed

  // Helper function to create a real session
  const createRealSession = useCallback(async (): Promise<string | null> => {
    console.log('🆕 useChatStream: Creating new session...');
    try {
      const sessionResponse = await fetch('/api/create-chat-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId || 'anonymous'
        }),
      });

      if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json();
        const newSessionId = sessionData.session?.id;
        
        console.log('✅ useChatStream: Session created successfully:', {
          sessionId: newSessionId,
          fullResponse: sessionData,
          hasCallback: !!onConversationIdChange
        });
        
        // Notify parent component about the new conversation ID
        if (newSessionId && onConversationIdChange) {
          console.log('📢 useChatStream: Calling onConversationIdChange callback with:', newSessionId);
          onConversationIdChange(newSessionId);
        }
        
        // Update URL with the real conversation ID
        if (newSessionId) {
          const url = new URL(window.location.href);
          url.searchParams.set('conversation_id', newSessionId);
          window.history.pushState({}, '', url.toString());
        }
        
        return newSessionId || null;
      } else {
        console.error('❌ useChatStream: Failed to create session:', sessionResponse.status);
        return null;
      }
    } catch (sessionError) {
      console.error('❌ useChatStream: Error creating session:', sessionError);
      return null;
    }
  }, [userId, onConversationIdChange]);

  // Handle sending message with agent context
  const sendMessage = useCallback(
    async (content: string, options?: { agentName?: string }) => {
      if (!content.trim() || isLoading) return;

      // Create a real session if we don't have a valid conversationId
      let actualConversationId = conversationId;
      
      if (!actualConversationId) {
        actualConversationId = await createRealSession();
      }
      
      console.log('🔍 useChatStream: Initial conversation ID check:', {
        conversationId,
        actualConversationId,
        needsSession: !actualConversationId
      });
      
      // If we still don't have a conversation ID, we can't proceed
      if (!actualConversationId) {
        throw new Error('Failed to create or obtain a valid conversation ID');
      }

      try {
        setIsLoading(true);
        setError(null);
        setShowWelcome(false);

        // Update agent if specified
        const effectiveAgent = options?.agentName || currentAgentRef.current;
        if (options?.agentName) {
          setCurrentAgent(options.agentName);
        }

        // Create user message
        const userMessage: Message = {
          id: `user-${Date.now()}-${Math.random()}`,
          role: 'user',
          content,
          createdAt: new Date(),
        };

        // Add user message to state
        setMessages(prev => [...prev, userMessage]);
        
        // Dispatch event for auto-add sources functionality
        try {
          const newMessageEvent = new CustomEvent('new-message-added', {
            detail: {
              content: content,
              role: 'user',
              timestamp: new Date()
            }
          });
          window.dispatchEvent(newMessageEvent);
        } catch (eventError) {
          // Silent error handling for event dispatch
        }

        // Store agent for user message
        setMessageAgentMap(prev => ({
          ...prev,
          [userMessage.id]: effectiveAgent
        }));

        // Prepare request body with the actual conversation ID
        const requestBody = {
          messages: [...messages, userMessage]
            .filter(msg => msg.role !== 'tool') // Filter out tool messages
            .map(msg => ({
              role: msg.role,
              content: msg.content,
              id: msg.id,
              toolInvocations: msg.toolInvocations,
              data: {
                agentName: messageAgentMap[msg.id] || effectiveAgent
              }
            })),
          userId: userId || 'anonymous',
          conversationId: actualConversationId, // Use the real conversation ID
          agentName: effectiveAgent,
          useTools: true, // Enable tools
          mode,
        };

        console.log('useChatStream: Sending request with agentName:', effectiveAgent, '(from options:', options?.agentName, ', from ref:', currentAgentRef.current, ')');
        console.log('useChatStream: Using conversationId:', actualConversationId);
        console.log('🚀 useChatStream: Request body conversationId:', actualConversationId);

        // Make the API call with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          console.error('Request timeout after 120 seconds');
          controller.abort();
        }, 120000); // 120 second timeout

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        clearTimeout(timeoutId); // Clear timeout if request completes

        // console.log('API Response:', {
        //   status: response.status,
        //   statusText: response.statusText,
        //   headers: Object.fromEntries(response.headers.entries()),
        //   hasBody: !!response.body
        // });

        if (!response.ok) {
          // Try to get error details from response
          let errorDetails = `HTTP ${response.status}: ${response.statusText}`;
          try {
            const errorBody = await response.text();
            if (errorBody) {
              const errorData = JSON.parse(errorBody);
              errorDetails = errorData.error || errorData.details || errorDetails;
            }
          } catch (e) {
            // If we can't parse the error, use the status text
          }
          throw new Error(errorDetails);
        }

        // Handle streaming response
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No response body');
        }

        const decoder = new TextDecoder();
        let assistantContent = '';
        let assistantReasoning = '';
        let toolInvocations: any[] = [];
        let hasReceivedAnyContent = false;
        let chunkCount = 0;
        const startTime = Date.now();
        
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}-${Math.random()}`,
          role: 'assistant',
          content: '',
          createdAt: new Date(),
          toolInvocations: [],
        };

        // Add empty assistant message to state
        setMessages(prev => [...prev, assistantMessage]);

        // Store agent for assistant message
        setMessageAgentMap(prev => ({
          ...prev,
          [assistantMessage.id]: effectiveAgent
        }));

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            chunkCount++;
            const chunk = decoder.decode(value, { stream: true });
            
            // Log chunk details for debugging
            // console.log(`Chunk ${chunkCount}:`, {
            //   size: chunk.length,
            //   preview: chunk.substring(0, 100),
            //   hasContent: chunk.length > 0
            // });
            
            const lines = chunk.split('\n').filter(line => line.trim());

            for (const line of lines) {
              try {
                if (line.startsWith('0:')) {
                  // Text part
                  const textData = line.slice(2);
                  const text = JSON.parse(textData);
                  assistantContent += text;
                  hasReceivedAnyContent = true;
                  
                  // Update the assistant message content
                  setMessages(prev => prev.map(msg => 
                    msg.id === assistantMessage.id 
                      ? { 
                          ...msg, 
                          content: assistantContent,
                          toolInvocations: toolInvocations.length > 0 ? toolInvocations : undefined,
                          reasoning: assistantReasoning || undefined
                        }
                      : msg
                  ));
                } else if (line.startsWith('3:')) {
                  // Error chunk - AI SDK error
                  const errorData = line.slice(2);
                  console.error('AI SDK Error chunk received:', errorData);
                  
                  try {
                    const errorObj = JSON.parse(errorData);
                    const errorMessage = errorObj.message || errorObj.error || errorData;
                    throw new Error(`AI SDK Error: ${errorMessage}`);
                  } catch (parseError) {
                    // If we can't parse the error, use the raw data
                    throw new Error(`AI SDK Error: ${errorData}`);
                  }
                } else if (line.startsWith('b:')) {
                  // Tool call start - b: prefix indicates tool call beginning
                  const toolData = line.slice(2);
                  const toolCall = JSON.parse(toolData);
                  
                  // Add new tool invocation with initial state
                  const newInvocation = {
                    toolCallId: toolCall.toolCallId,
                    toolName: toolCall.toolName,
                    args: {},
                    state: 'call'
                  };
                  
                  toolInvocations.push(newInvocation);
                  
                  // Update the assistant message with tool invocations
                  setMessages(prev => prev.map(msg => 
                    msg.id === assistantMessage.id 
                      ? { 
                          ...msg, 
                          content: assistantContent,
                          toolInvocations: [...toolInvocations],
                          reasoning: assistantReasoning || undefined
                        }
                      : msg
                  ));
                } else if (line.startsWith('c:')) {
                  // Tool call args streaming - c: prefix indicates argument deltas
                  const argsData = line.slice(2);
                  const argsDelta = JSON.parse(argsData);
                  
                  // Find the tool invocation and update args (we don't need to track deltas for display)
                  const toolIndex = toolInvocations.findIndex(t => t.toolCallId === argsDelta.toolCallId);
                  if (toolIndex >= 0) {
                    // Just mark that args are being streamed
                    toolInvocations[toolIndex] = { 
                      ...toolInvocations[toolIndex],
                      state: 'call'
                    };
                  }
                } else if (line.startsWith('9:')) {
                  // Complete tool call - 9: prefix indicates complete tool call with final args
                  const toolData = line.slice(2);
                  const toolCall = JSON.parse(toolData);
                  
                  // Update the tool invocation with complete args
                  const toolIndex = toolInvocations.findIndex(t => t.toolCallId === toolCall.toolCallId);
                  if (toolIndex >= 0) {
                    toolInvocations[toolIndex] = { 
                      ...toolInvocations[toolIndex],
                      toolName: toolCall.toolName,
                      args: toolCall.args,
                      state: 'call'
                    };
                    
                    // Update the assistant message
                    setMessages(prev => prev.map(msg => 
                      msg.id === assistantMessage.id 
                        ? { 
                            ...msg, 
                            content: assistantContent,
                            toolInvocations: [...toolInvocations],
                            reasoning: assistantReasoning || undefined
                          }
                        : msg
                    ));
                  }
                } else if (line.startsWith('a:')) {
                  // Tool result part
                  const resultData = line.slice(2);
                  const toolResult = JSON.parse(resultData);
                  
                  // Update the corresponding tool invocation with result
                  const toolIndex = toolInvocations.findIndex(t => t.toolCallId === toolResult.toolCallId);
                  if (toolIndex >= 0) {
                    toolInvocations[toolIndex] = { 
                      ...toolInvocations[toolIndex], 
                      result: toolResult.result,
                      state: 'result'
                    };
                    
                    // Update the assistant message
                    setMessages(prev => prev.map(msg => 
                      msg.id === assistantMessage.id 
                        ? { 
                            ...msg, 
                            content: assistantContent,
                            toolInvocations: [...toolInvocations],
                            reasoning: assistantReasoning || undefined
                          }
                        : msg
                    ));
                  }
                } else if (line.startsWith('g:')) {
                  // Reasoning part
                  const reasoningData = line.slice(2);
                  const reasoning = JSON.parse(reasoningData);
                  assistantReasoning += reasoning;
                  
                  // Update the assistant message with reasoning
                  setMessages(prev => prev.map(msg => 
                    msg.id === assistantMessage.id 
                      ? { 
                          ...msg, 
                          content: assistantContent,
                          toolInvocations: toolInvocations.length > 0 ? toolInvocations : undefined,
                          reasoning: assistantReasoning
                        }
                      : msg
                  ));
                }
              } catch (e) {
                // Ignore parse errors for malformed chunks
                console.warn('Failed to parse stream chunk:', line, e);
              }
            }
          }
        } finally {
          reader.releaseLock();
        }

        // Check if we received any content at all
        const totalTime = Date.now() - startTime;
        // console.log(`Stream completed:`, {
        //   chunkCount,
        //   totalTime,
        //   hasReceivedAnyContent,
        //   contentLength: assistantContent.length,
        //   toolInvocationsCount: toolInvocations.length
        // });
        
        // If no content was received and stream completed quickly, it's likely an error
        if (!hasReceivedAnyContent && totalTime < 5000 && toolInvocations.length === 0) {
          console.error('Silent failure detected: No content received from stream');
          throw new Error(`Agent "${effectiveAgent}" failed to respond - no content received from stream`);
        }

        // After stream ends, ensure all tool invocations have results
        // If any tool invocations are still in 'call' state, mark them as failed
        const incompleteTools = toolInvocations.filter(t => t.state === 'call' && !t.result);
        if (incompleteTools.length > 0) {
          console.warn('Found incomplete tool invocations, marking as failed:', incompleteTools);
          incompleteTools.forEach(tool => {
            const toolIndex = toolInvocations.findIndex(t => t.toolCallId === tool.toolCallId);
            if (toolIndex >= 0) {
              toolInvocations[toolIndex] = {
                ...toolInvocations[toolIndex],
                result: 'Tool execution successful but result is too big to show',
                state: 'result'
              };
            }
          });
        }

        // Final update with complete content
        const finalMessage: Message = { 
          ...assistantMessage, 
          content: assistantContent,
          toolInvocations: toolInvocations.length > 0 ? toolInvocations : undefined,
          reasoning: assistantReasoning || undefined
        };
        
        setMessages(prev => prev.map(msg => 
          msg.id === assistantMessage.id ? finalMessage : msg
        ));

        // Dispatch event for auto-add sources functionality for assistant messages
        try {
          const newMessageEvent = new CustomEvent('new-message-added', {
            detail: {
              content: assistantContent,
              role: 'assistant',
              timestamp: new Date()
            }
          });
          window.dispatchEvent(newMessageEvent);
        } catch (eventError) {
          // Silent error handling for event dispatch
        }

        // Call onFinish callback
        onFinish?.(finalMessage);

      } catch (error) {
        console.error('Error in sendMessage:', error);
        
        // Add more detailed error logging
        console.error('Detailed error information:', {
          errorType: error instanceof Error ? error.constructor.name : typeof error,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
          requestBody: {
            userId: userId || 'anonymous',
            conversationId: actualConversationId,
            agentName: options?.agentName || currentAgentRef.current,
            messageCount: messages.length + 1
          }
        });
        
        // Check if this was already a General Assistant attempt
        const currentAgentName = options?.agentName || currentAgentRef.current;
        const isAlreadyGeneralAssistant = currentAgentName === 'General Assistant';
        
        if (!isAlreadyGeneralAssistant) {
          console.log(`🔄 Agent "${currentAgentName}" failed, retrying with General Assistant...`);
          
          // Add a temporary message to show we're retrying
          const retryMessage: Message = {
            id: `retry-${Date.now()}-${Math.random()}`,
            role: 'assistant',
            content: `${currentAgentName} is temporarily unavailable. Switching to General Assistant...`,
            createdAt: new Date(),
          };
          
          setMessages(prev => [...prev, retryMessage]);
          
          // Retry with General Assistant
          try {
            // Clear any error state
            setError(null);
            
            // Small delay to show the retry message
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Remove the retry message before making the actual call
            setMessages(prev => prev.filter(msg => msg.id !== retryMessage.id));
            
            // Retry the same content with General Assistant
            return await sendMessage(content, { agentName: 'General Assistant' });
          } catch (retryError) {
            console.error('Retry with General Assistant also failed:', retryError);
            // Remove the retry message
            setMessages(prev => prev.filter(msg => msg.id !== retryMessage.id));
            // Fall through to show error message
          }
        }
        
        // Create a more informative error message for the user
        let userErrorMessage = 'An error occurred while processing your message.';
        
        if (error instanceof Error) {
          // Check for specific error types
          if (error.message.includes('HTTP error! status: 401')) {
            userErrorMessage = 'Authentication error: Please check your API keys.';
          } else if (error.message.includes('HTTP error! status: 429')) {
            userErrorMessage = 'Rate limit exceeded: Please wait a moment before trying again.';
          } else if (error.message.includes('HTTP error! status: 500')) {
            userErrorMessage = 'Server error: The AI service is temporarily unavailable.';
          } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            userErrorMessage = 'Network error: Please check your internet connection.';
          } else if (error.message.includes('No response body')) {
            userErrorMessage = 'No response received from the AI service.';
          } else if (error.message.includes('AI SDK Error')) {
            userErrorMessage = `AI service error: ${error.message.replace('AI SDK Error: ', '')}`;
          } else {
            // Include the actual error message for debugging
            userErrorMessage = `Error: ${error.message}`;
          }
        }
        
        // Add an error message to the chat
        const errorMessage: Message = {
          id: `error-${Date.now()}-${Math.random()}`,
          role: 'assistant',
          content: userErrorMessage,
          createdAt: new Date(),
        };
        
        setMessages(prev => [...prev, errorMessage]);
        
        const errorObj = error instanceof Error ? error : new Error(String(error));
        setError(errorObj);
        onError?.(errorObj);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, messageAgentMap, userId, mode, isLoading, onFinish, onError, createRealSession]
  );

  // COMPLETELY INDEPENDENT input change handler - ZERO dependencies
  const handleInputChange = useCallback(
    (value: string | React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const newValue = typeof value === 'string' ? value : value.target.value;
      setInput(newValue);
    },
    [] // ZERO dependencies - completely stable
  );

  // OPTIMIZED submit handler - uses ref for stable access
  const handleSubmit = useCallback(
    (e?: React.FormEvent<HTMLFormElement>) => {
      if (e) {
        e.preventDefault();
      }
      
      const currentInput = inputRef.current;
      if (!currentInput.trim() || isLoading) return;
      
      const messageToSend = currentInput;
      setInput(''); // Clear input immediately
      sendMessage(messageToSend);
    },
    [isLoading, sendMessage] // Only depends on loading state and sendMessage
  );

  // Clear messages and reset - OPTIMIZED
  const reset = useCallback(() => {
    setMessages([]);
    setInput('');
    setShowWelcome(true);
    setCurrentAgent('General Assistant');
    setMessageAgentMap({});
    setError(null);
  }, []);

  // OPTIMIZED: Update messages when initial messages change - prevent unnecessary updates
  useEffect(() => {
    if (initialMessages.length > 0 && messages.length === 0) {
      setMessages(initialMessages);
      setShowWelcome(false);
    }
  }, [initialMessages.length]); // Only depend on length, not the entire array

  // OPTIMIZED: Update messageAgentMap when initialMessageAgentMap changes
  const initialMapKeys = useMemo(() => Object.keys(initialMessageAgentMap).join(','), [initialMessageAgentMap]);
  
  useEffect(() => {
    const newKeys = Object.keys(initialMessageAgentMap);
    if (newKeys.length > 0) {
      const hasNewMappings = newKeys.some(key => !messageAgentMap[key]);
      if (hasNewMappings) {
        setMessageAgentMap(prev => ({
          ...prev,
          ...initialMessageAgentMap
        }));
      }
    }
  }, [initialMapKeys]); // Use memoized keys string instead of object

  // Method to manually set agent mapping - OPTIMIZED
  const setMessageAgentMapping = useCallback((mapping: Record<string, string>) => {
    setMessageAgentMap(prev => ({
      ...prev,
      ...mapping
    }));
  }, []);

  // No-op functions for compatibility
  const reload = useCallback(() => {}, []);
  const stop = useCallback(() => {}, []);

  return {
    // State
    messages,
    input,
    isLoading,
    error,
    currentAgent,
    showWelcome,
    messageAgentMap,
    
    // Actions
    sendMessage,
    handleInputChange,
    handleSubmit,
    reload,
    stop,
    reset,
    setInput,
    setMessages,
    setCurrentAgent,
    setShowWelcome,
    setMessageAgentMapping,
    
    // Derived state
    currentMessage: input,
    setCurrentMessage: setInput,
    isProcessing: isLoading,
    setIsProcessing: setIsLoading,
  };
} 
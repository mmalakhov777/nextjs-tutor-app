import { useState, useEffect, useRef } from 'react';
import type { Message, MessageRole } from '@/types/chat';

// Add a helper function to get the backend URL at the top of the file
const getBackendUrl = () => {
  return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5002';
};

export function useChat(userId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('');
  const [showWelcome, setShowWelcome] = useState(true);
  const [currentAgent, setCurrentAgent] = useState('Triage Agent');
  const currentAgentRef = useRef('Triage Agent');
  const [seenAgents, setSeenAgents] = useState<Set<string>>(new Set(['Triage Agent']));
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);

  // Update ref when state changes
  useEffect(() => {
    currentAgentRef.current = currentAgent;
  }, [currentAgent]);

  // Replace the sendMessage function to use direct backend URL
  const sendMessage = async (message: string, conversationId: string | null, userId: string | null) => {
    if (!message.trim()) return;
    
    try {
      // If we don't have a conversation ID, create one
      let chatId = conversationId;
      if (!chatId) {
        const backendUrl = getBackendUrl();
        const sessionResponse = await fetch(`${backendUrl}/api/chat-sessions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            title: 'New Chat',
            user_id: userId || 'anonymous'
          }),
        });
        
        if (!sessionResponse.ok) {
          throw new Error(`Failed to create session: ${sessionResponse.status}`);
        }
        
        const data = await sessionResponse.json();
        chatId = data.id;
        
        // Update the conversation ID in state
        if (chatId) {
          setCurrentConversationId(chatId);
          
          // Update URL with conversation_id without refreshing the page
          const url = new URL(window.location.href);
          url.searchParams.set('conversation_id', chatId);
          window.history.pushState({}, '', url.toString());
        }
      }
      
      // Add user message to state instantly
      const userMessage: Message = {
        role: 'user',
        content: message,
        timestamp: new Date()
      };
      setMessages(messages => [...messages, userMessage]);
      
      // Clear input field
      setCurrentMessage('');
      
      // Set processing state
      setIsProcessing(true);
      setShowWelcome(false);
      
      // Construct parameters for API request
      const backendUrl = getBackendUrl();
      const apiEndpoint = `${backendUrl}/api/chat`;
      
      // Use a properly typed params object
      const params: {
        message: string;
        conversation_id: string;
        stream: boolean;
        user_id?: string;
      } = {
        message,
        conversation_id: chatId as string, // We know it's not null at this point
        stream: true
      };
      
      if (userId) {
        params.user_id = userId;
      }
      
      // Make API request
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(params),
      });
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) {
        throw new Error('Failed to get reader from response');
      }
      
      let fullResponse = '';
      let responseMetadata: any = {};
      let agentName = '';
      let messageId = '';
      
      // Add placeholder assistant message
      const assistantMessage: Message = {
        role: 'assistant',
        content: '',
        timestamp: new Date()
      };
      setMessages(messages => [...messages, assistantMessage]);
      
      while (true) {
        const { value, done } = await reader.read();
        
        if (done) {
          break;
        }
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          if (line.startsWith('data:')) {
            try {
              const data = JSON.parse(line.slice(5));
              
              if (data.type === 'message') {
                fullResponse = data.content;
                
                // Update message with current content
                setMessages(messages => {
                  const updatedMessages = [...messages];
                  if (updatedMessages.length > 0) {
                    const lastMessageIndex = updatedMessages.length - 1;
                    if (updatedMessages[lastMessageIndex].role === 'assistant') {
                      updatedMessages[lastMessageIndex] = {
                        ...updatedMessages[lastMessageIndex],
                        content: fullResponse,
                        agentName: agentName || data.agent_name || '',
                        id: messageId || data.message_id || ''
                      };
                    }
                  }
                  return updatedMessages;
                });
              } else if (data.type === 'agent_change') {
                agentName = data.agent_name;
                
                // Add to seenAgents
                if (agentName && typeof setSeenAgents === 'function') {
                  setSeenAgents(prev => new Set([...prev, agentName]));
                }
                
                // Update current agent
                setCurrentAgent(agentName);
                
              } else if (data.type === 'metadata') {
                responseMetadata = { ...responseMetadata, ...data.metadata };
                messageId = data.message_id || messageId;
                
                if (data.metadata?.citations) {
                  // Update message with citations
                  setMessages(messages => {
                    const updatedMessages = [...messages];
                    if (updatedMessages.length > 0) {
                      const lastMessageIndex = updatedMessages.length - 1;
                      if (updatedMessages[lastMessageIndex].role === 'assistant') {
                        updatedMessages[lastMessageIndex] = {
                          ...updatedMessages[lastMessageIndex],
                          citations: data.metadata.citations
                        };
                      }
                    }
                    return updatedMessages;
                  });
                }
              }
            } catch (e) {
              console.error('Error parsing chunk:', e);
            }
          }
        }
      }
      
      // Finished processing
      setIsProcessing(false);
      
      return {
        success: true,
        conversationId,
        message: fullResponse,
        metadata: responseMetadata
      };
    } catch (error) {
      console.error('Error:', error);
      // Add more detailed error logging
      if (error instanceof Error) {
        console.error('Detailed error info:', {
          message: error.message,
          name: error.name,
          stack: error.stack
        });
      }
      setIsProcessing(false);
      return { success: false, error };
    }
  };

  // Handle sending messages
  const handleSendMessage = async (message: string) => {
    if (!message.trim() || isProcessing) return;

    const newMessage: Message = {
      role: 'user',
      content: message,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newMessage]);
    setCurrentMessage('');
    setIsProcessing(true);
    setShowWelcome(false);

    try {
      if (!currentConversationId && userId) {
        try {
          const backendUrl = getBackendUrl();
          const sessionResponse = await fetch(`${backendUrl}/api/chat-sessions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              title: 'New Chat',
              user_id: userId
            }),
          });
          
          if (!sessionResponse.ok) {
            throw new Error('Failed to create new chat session');
          }
          
          const newSession = await sessionResponse.json();
          setCurrentConversationId(newSession.id);
          
          const url = new URL(window.location.href);
          url.searchParams.set('conversation_id', newSession.id);
          window.history.pushState({}, '', url.toString());
        } catch (error) {
          setMessages(prev => [...prev, { 
            role: 'error', 
            content: 'Failed to create a new chat session. Please try again.',
            timestamp: new Date()
          }]);
          setIsProcessing(false);
          return;
        }
      }

      // Update URL with conversation_id without refreshing the page
      const url = new URL(window.location.href);
      if (currentConversationId) {
        url.searchParams.set('conversation_id', currentConversationId);
        window.history.pushState({}, '', url.toString());
      }

      const useRealBackend = process.env.NEXT_PUBLIC_USE_REAL_BACKEND === 'true';
      const backendUrl = getBackendUrl();
      
      // Use the proxy endpoint which is already confirmed working from our tests
      const endpoint = '/api/proxy/chat';

      const requestBody = {
        question: message,
        userId: userId,
        conversationId: currentConversationId,
        history: messages
          .filter(msg => msg.role !== 'error' && msg.role !== 'system')
          .map(msg => ({ role: msg.role, content: msg.content }))
      };

      console.log('Sending chat request to:', endpoint);
      console.log('Request body:', JSON.stringify(requestBody));

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        console.error(`API request failed with status ${response.status}`);
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`API request failed with status ${response.status}: ${errorText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let currentResponse = '';
      let responseAdded = false;
      let shouldShowTriageReturn = false;

      while (reader) {
        const { value, done } = await reader.read();
        if (done) {
          if (shouldShowTriageReturn) {
            // Don't show system message when returning to Triage Agent
            setCurrentAgent("Triage Agent");
            currentAgentRef.current = "Triage Agent";
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              console.log('Stream Event:', { type: data.type, content: data.content, currentAgent: currentAgentRef.current });

              switch (data.type) {
                case 'agent_update':
                  const newAgent = data.content.replace('Switched to ', '');
                  console.log('Agent Update:', { newAgent, currentAgent: currentAgentRef.current });
                  if (currentAgentRef.current !== newAgent) {
                    if (newAgent !== "Triage Agent") {
                      shouldShowTriageReturn = true;
                      
                      // Only add system message if it's NOT switching to Triage Agent
                      setMessages(prev => [...prev, {
                        role: 'system',
                        content: newAgent,
                        timestamp: new Date(),
                        agentName: newAgent,
                        metadata: {
                          agent_name: newAgent,
                          event_type: 'agent_switch'
                        }
                      }]);
                    }
                    
                    seenAgents.add(newAgent);
                    setCurrentAgent(newAgent);
                    currentAgentRef.current = newAgent;  // Update ref immediately
                    console.log('Updated Current Agent:', newAgent);
                    
                    // Reset for new agent
                    currentResponse = '';
                    responseAdded = false;
                  }
                  break;

                case 'message':
                  currentResponse = data.content;
                  console.log('Message Event:', { currentResponse, currentAgent: currentAgentRef.current, responseAdded });
                  
                  if (!responseAdded) {
                    console.log('Creating new message with agent:', currentAgentRef.current);
                    setMessages(prev => {
                      console.log('Previous messages:', prev);
                      return [...prev, { 
                        role: 'assistant', 
                        content: currentResponse,
                        timestamp: new Date(),
                        citations: [],
                        agentName: currentAgentRef.current,
                        metadata: {
                          agent_name: currentAgentRef.current,
                          event_type: 'message'
                        }
                      }];
                    });
                    responseAdded = true;
                  } else {
                    setMessages(prev => {
                      const newMessages = [...prev];
                      const lastMessage = newMessages[newMessages.length - 1];
                      if (lastMessage && lastMessage.role === 'assistant') {
                        console.log('Updating last message with agent:', currentAgentRef.current);
                        lastMessage.content = currentResponse;
                        lastMessage.agentName = currentAgentRef.current;
                        lastMessage.metadata = {
                          ...lastMessage.metadata,
                          agent_name: currentAgentRef.current,
                          event_type: 'message'
                        };
                      }
                      return newMessages;
                    });
                  }
                  break;

                case 'token':
                  currentResponse += data.content;
                  console.log('Token Event:', { currentResponse, currentAgent: currentAgentRef.current, responseAdded });
                  
                  if (!responseAdded) {
                    console.log('Creating new token message with agent:', currentAgentRef.current);
                    setMessages(prev => {
                      console.log('Previous messages:', prev);
                      return [...prev, { 
                        role: 'assistant', 
                        content: currentResponse,
                        timestamp: new Date(),
                        citations: [],
                        agentName: currentAgentRef.current,
                        metadata: {
                          agent_name: currentAgentRef.current,
                          event_type: 'token'
                        }
                      }];
                    });
                    responseAdded = true;
                  } else {
                    setMessages(prev => {
                      const newMessages = [...prev];
                      const lastMessage = newMessages[newMessages.length - 1];
                      if (lastMessage && lastMessage.role === 'assistant') {
                        console.log('Updating token message with agent:', currentAgentRef.current);
                        lastMessage.content = currentResponse;
                        lastMessage.agentName = currentAgentRef.current;
                        lastMessage.metadata = {
                          ...lastMessage.metadata,
                          agent_name: currentAgentRef.current,
                          event_type: 'token'
                        };
                      }
                      return newMessages;
                    });
                  }
                  break;

                case 'file_citation':
                  setMessages(prev => {
                    const newMessages = [...prev];
                    const lastMessage = newMessages[newMessages.length - 1];
                    if (lastMessage && lastMessage.role === 'assistant') {
                      if (!lastMessage.citations) {
                        lastMessage.citations = [];
                      }
                      lastMessage.citations.push({
                        file_id: data.raw_citation.file_id,
                        index: data.raw_citation.index,
                        type: 'file_citation',
                        filename: data.raw_citation.filename,
                        raw_content: data.content
                      });
                    }
                    return newMessages;
                  });
                  break;

                case 'annotations':
                  setMessages(prev => [...prev, {
                    role: 'tool',
                    content: data.content,
                    timestamp: new Date(),
                    toolAction: 'annotations',
                    toolName: data.toolName
                  }]);
                  break;

                case 'error':
                  setMessages(prev => [...prev, { 
                    role: 'error', 
                    content: data.content,
                    timestamp: new Date()
                  }]);
                  break;
              }
            } catch (e) {
              console.error('Error processing message:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error:', error);
      // Add more detailed error logging
      if (error instanceof Error) {
        console.error('Detailed error info:', {
          message: error.message,
          name: error.name,
          stack: error.stack
        });
      }
      setMessages(prev => [...prev, { 
        role: 'error', 
        content: 'Connection error. Please try again.',
        timestamp: new Date()
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle message input change
  const handleMessageChange = (value: string) => {
    setCurrentMessage(value);
  };

  // Reset chat
  const handleReset = async () => {
    setMessages([]);
    setCurrentMessage('');
    setShowWelcome(true);
    setCurrentAgent('Triage Agent');
    setSeenAgents(new Set(['Triage Agent']));
    setCurrentConversationId(null);
  };

  return {
    // State
    messages,
    isProcessing,
    currentMessage,
    showWelcome,
    currentAgent,
    currentConversationId,
    seenAgents,

    // State setters
    setMessages,
    setIsProcessing,
    setCurrentMessage,
    setShowWelcome,
    setCurrentAgent,
    setCurrentConversationId,
    setSeenAgents,

    // Handlers
    handleSendMessage,
    handleMessageChange,
    handleReset
  };
} 
import { useState, useEffect, useRef } from 'react';
import type { Message, MessageRole } from '@/types/chat';
import { renderToString } from 'react-dom/server';
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';

// Add a helper function to get the backend URL at the top of the file
const getBackendUrl = () => {
  return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5002';
};

// Add config for controlling database updates
const ENABLE_DATABASE_UPDATES = process.env.NEXT_PUBLIC_ENABLE_DB_UPDATES !== 'false'; // Enabled by default

// Add a helper function to check if the API supports message updates
const checkApiSupport = async (chatId: string, messageId: string): Promise<boolean> => {
  try {
    const backendUrl = getBackendUrl();
    // Try an OPTIONS request to see if the endpoint exists and supports POST
    const checkResponse = await fetch(`${backendUrl}/api/chat-sessions/${chatId}/messages/${messageId}/update`, {
      method: 'OPTIONS',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Get headers and ensure they're defined before checking contents
    const allowHeader = checkResponse.headers.get('Allow') || '';
    const corsMethodsHeader = checkResponse.headers.get('Access-Control-Allow-Methods') || '';
    
    // Return true if the API responds with success or has appropriate CORS headers
    return checkResponse.ok || 
           allowHeader.includes('POST') || 
           corsMethodsHeader.includes('POST');
  } catch (error) {
    console.warn('❓❓❓ API support check failed, will still attempt update:', error);
    return true; // Assume API might work even if check fails
  }
};

// Add a utility function to convert Markdown to HTML
const convertMarkdownToHtml = (markdownContent: string): string => {
  try {
    // Use renderToString to convert ReactMarkdown output to HTML string
    const htmlContent = renderToString(
      React.createElement(ReactMarkdown, {
        remarkPlugins: [remarkGfm, remarkMath],
        rehypePlugins: [
          rehypeKatex,
          [rehypeRaw, { passThrough: ['span', 'div'] }],
          rehypeSanitize
        ],
        children: markdownContent
      })
    );
    return htmlContent;
  } catch (error) {
    console.error('Failed to convert Markdown to HTML:', error);
    return markdownContent; // Return original content if conversion fails
  }
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
                      // Convert markdown to HTML before saving
                      const htmlContent = convertMarkdownToHtml(fullResponse);
                      
                      // Temporary logging to see what's being stored
                      console.log('DEBUG - Storing in database:');
                      console.log('Original Markdown:', fullResponse);
                      console.log('Converted HTML:', htmlContent);
                      
                      updatedMessages[lastMessageIndex] = {
                        ...updatedMessages[lastMessageIndex],
                        content: htmlContent, // Store HTML directly in content field
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
              // Silently catch errors to avoid console logs
            }
          }
        }
      }
      
      // Finished processing
      setIsProcessing(false);
      
      // Save the HTML version of the message to the database after streaming ends
      if (ENABLE_DATABASE_UPDATES && messageId && chatId && fullResponse) {
        try {
          // Check if API supports message updates
          const apiSupported = await checkApiSupport(chatId, messageId);
          
          if (!apiSupported) {
            console.log('⚠️⚠️⚠️ API does not appear to support message updates - skipping');
            return {
              success: true,
              conversationId,
              message: fullResponse,
              metadata: responseMetadata
            };
          }
          
          const backendUrl = getBackendUrl();
          const htmlContent = convertMarkdownToHtml(fullResponse);
          
          // Prepare metadata
          const messageMetadata = {
            ...responseMetadata,
            agent_name: agentName,
            event_type: 'message',
            original_markdown: fullResponse, // Store original markdown for reference
            converted_at: new Date().toISOString()
          };
          
          // DEBUG: Add very visible logging before making the request
          console.log('🔴🔴🔴 ATTEMPTING DATABASE UPDATE REQUEST 🔴🔴🔴');
          console.log(`POST ${backendUrl}/api/chat-sessions/${chatId}/messages/${messageId}/update`);
          console.log('Request payload:', {
            content: htmlContent.substring(0, 100) + '...',
            metadata: messageMetadata
          });
          
          // Make API call to update the message in the database using POST
          const updateResponse = await fetch(`${backendUrl}/api/chat-sessions/${chatId}/messages/${messageId}/update`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              content: htmlContent, // Save the HTML version
              metadata: messageMetadata
            }),
          });
          
          // DEBUG: Add very visible logging after the request completes
          console.log('🟢🟢🟢 DATABASE UPDATE RESPONSE 🟢🟢🟢');
          console.log('Status:', updateResponse.status, updateResponse.statusText);
          try {
            const responseData = await updateResponse.clone().json();
            console.log('Response data:', responseData);
          } catch (e) {
            console.log('Could not parse response as JSON');
          }
          
          if (!updateResponse.ok) {
            console.error(`Failed to update message in database: ${updateResponse.status}`);
            console.error('❌❌❌ Error updating message in database');
          } else {
            console.log('✅✅✅ Message successfully updated in database!');
          }
        } catch (dbError) {
          // Add more visible error logging
          console.error('❌❌❌ ERROR UPDATING MESSAGE IN DATABASE ❌❌❌', dbError);
        }
      } else {
        // Log why we didn't attempt the update
        console.warn('⚠️⚠️⚠️ Skipped database update - missing required data:',
          { messageId: !!messageId, chatId: !!chatId, hasContent: !!fullResponse });
      }
      
      return {
        success: true,
        conversationId,
        message: fullResponse,
        metadata: responseMetadata
      };
    } catch (error) {
      // Keep minimal error handling without console.error
      setIsProcessing(false);
      return { success: false, error };
    }
  };

  // Handle sending messages
  const handleSendMessage = async (message: string, displayMessage?: string) => {
    if (!message.trim() || isProcessing) return;

    // Use provided displayMessage if available, otherwise extract from message
    let displayContent = displayMessage || message;
    
    // If no explicit displayMessage was provided, try to extract from metadata
    if (!displayMessage) {
      const metaStartTag = '__FILES_METADATA__';
      const metaEndTag = '__END_FILES_METADATA__';
      const metaStartIndex = message.lastIndexOf(metaStartTag); // Use lastIndexOf

      if (metaStartIndex !== -1) {
        const metaEndIndex = message.indexOf(metaEndTag, metaStartIndex);
        if (metaEndIndex !== -1) {
          // Extract content *before* the metadata block for display
          displayContent = message.substring(0, metaStartIndex).trim();
        }
        // If tags are malformed, displayContent remains the original message for now
      }
    }
    
    // ADDED: Clean up the file references in the display content
    // Convert @[file-file-ID:filename.pdf] to simply filename.pdf
    displayContent = displayContent.replace(/@\[file-[a-zA-Z0-9-_]+:([^\]]+)\]/g, '$1');
    // Also clean up any remaining technical file IDs
    displayContent = displayContent.replace(/#\[file-[a-zA-Z0-9-_]+:([^\]]+)\]/g, '#$1');

    // Generate a temporary ID for this message
    const temporaryMessageId = `temp-${Date.now()}-${Math.round(Math.random() * 1000000)}`;
    
    const newMessageForDisplay: Message = {
      id: temporaryMessageId, // Add a temporary ID
      sessionId: currentConversationId || undefined, // Include session ID if available
      role: 'user',
      content: displayContent, // Use the cleaned content for display
      timestamp: new Date()
    };

    // Add the CLEANED message to the state for immediate UI update
    setMessages(prev => [...prev, newMessageForDisplay]);
    setCurrentMessage('');
    setIsProcessing(true);
    setShowWelcome(false);

    // --- The rest of the function uses the ORIGINAL `message` variable --- 
    // --- which contains the metadata for the backend --- 

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
          
          // Update the sessionId of our temporary message since we now have a conversation
          setMessages(prev => prev.map(msg => 
            msg.id === temporaryMessageId 
              ? { ...msg, sessionId: newSession.id } 
              : msg
          ));
          
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
        history: [...messages, newMessageForDisplay] // Pass updated history
          .filter(msg => msg.role !== 'error' && msg.role !== 'system')
          // Send the ORIGINAL content for previous user messages, and the cleaned one for the current
          .map(msg => ({
             role: msg.role, 
             content: (msg.timestamp === newMessageForDisplay.timestamp && msg.role === 'user') 
                      ? message // Send ORIGINAL message content for the current message
                      : msg.content // Send existing content for previous messages
            }))
      };

      // Send the request with the ORIGINAL message content
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...requestBody,
          question: message // Ensure the original message is sent here
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
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

              switch (data.type) {
                case 'agent_update':
                  const newAgent = data.content.replace('Switched to ', '');
                  if (currentAgentRef.current !== newAgent) {
                    if (newAgent !== "Triage Agent") {
                      shouldShowTriageReturn = true;
                      
                      // Only add system message if it's NOT switching to Triage Agent
                      setMessages(prev => [...prev, {
                        id: `system-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Add unique ID
                        sessionId: currentConversationId!, // Include current session ID
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
                    
                    // Reset for new agent
                    currentResponse = '';
                    responseAdded = false;
                  }
                  break;

                case 'message':
                  currentResponse = data.content;
                  
                  if (!responseAdded) {
                    setMessages(prev => {
                      // Generate a unique ID for this message
                      const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                      
                      // Convert markdown to HTML
                      const htmlContent = convertMarkdownToHtml(currentResponse);
                      return [...prev, { 
                        id: messageId, // Add unique ID
                        sessionId: currentConversationId!, // Include current session ID
                        role: 'assistant', 
                        content: htmlContent, // Store HTML directly in content
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
                        // If the message doesn't have an ID, generate one
                        if (!lastMessage.id) {
                          lastMessage.id = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                        }
                        
                        // If message doesn't have sessionId, add it
                        if (!lastMessage.sessionId && currentConversationId) {
                          lastMessage.sessionId = currentConversationId;
                        }
                        
                        // Convert markdown to HTML
                        const htmlContent = convertMarkdownToHtml(currentResponse);
                        lastMessage.content = htmlContent; // Store HTML directly
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
                  
                  if (!responseAdded) {
                    setMessages(prev => {
                      // Generate a unique ID for this message
                      const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                      
                      // Convert markdown to HTML as tokens come in
                      const htmlContent = convertMarkdownToHtml(currentResponse);
                      return [...prev, { 
                        id: messageId, // Add unique ID
                        sessionId: currentConversationId!, // Include current session ID
                        role: 'assistant', 
                        content: htmlContent, // Store HTML directly
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
                        // If the message doesn't have an ID, generate one
                        if (!lastMessage.id) {
                          lastMessage.id = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                        }
                        
                        // If message doesn't have sessionId, add it
                        if (!lastMessage.sessionId && currentConversationId) {
                          lastMessage.sessionId = currentConversationId;
                        }
                        
                        // Convert markdown to HTML as tokens come in
                        const htmlContent = convertMarkdownToHtml(currentResponse);
                        lastMessage.content = htmlContent; // Store HTML directly
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
                  
                  // Dispatch custom event to notify listeners about annotations
                  window.dispatchEvent(new CustomEvent('annotation-event', { 
                    detail: {
                      type: 'annotations',
                      content: data.content,
                      toolName: data.toolName,
                      timestamp: new Date()
                    }
                  }));
                  break;

                case 'error':
                  setMessages(prev => [...prev, { 
                    id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Add unique ID
                    sessionId: currentConversationId!, // Include current session ID
                    role: 'error', 
                    content: data.content,
                    timestamp: new Date()
                  }]);
                  break;
              }
            } catch (e) {
              // Silently catch errors
            }
          }
        }
      }
    } catch (error) {
      // Minimal error handling
      setMessages(prev => [...prev, { 
        id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Add unique ID
        sessionId: currentConversationId || undefined, // Change to undefined instead of null
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
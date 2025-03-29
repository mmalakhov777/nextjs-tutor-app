import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

// In-memory store for messages and sessions
const sessions = new Map();
const messages = new Map();

// Simple AI response generator
const generateAIResponse = (message: string): string => {
  // Extract potential question patterns
  if (message.toLowerCase().includes('hello') || message.toLowerCase().includes('hi')) {
    return "Hello! I'm your AI tutor. How can I help you today?";
  }
  
  if (message.toLowerCase().includes('help')) {
    return "I'd be happy to help. What subject or topic would you like assistance with?";
  }
  
  if (message.toLowerCase().includes('math')) {
    return "I can help with mathematics! What specific math problem or concept are you working on?";
  }
  
  if (message.toLowerCase().includes('science')) {
    return "Science is fascinating! What area of science are you interested in learning about?";
  }
  
  // Default response
  return "I understand you're asking about: " + message + ". Could you provide more details so I can give you a better answer?";
};

export async function POST(request: NextRequest) {
  try {
    const { message, sessionId, userId = 'anonymous' } = await request.json();
    
    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }
    
    // Generate a new session if none provided
    let currentSessionId = sessionId;
    if (!currentSessionId) {
      currentSessionId = uuidv4();
      
      // Store session in memory
      sessions.set(currentSessionId, {
        id: currentSessionId,
        user_id: userId,
        title: message.substring(0, 50),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
    
    // Generate message ID and save user message
    const messageId = uuidv4();
    const userMessage = {
      id: messageId,
      session_id: currentSessionId,
      role: 'user',
      content: message,
      user_id: userId,
      created_at: new Date().toISOString()
    };
    
    messages.set(messageId, userMessage);
    
    // Generate AI response
    const aiResponse = generateAIResponse(message);
    const aiMessageId = uuidv4();
    const aiMessage = {
      id: aiMessageId,
      session_id: currentSessionId,
      role: 'assistant',
      content: aiResponse,
      agent_name: 'AI Tutor',
      created_at: new Date().toISOString()
    };
    
    messages.set(aiMessageId, aiMessage);
    
    // Return both messages and session info
    return NextResponse.json({
      sessionId: currentSessionId,
      messages: [
        {
          id: messageId,
          role: 'user',
          content: message,
          created_at: userMessage.created_at
        },
        {
          id: aiMessageId,
          role: 'assistant',
          content: aiResponse,
          agent_name: 'AI Tutor',
          created_at: aiMessage.created_at
        }
      ]
    });
  } catch (error) {
    console.error('Error processing chat message:', error);
    return NextResponse.json(
      { error: 'Failed to process message', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 
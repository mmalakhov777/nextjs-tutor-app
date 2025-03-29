import { NextRequest } from 'next/server';

// The URL of the Flask backend from environment variables
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5002';

// Handle OPTIONS requests (CORS preflight)
export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Chat request body:', body);
    
    // Handle both formats
    // Format 1: { message, conversation_id, user_id, streamMode }
    // Format 2: { question, userId, conversationId, history }
    
    const question = body.question || body.message;
    const conversationId = body.conversationId || body.conversation_id;
    const userId = body.userId || body.user_id;
    const history = body.history || [];
    
    if (!question) {
      return new Response(
        JSON.stringify({ error: 'No question/message provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Processing chat request for question: ${question}, user: ${userId}, conversation: ${conversationId}`);
    
    // Make a direct POST request to the backend's /chat endpoint (not /api/chat)
    const response = await fetch(`${BACKEND_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify({
        question: question,
        user_id: userId,
        conversation_id: conversationId,
        history: history
      })
    });
    
    if (!response.ok) {
      console.error(`Backend responded with status: ${response.status}`);
      throw new Error(`Backend responded with status: ${response.status}`);
    }
    
    // Create a new ReadableStream that forwards the response from the Flask backend
    const responseStream = new ReadableStream({
      async start(controller) {
        try {
          const reader = response.body?.getReader();
          if (!reader) {
            throw new Error('Failed to get reader from response');
          }
          
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
          
          controller.close();
        } catch (error) {
          console.error('Stream error:', error);
          const errorEvent = `data: ${JSON.stringify({ type: 'error', content: 'Stream error occurred' })}\n\n`;
          controller.enqueue(new TextEncoder().encode(errorEvent));
          controller.close();
        }
      }
    });
    
    // Return the stream as a Response
    return new Response(responseStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('API route error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
} 
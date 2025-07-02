import { NextRequest } from 'next/server';

// This simulates the different types of events we might get from the Python backend
type EventType = 'token' | 'message' | 'agent_update' | 'error';

interface StreamEvent {
  type: EventType;
  content: string;
}

// This function simulates the streaming response from the Python backend
async function* generateEvents(question: string, history: any[]): AsyncGenerator<StreamEvent> {
  // Simulate agent update
  yield { type: 'agent_update', content: 'Triage Agent' };
  
  // Wait a bit to simulate processing
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Simulate agent update
  yield { type: 'agent_update', content: 'Switched to Math Tutor' };
  
  // Simulate token streaming
  const response = `I'll help you with your question: "${question}". `;
  for (const char of response) {
    yield { type: 'token', content: char };
    // Small delay to simulate streaming
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  // Simulate a complete message
  yield { type: 'message', content: `I'll help you with your question: "${question}". Let me think about this...` };
  
  // In a real implementation, we would call the Python backend here
  // For now, we'll just simulate a response
  
  // Simulate error (uncomment to test error handling)
  // yield { type: 'error', content: 'An error occurred while processing your request.' };
}

export async function POST(request: NextRequest) {
  try {
    const { question, history } = await request.json();
    
    if (!question) {
      return new Response(
        JSON.stringify({ error: 'No question provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Create a ReadableStream to stream the response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const encoder = new TextEncoder();
          
          // Generate events and send them to the client
          for await (const event of generateEvents(question, history || [])) {
            const data = `data: ${JSON.stringify(event)}\n\n`;
            controller.enqueue(encoder.encode(data));
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
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('API route error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
} 
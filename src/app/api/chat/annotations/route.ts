import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { saveToolMessage } from '@/lib/db/messages';

// Schema for annotation request
const AnnotationSchema = z.object({
  conversationId: z.string(),
  userId: z.string(),
  agentName: z.string(),
  annotations: z.array(z.object({
    file_id: z.string(),
    index: z.number(),
    type: z.string(),
    filename: z.string(),
    raw_content: z.string().optional(),
  })),
  messageId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { conversationId, userId, agentName, annotations, messageId } = AnnotationSchema.parse(body);
    
    // Format annotations as string (similar to backend format)
    const annotationsStr = `annotations=[${annotations.map(ann => 
      `AnnotationFileCitation(file_id='${ann.file_id}', index=${ann.index}, type='${ann.type}', filename='${ann.filename}')`
    ).join(', ')}]`;
    
    // Save as tool message to local database
    try {
      const saveResult = await saveToolMessage({
        chat_session_id: conversationId,
        content: annotationsStr,
        user_id: userId,
        agent_name: agentName,
        tool_action: 'annotations',
        metadata: {
          tool_name: 'file_citations',
          associated_message_id: messageId,
          citations: annotations,
        }
      });
      
      if (!saveResult.success) {
        throw new Error(`Failed to save annotations: ${saveResult.error}`);
      }
      
      return NextResponse.json({
        success: true,
        message_id: saveResult.message_id,
      });
    } catch (error) {
      throw new Error(`Failed to save annotations to local DB: ${error instanceof Error ? error.message : String(error)}`);
    }
    
  } catch (error) {
    console.error('Annotations API error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to save annotations',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
} 
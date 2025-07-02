import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

// Get database connection
const chatDbConnectionString = process.env.CHAT_DATABASE_URL;
if (!chatDbConnectionString) {
  throw new Error('CHAT_DATABASE_URL environment variable is not set!');
}
const sql = neon(chatDbConnectionString);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    
    // First, try to fetch from slide_images table
    const slideImages = await sql`
      SELECT 
        id,
        slide_id,
        slide_number,
        title,
        image_prompt,
        image_data,
        image_mime_type,
        background_color,
        style,
        transition,
        created_at,
        updated_at
      FROM slide_images 
      WHERE session_id = ${sessionId}
      ORDER BY slide_number ASC
    `;
    
    // If we have slides in slide_images table, format them properly
    if (slideImages && slideImages.length > 0) {
      const formattedSlides = slideImages.map(slide => {
        // Ensure image_data has proper data URI format
        let formattedImageData = slide.image_data;
        if (slide.image_data && !slide.image_data.startsWith('data:')) {
          const mimeType = slide.image_mime_type || 'image/jpeg';
          formattedImageData = `data:${mimeType};base64,${slide.image_data}`;
        }
        
        return {
          ...slide,
          image_data: formattedImageData
        };
      });
      
      return NextResponse.json({
        success: true,
        slides: formattedSlides
      });
    }
    
    // Otherwise, try to extract slides from messages
    const messages = await sql`
      SELECT content, metadata
      FROM messages
      WHERE session_id = ${sessionId}
      AND role = 'assistant'
      ORDER BY created_at ASC
    `;
    
    const extractedSlides: any[] = [];
    
    for (const message of messages) {
      try {
        // Check if message contains tool invocations
        const metadata = typeof message.metadata === 'string' 
          ? JSON.parse(message.metadata) 
          : message.metadata;
        
        if (metadata?.toolInvocations) {
          for (const invocation of metadata.toolInvocations) {
            if (invocation.toolName === 'editSlide' && invocation.result?.success && invocation.result?.slide) {
              const slide = invocation.result.slide;
              const slideNumber = invocation.result.slideNumber || extractedSlides.length + 1;
              
              // Create a slide image object similar to what's in slide_images table
              extractedSlides.push({
                id: `slide-${slideNumber}`,
                slide_id: slideNumber.toString(),
                slide_number: slideNumber,
                title: slide.title || `Slide ${slideNumber}`,
                content: slide.content || '',
                background_color: slide.backgroundColor || '#2c3e50',
                style: slide.style || 'modern',
                transition: slide.transition || 'slide',
                // For extracted slides, we don't have image data
                image_data: null,
                image_prompt: null,
                image_mime_type: null,
                created_at: slide.createdAt || new Date().toISOString(),
                updated_at: slide.updatedAt || new Date().toISOString()
              });
            }
          }
        }
      } catch (error) {
        console.error('Error parsing message metadata:', error);
      }
    }
    
    // Sort slides by slide number
    extractedSlides.sort((a, b) => a.slide_number - b.slide_number);
    
    return NextResponse.json({
      success: true,
      slides: extractedSlides,
      source: 'messages' // Indicate that slides were extracted from messages
    });
  } catch (error) {
    console.error('Error fetching slides:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch slides', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 
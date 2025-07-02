import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { z } from 'zod';

// Get database connection
const chatDbConnectionString = process.env.CHAT_DATABASE_URL;
if (!chatDbConnectionString) {
  throw new Error('CHAT_DATABASE_URL environment variable is not set!');
}
const sql = neon(chatDbConnectionString);

// Schema validation for incoming request
const SaveSlideImageSchema = z.object({
  slideId: z.string().describe('Slide identifier'),
  slideNumber: z.number().describe('Numeric slide position'),
  sessionId: z.string().optional().describe('Chat session ID'),
  userId: z.string().optional().describe('User ID'),
  title: z.string().describe('Slide title'),
  imagePrompt: z.string().describe('AI prompt used to generate the image'),
  imageData: z.string().describe('Base64 encoded image data'),
  imageMimeType: z.string().default('image/jpeg').describe('MIME type of the image'),
  imageWidth: z.number().optional().describe('Image width in pixels'),
  imageHeight: z.number().optional().describe('Image height in pixels'),
  backgroundColor: z.string().optional().describe('Slide background color'),
  style: z.string().optional().describe('Slide style'),
  transition: z.string().optional().describe('Slide transition type'),
  provider: z.string().optional().describe('AI provider used'),
  generationMetadata: z.record(z.any()).optional().describe('Additional metadata')
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate against our schema
    const validationResult = SaveSlideImageSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid slide image data', 
          details: validationResult.error.format() 
        },
        { status: 400 }
      );
    }
    
    const data = validationResult.data;
    
    // Log WebP compression info if available
    if (data.imageMimeType === 'image/webp' && data.generationMetadata?.originalFormat) {
      const imageSizeKB = Math.round(Buffer.from(data.imageData, 'base64').length / 1024);
      console.log(`💾 Saving WebP slide image:`, {
        slideId: data.slideId,
        originalFormat: data.generationMetadata.originalFormat,
        webpSizeKB: imageSizeKB,
        provider: data.provider,
        dimensions: `${data.imageWidth}x${data.imageHeight}`
      });
    }
    
    // Check if slide image with EXACT same prompt already exists
    const existingImage = await sql`
      SELECT id FROM slide_images 
      WHERE slide_id = ${data.slideId} 
      AND image_prompt = ${data.imagePrompt}
      AND (session_id = ${data.sessionId || null} OR session_id IS NULL)
      AND (user_id = ${data.userId || null} OR user_id IS NULL)
    `;
    
    if (existingImage && existingImage.length > 0) {
      // Update existing slide image ONLY if exact same prompt exists
      const result = await sql`
        UPDATE slide_images 
        SET 
          slide_number = ${data.slideNumber},
          title = ${data.title},
          image_data = ${data.imageData},
          image_mime_type = ${data.imageMimeType},
          image_width = ${data.imageWidth || null},
          image_height = ${data.imageHeight || null},
          background_color = ${data.backgroundColor || null},
          style = ${data.style || null},
          transition = ${data.transition || null},
          provider = ${data.provider || null},
          generation_metadata = ${JSON.stringify(data.generationMetadata || {})},
          updated_at = NOW()
        WHERE id = ${existingImage[0].id}
        RETURNING *
      `;
      
      return NextResponse.json({
        success: true,
        message: 'Slide image updated successfully (same prompt)',
        slideImage: result[0]
      });
    } else {
      // Insert new slide image
      const result = await sql`
        INSERT INTO slide_images (
          slide_id, slide_number, session_id, user_id, title, 
          image_prompt, image_data, image_mime_type, image_width, image_height,
          background_color, style, transition, provider, generation_metadata
        )
        VALUES (
          ${data.slideId}, ${data.slideNumber}, ${data.sessionId || null}, ${data.userId || null}, ${data.title},
          ${data.imagePrompt}, ${data.imageData}, ${data.imageMimeType}, ${data.imageWidth || null}, ${data.imageHeight || null},
          ${data.backgroundColor || null}, ${data.style || null}, ${data.transition || null}, ${data.provider || null}, ${JSON.stringify(data.generationMetadata || {})}
        )
        RETURNING *
      `;
      
      return NextResponse.json({
        success: true,
        message: 'New slide image version saved successfully',
        slideImage: result[0]
      }, { status: 201 });
    }
  } catch (error) {
    console.error('Error saving slide image:', error);
    return NextResponse.json(
      { 
        error: 'Failed to save slide image', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const userId = searchParams.get('userId');
    const slideId = searchParams.get('slideId');
    const imagePrompt = searchParams.get('imagePrompt');
    
    let result;
    
    if (slideId) {
      // Get specific slide image, optionally filtered by prompt
      if (imagePrompt) {
        result = await sql`
          SELECT * FROM slide_images 
          WHERE slide_id = ${slideId}
          AND image_prompt = ${imagePrompt}
          AND (session_id = ${sessionId || null} OR session_id IS NULL)
          AND (user_id = ${userId || null} OR user_id IS NULL)
          ORDER BY created_at DESC
          LIMIT 1
        `;
      } else {
        result = await sql`
          SELECT * FROM slide_images 
          WHERE slide_id = ${slideId}
          AND (session_id = ${sessionId || null} OR session_id IS NULL)
          AND (user_id = ${userId || null} OR user_id IS NULL)
          ORDER BY created_at DESC
          LIMIT 1
        `;
      }
    } else if (sessionId || userId) {
      // Get all slide images for session or user
      result = await sql`
        SELECT * FROM slide_images 
        WHERE (session_id = ${sessionId || null} OR session_id IS NULL)
        AND (user_id = ${userId || null} OR user_id IS NULL)
        ORDER BY slide_number ASC, created_at DESC
      `;
    } else {
      return NextResponse.json(
        { error: 'Either slideId, sessionId, or userId is required' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      slideImages: result
    });
  } catch (error) {
    console.error('Error fetching slide images:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch slide images', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 
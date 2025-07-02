import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import sharp from 'sharp';

// Store API keys in environment variables in production
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyDPtJ71_cTsq-WbvWKGOv8UxVpXIfkCR6E";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper function to convert image to WebP format
async function convertToWebP(base64Image: string, inputMimeType: string): Promise<{ base64: string; width: number; height: number }> {
  try {
    // Convert base64 to buffer
    const imageBuffer = Buffer.from(base64Image, 'base64');
    
    // Convert to WebP with high quality
    const webpBuffer = await sharp(imageBuffer)
      .webp({ 
        quality: 85, // High quality WebP
        effort: 4    // Good compression effort
      })
      .toBuffer();
    
    // Get image metadata
    const metadata = await sharp(webpBuffer).metadata();
    
    // Convert back to base64
    const webpBase64 = webpBuffer.toString('base64');
    
    console.log(`🔄 Converted ${inputMimeType} to WebP:`, {
      originalSize: imageBuffer.length,
      webpSize: webpBuffer.length,
      compressionRatio: ((imageBuffer.length - webpBuffer.length) / imageBuffer.length * 100).toFixed(1) + '%',
      dimensions: `${metadata.width}x${metadata.height}`
    });
    
    return {
      base64: webpBase64,
      width: metadata.width || 1536,
      height: metadata.height || 1024
    };
  } catch (error) {
    console.error('Error converting to WebP:', error);
    // Fallback: return original image
    return {
      base64: base64Image,
      width: inputMimeType.includes('1536') ? 1536 : 1408,
      height: inputMimeType.includes('1536') ? 1024 : 768
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { imagePrompt } = await request.json();

    if (!imagePrompt) {
      return NextResponse.json(
        { error: 'imagePrompt is required' },
        { status: 400 }
      );
    }

    // Try OpenAI first
    let response;
    try {
      console.log('Trying OpenAI first...');
      
      const openaiResponse = await openai.images.generate({
        model: "gpt-image-1",
        prompt: imagePrompt,
        n: 1,
        size: "1536x1024",
        quality: "medium"
      });

      if (openaiResponse.data && openaiResponse.data[0]) {
        const imageData = openaiResponse.data[0];
        
        if (imageData.b64_json) {
          // Convert OpenAI PNG to WebP
          const webpResult = await convertToWebP(imageData.b64_json, 'image/png');
          
          return NextResponse.json({
            success: true,
            image: {
              base64: webpResult.base64,
              mimeType: 'image/webp',
              width: webpResult.width,
              height: webpResult.height
            },
            provider: 'openai',
            originalFormat: 'png'
          });
        } else if (imageData.url) {
          // Fallback: fetch from URL if provided
          const imageUrl = imageData.url;
          const imageResponse = await fetch(imageUrl);
          const imageBuffer = await imageResponse.arrayBuffer();
          const base64Image = Buffer.from(imageBuffer).toString('base64');

          // Convert to WebP
          const webpResult = await convertToWebP(base64Image, 'image/png');

          return NextResponse.json({
            success: true,
            image: {
              base64: webpResult.base64,
              mimeType: 'image/webp',
              width: webpResult.width,
              height: webpResult.height
            },
            provider: 'openai',
            originalFormat: 'png'
          });
        }
      }
    } catch (openaiError: any) {
      console.error('OpenAI API Error:', openaiError);
      
      // Handle rate limiting specifically - try Gemini fallback
      if (openaiError.status === 429 || openaiError.message?.includes('quota') || openaiError.message?.includes('RESOURCE_EXHAUSTED')) {
        console.log('OpenAI rate limit hit, trying Gemini fallback...');
        
        try {
          // Initialize Google GenAI with the same approach as the working test
          const ai = new GoogleGenAI({
            apiKey: GEMINI_API_KEY,
          });

          // Try Gemini as fallback
          response = await ai.models.generateImages({
            model: 'models/imagen-4.0-ultra-generate-preview-06-06',
            prompt: imagePrompt,
            config: {
              numberOfImages: 1,
              outputMimeType: 'image/jpeg',
              aspectRatio: '16:9',
            },
          });

          if (response?.generatedImages && response.generatedImages.length > 0) {
            const imageData = response.generatedImages[0];
            
            // Check if image data exists
            if (!imageData?.image?.imageBytes) {
              return NextResponse.json(
                { error: 'No image data received from Gemini fallback' },
                { status: 500 }
              );
            }
            
            // Convert Gemini JPEG to WebP
            const webpResult = await convertToWebP(imageData.image.imageBytes, 'image/jpeg');
            
            return NextResponse.json({
              success: true,
              image: {
                base64: webpResult.base64,
                mimeType: 'image/webp',
                width: webpResult.width,
                height: webpResult.height
              },
              provider: 'gemini',
              originalFormat: 'jpeg'
            });
          }
        } catch (geminiError) {
          console.error('Gemini fallback also failed:', geminiError);
        }
        
        // If both APIs fail, return rate limit error
        return NextResponse.json(
          { 
            error: 'API rate limit exceeded. Please wait a moment and try again.',
            details: 'Both OpenAI and Gemini APIs are currently unavailable. Try generating fewer slides at once or wait before generating more.',
            retryAfter: 60 // Suggest waiting 60 seconds
          },
          { status: 429 }
        );
      }
      
      // Handle other OpenAI API errors - try Gemini fallback
      console.log('OpenAI failed with non-rate-limit error, trying Gemini fallback...');
      
      try {
        // Initialize Google GenAI
        const ai = new GoogleGenAI({
          apiKey: GEMINI_API_KEY,
        });

        // Try Gemini as fallback
        response = await ai.models.generateImages({
          model: 'models/imagen-4.0-ultra-generate-preview-06-06',
          prompt: imagePrompt,
          config: {
            numberOfImages: 1,
            outputMimeType: 'image/jpeg',
            aspectRatio: '16:9',
          },
        });

        if (response?.generatedImages && response.generatedImages.length > 0) {
          const imageData = response.generatedImages[0];
          
          // Check if image data exists
          if (!imageData?.image?.imageBytes) {
            return NextResponse.json(
              { error: 'No image data received from Gemini fallback' },
              { status: 500 }
            );
          }
          
          // Convert Gemini JPEG to WebP
          const webpResult = await convertToWebP(imageData.image.imageBytes, 'image/jpeg');
          
          return NextResponse.json({
            success: true,
            image: {
              base64: webpResult.base64,
              mimeType: 'image/webp',
              width: webpResult.width,
              height: webpResult.height
            },
            provider: 'gemini',
            originalFormat: 'jpeg'
          });
        }
      } catch (geminiError) {
        console.error('Gemini fallback also failed:', geminiError);
      }
      
      // Handle other API errors
      return NextResponse.json(
        { 
          error: 'Failed to generate image',
          details: openaiError.message || 'Unknown API error'
        },
        { status: 500 }
      );
    }

    // This shouldn't be reached, but just in case
    return NextResponse.json(
      { error: 'No image generated' },
      { status: 500 }
    );

  } catch (error) {
    console.error('Error generating slide image:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 
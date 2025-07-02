import { z } from 'zod';

export const youtubeTranscriptTool = {
  name: 'youtubeTranscript',
  description: 'Fetch transcript/captions for a YouTube video in a specified language',
  parameters: z.object({
    videoId: z.string().describe('The YouTube video ID (e.g., "8aGhZQkoFbQ")'),
    lang: z.string().default('en').describe('Language code for the transcript (e.g., "en", "es", "fr", "de", "ja", "ko", "zh-CN", etc.)'),
  }),
  execute: async ({ videoId, lang }: { videoId: string; lang: string }) => {
    const startTime = Date.now();
    
    console.log('YouTube Transcript tool called:', { videoId, lang });
    
    try {
      // Validate video ID format (basic check)
      if (!videoId || videoId.length < 5) {
        throw new Error('Invalid video ID format. Please provide a valid YouTube video ID.');
      }
      
      // Make the API request to YouTube Transcriptor service
      const response = await fetch(
        `https://youtube-transcriptor.p.rapidapi.com/transcript?video_id=${encodeURIComponent(videoId)}&lang=${encodeURIComponent(lang)}`,
        {
          method: 'GET',
          headers: {
            'x-rapidapi-host': 'youtube-transcriptor.p.rapidapi.com',
            'x-rapidapi-key': 'e6623326a6mshdc34ba8cecf8b23p17a021jsne72fd10d7336'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`YouTube Transcript API request failed with status ${response.status}`);
      }
      
      const result = await response.json();
      
      // Check if we got a valid transcript response
      if (Array.isArray(result) && result.length > 0 && result[0].transcription) {
        console.log('YouTube Transcript API response received for video:', videoId);
        
        // Add a formatted text version of the transcript for easier reading
        const videoData = result[0];
        const transcriptText = videoData.transcription
          .map((item: any) => `[${formatTime(item.start)}] ${item.subtitle}`)
          .join('\n');
        
        // Enhance the response with formatted transcript
        const enhancedResult = {
          ...videoData,
          formattedTranscript: transcriptText,
          _metadata: {
            videoId,
            requestedLang: lang,
            transcriptLang: lang,
            subtitleCount: videoData.transcription.length,
            duration: videoData.lengthInSeconds ? `${formatDuration(parseInt(videoData.lengthInSeconds))}` : 'Unknown'
          }
        };
        
        const executionTime = Date.now() - startTime;
        console.log(`YouTube transcript tool executed for video "${videoId}" in ${executionTime}ms`);
        
        return JSON.stringify(enhancedResult, null, 2);
      } else {
        throw new Error('No transcript available for this video in the requested language');
      }
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error(`YouTube transcript tool failed for video "${videoId}" after ${executionTime}ms:`, error);
      
      // Provide helpful error messages
      let errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('status 404')) {
        errorMessage = `Video not found or transcript not available. Please check the video ID "${videoId}" and try again.`;
      } else if (errorMessage.includes('status 400')) {
        errorMessage = `Invalid request. Please ensure the video ID "${videoId}" is correct and the language code "${lang}" is valid.`;
      }
      
      return `Error fetching transcript for video "${videoId}" in language "${lang}": ${errorMessage}. Available language codes include: en, es, fr, de, it, pt-BR, ru, ja, ko, zh-CN, zh-Hant, ar, hi, and others.`;
    }
  },
};

// Helper function to format time in MM:SS format
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Helper function to format duration in human-readable format
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
} 
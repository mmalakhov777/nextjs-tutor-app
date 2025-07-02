import { z } from 'zod';

export const searchVideosTool = {
  name: 'searchVideos',
  description: 'Search for videos using Google Serper API and return the raw response',
  parameters: z.object({
    query: z.string().describe('The search query for videos'),
  }),
  execute: async ({ query }: { query: string }) => {
    const startTime = Date.now();
    
    console.log('Video Search tool called:', { query });
    
    try {
      // Make the API request to Google Serper video search service
      const response = await fetch('https://google.serper.dev/videos', {
        method: 'POST',
        headers: {
          'X-API-KEY': '047dccc28f7397ee2aef996aab1a9e8e349c812a',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ q: query })
      });
      
      if (!response.ok) {
        throw new Error(`Video search API request failed with status ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Video Search API response received for:', query);
      
      const executionTime = Date.now() - startTime;
      console.log(`Video search tool executed for "${query}" in ${executionTime}ms`);
      
      // Return the raw response as JSON string
      return JSON.stringify(result, null, 2);
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error(`Video search tool failed for "${query}" after ${executionTime}ms:`, error);
      return `Error searching videos for "${query}": ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`;
    }
  },
}; 
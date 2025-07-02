import { z } from 'zod';

export const keywordsFinderTool = {
  name: 'keywordsFinder',
  description: 'Find keyword suggestions using Google Serper autocomplete API and return the raw response',
  parameters: z.object({
    query: z.string().describe('The partial keyword or phrase to get suggestions for'),
  }),
  execute: async ({ query }: { query: string }) => {
    const startTime = Date.now();
    
    console.log('Keywords Finder tool called:', { query });
    
    try {
      // Make the API request to Google Serper autocomplete service
      const response = await fetch('https://google.serper.dev/autocomplete', {
        method: 'POST',
        headers: {
          'X-API-KEY': '047dccc28f7397ee2aef996aab1a9e8e349c812a',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ q: query })
      });
      
      if (!response.ok) {
        throw new Error(`Autocomplete API request failed with status ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Keywords Finder API response received for:', query);
      
      const executionTime = Date.now() - startTime;
      console.log(`Keywords finder tool executed for "${query}" in ${executionTime}ms`);
      
      // Return the raw response as JSON string
      return JSON.stringify(result, null, 2);
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error(`Keywords finder tool failed for "${query}" after ${executionTime}ms:`, error);
      return `Error finding keywords for "${query}": ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`;
    }
  },
}; 
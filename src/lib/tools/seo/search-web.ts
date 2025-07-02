import { z } from 'zod';

export const searchWebTool = {
  name: 'searchWeb',
  description: 'Search the web using Google Serper API and return the raw response',
  parameters: z.object({
    query: z.string().describe('The search query'),
  }),
  execute: async ({ query }: { query: string }) => {
    const startTime = Date.now();
    
    console.log('Web Search tool called:', { query });
    
    try {
      // Make the API request to Google Serper search service
      const response = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': '047dccc28f7397ee2aef996aab1a9e8e349c812a',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ q: query })
      });
      
      if (!response.ok) {
        throw new Error(`Search API request failed with status ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Web Search API response received for:', query);
      
      const executionTime = Date.now() - startTime;
      console.log(`Web search tool executed for "${query}" in ${executionTime}ms`);
      
      // Return the raw response as JSON string
      return JSON.stringify(result, null, 2);
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error(`Web search tool failed for "${query}" after ${executionTime}ms:`, error);
      return `Error searching for "${query}": ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`;
    }
  },
}; 
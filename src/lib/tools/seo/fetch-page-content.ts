import { z } from 'zod';

export const fetchPageContentTool = {
  name: 'fetchPageContent',
  description: 'Fetch webpage content using Serper API and return the raw response',
  parameters: z.object({
    url: z.string().describe('The URL of the webpage to fetch'),
  }),
  execute: async ({ url }: { url: string }) => {
    const startTime = Date.now();
    
    console.log('Fetch Page Content tool called:', { url });
    
    try {
      // Validate URL format
      try {
        new URL(url);
      } catch {
        throw new Error('Invalid URL format. Please provide a valid URL starting with http:// or https://');
      }
      
      // Make the API request to Serper scraping service
      const response = await fetch('https://scrape.serper.dev', {
        method: 'POST',
        headers: {
          'X-API-KEY': '047dccc28f7397ee2aef996aab1a9e8e349c812a',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url })
      });
      
      if (!response.ok) {
        throw new Error(`Scraping API request failed with status ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Page Content API response received for:', url);
      
      const executionTime = Date.now() - startTime;
      console.log(`Page content tool executed for "${url}" in ${executionTime}ms`);
      
      // Return the raw response as JSON string
      return JSON.stringify(result, null, 2);
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error(`Page content tool failed for "${url}" after ${executionTime}ms:`, error);
      return `Error fetching page content from "${url}": ${error instanceof Error ? error.message : 'Unknown error'}. Please check the URL and try again.`;
    }
  },
}; 
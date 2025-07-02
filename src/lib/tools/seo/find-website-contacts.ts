import { z } from 'zod';

export const findWebsiteContactsTool = {
  name: 'findWebsiteContacts',
  description: 'Find contact information (emails, phone numbers, social media) from a website using RapidAPI website contacts scraper',
  parameters: z.object({
    query: z.string().describe('The website domain or URL to scrape for contacts (e.g., "example.com")'),
    matchEmailDomain: z.boolean().optional().describe('Whether to match email domain with the website domain').default(false),
    externalMatching: z.boolean().optional().describe('Whether to include external contact matching').default(false),
  }),
  execute: async ({ 
    query, 
    matchEmailDomain = false, 
    externalMatching = false 
  }: { 
    query: string; 
    matchEmailDomain?: boolean; 
    externalMatching?: boolean; 
  }) => {
    const startTime = Date.now();
    const maxRetries = 3;
    let lastError: Error | null = null;
    
    console.log('Find Website Contacts tool called:', { query, matchEmailDomain, externalMatching });
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempt ${attempt}/${maxRetries} for finding contacts: ${query}`);
        
        // Add random delay between 5-10 seconds to avoid rate limits with more randomness
        const delay = Math.floor(Math.random() * 5000) + 5000; // 5000-10000ms
        console.log(`Waiting ${delay}ms before making API request to avoid rate limits...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Construct the API URL with parameters
        const url = new URL('https://website-contacts-scraper.p.rapidapi.com/scrape-contacts');
        url.searchParams.append('query', query);
        url.searchParams.append('match_email_domain', matchEmailDomain.toString());
        url.searchParams.append('external_matching', externalMatching.toString());
        
        // Make the API request to RapidAPI website contacts scraper
        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            'x-rapidapi-host': 'website-contacts-scraper.p.rapidapi.com',
            'x-rapidapi-key': 'e6623326a6mshdc34ba8cecf8b23p17a021jsne72fd10d7336'
          }
        });
        
        if (!response.ok) {
          const errorMessage = `Website contacts API request failed with status ${response.status}`;
          
          // Check if it's a rate limit error (429) or server error (5xx)
          if (response.status === 429 || response.status >= 500) {
            throw new Error(`${errorMessage} (retryable)`);
          } else {
            // Client error (4xx) - don't retry
            throw new Error(`${errorMessage} (non-retryable)`);
          }
        }
        
        const result = await response.json();
        console.log('Website contacts API response received for:', query);
        
        const executionTime = Date.now() - startTime;
        console.log(`Find website contacts tool executed for "${query}" in ${executionTime}ms (including delay) - Success on attempt ${attempt}`);
        
        // Return the raw response as JSON string
        return JSON.stringify(result, null, 2);
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`Attempt ${attempt}/${maxRetries} failed for "${query}":`, lastError.message);
        
        // Don't retry for non-retryable errors
        if (lastError.message.includes('(non-retryable)')) {
          break;
        }
        
        // If this isn't the last attempt, wait before retrying with exponential backoff
        if (attempt < maxRetries) {
          const retryDelay = Math.pow(2, attempt) * 1000 + Math.random() * 1000; // Exponential backoff with jitter
          console.log(`Waiting ${retryDelay.toFixed(0)}ms before retry ${attempt + 1}...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }
    
    // All retries failed
    const executionTime = Date.now() - startTime;
    console.error(`Find website contacts tool failed for "${query}" after ${maxRetries} attempts in ${executionTime}ms:`, lastError);
    return `Error finding contacts for "${query}" after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}. Please try again later.`;
  },
}; 
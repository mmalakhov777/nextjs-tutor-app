import { z } from 'zod';

export const getTrafficAmountTool = {
  name: 'getTrafficAmount',
  description: 'Get website traffic data and analytics using SimilarWeb API via RapidAPI',
  parameters: z.object({
    domain: z.string().describe('The website domain to get traffic data for (e.g., "x.com", "google.com")'),
  }),
  execute: async ({ domain }: { domain: string }) => {
    const startTime = Date.now();
    const maxRetries = 3;
    let lastError: Error | null = null;
    
    console.log('Get Traffic Amount tool called:', { domain });
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempt ${attempt}/${maxRetries} for getting traffic data: ${domain}`);
        
        // Add random delay between 5-10 seconds to avoid rate limits with more randomness
        const delay = Math.floor(Math.random() * 5000) + 5000; // 5000-10000ms
        console.log(`Waiting ${delay}ms before making API request to avoid rate limits...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Construct the API URL with domain parameter
        const url = `https://similarweb-traffic.p.rapidapi.com/traffic?domain=${encodeURIComponent(domain)}`;
        
        // Make the API request to RapidAPI SimilarWeb traffic service
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'x-rapidapi-host': 'similarweb-traffic.p.rapidapi.com',
            'x-rapidapi-key': 'e6623326a6mshdc34ba8cecf8b23p17a021jsne72fd10d7336'
          }
        });
        
        if (!response.ok) {
          const errorMessage = `Traffic data API request failed with status ${response.status}`;
          
          // Check if it's a rate limit error (429) or server error (5xx)
          if (response.status === 429 || response.status >= 500) {
            throw new Error(`${errorMessage} (retryable)`);
          } else {
            // Client error (4xx) - don't retry
            throw new Error(`${errorMessage} (non-retryable)`);
          }
        }
        
        const result = await response.json();
        console.log('Traffic data API response received for:', domain);
        
        const executionTime = Date.now() - startTime;
        console.log(`Get traffic amount tool executed for "${domain}" in ${executionTime}ms (including delay) - Success on attempt ${attempt}`);
        
        // Return the raw response as JSON string
        return JSON.stringify(result, null, 2);
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`Attempt ${attempt}/${maxRetries} failed for "${domain}":`, lastError.message);
        
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
    console.error(`Get traffic amount tool failed for "${domain}" after ${maxRetries} attempts in ${executionTime}ms:`, lastError);
    return `Error getting traffic data for "${domain}" after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}. Please try again later.`;
  },
}; 
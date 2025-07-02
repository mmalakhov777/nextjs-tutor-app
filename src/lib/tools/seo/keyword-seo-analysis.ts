import { z } from 'zod';

export const keywordSeoAnalysisTool = {
  name: 'keywordSeoAnalysis',
  description: 'Analyze keyword SEO data and metrics using Semrush global volume data',
  parameters: z.object({
    keyword: z.string().describe('The keyword to analyze for SEO'),
  }),
  execute: async ({ keyword }: { keyword: string }) => {
    const startTime = Date.now();
    
    console.log('Keyword SEO Analysis tool called:', { keyword });
    
    // Function to generate similar keyword variations
    const generateKeywordVariations = (originalKeyword: string): string[] => {
      const variations = [];
      const words = originalKeyword.toLowerCase().split(' ');
      
      // Add the original keyword first
      variations.push(originalKeyword);
      
      // Add variations with different word orders (for multi-word keywords)
      if (words.length > 1) {
        variations.push(words.reverse().join(' '));
        
        // Add singular/plural variations
        const lastWord = words[words.length - 1];
        if (lastWord.endsWith('s') && lastWord.length > 3) {
          const singular = lastWord.slice(0, -1);
          variations.push([...words.slice(0, -1), singular].join(' '));
        } else if (!lastWord.endsWith('s')) {
          variations.push([...words.slice(0, -1), lastWord + 's'].join(' '));
        }
      }
      
      // Add variations with common synonyms/related terms
      const synonymMap: Record<string, string[]> = {
        'best': ['top', 'good', 'great'],
        'how to': ['guide', 'tutorial', 'learn'],
        'free': ['cheap', 'affordable', 'budget'],
        'online': ['digital', 'internet', 'web'],
        'software': ['tool', 'app', 'program'],
        'service': ['solution', 'platform', 'system']
      };
      
      for (const [word, synonyms] of Object.entries(synonymMap)) {
        if (originalKeyword.toLowerCase().includes(word)) {
          synonyms.forEach(synonym => {
            variations.push(originalKeyword.toLowerCase().replace(word, synonym));
          });
        }
      }
      
      // Remove duplicates and return first 5 variations
      return Array.from(new Set(variations)).slice(0, 5);
    };
    
    // Function to make API request for a single keyword
    const makeApiRequest = async (keywordToAnalyze: string): Promise<any> => {
      const encodedKeyword = encodeURIComponent(keywordToAnalyze);
      
      const response = await fetch(
        `https://semrush-keyword-magic-tool.p.rapidapi.com/global-volume?keyword=${encodedKeyword}`,
        {
          method: 'GET',
          headers: {
            'x-rapidapi-host': 'semrush-keyword-magic-tool.p.rapidapi.com',
            'x-rapidapi-key': 'e6623326a6mshdc34ba8cecf8b23p17a021jsne72fd10d7336'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      return await response.json();
    };
    
    try {
      // Generate keyword variations for retry attempts
      const keywordVariations = generateKeywordVariations(keyword);
      let lastError: Error | null = null;
      let result: any = null;
      let successfulKeyword: string = '';
      
      // Try each keyword variation
      for (let i = 0; i < keywordVariations.length; i++) {
        const currentKeyword = keywordVariations[i];
        
        try {
          console.log(`Attempting SEO analysis for keyword variation ${i + 1}/${keywordVariations.length}: "${currentKeyword}"`);
          
          // Add a small delay between retries (except for the first attempt)
          if (i > 0) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          
          result = await makeApiRequest(currentKeyword);
          successfulKeyword = currentKeyword;
          
          console.log(`SEO Analysis successful for keyword: "${currentKeyword}"`);
          break; // Success, exit the retry loop
          
        } catch (error) {
          lastError = error instanceof Error ? error : new Error('Unknown error');
          console.log(`SEO Analysis failed for keyword "${currentKeyword}": ${lastError.message}`);
          
          // Continue to next variation
          continue;
        }
      }
      
      // If all variations failed, throw the last error
      if (!result) {
        throw lastError || new Error('All keyword variations failed');
      }
      
      const executionTime = Date.now() - startTime;
      console.log(`SEO tool executed successfully for "${successfulKeyword}" in ${executionTime}ms`);
      
      // Add metadata about which keyword was successful and what variations were tried
      const responseWithMetadata = {
        ...result,
        _metadata: {
          originalKeyword: keyword,
          successfulKeyword: successfulKeyword,
          keywordVariationsTried: keywordVariations,
          executionTimeMs: executionTime
        }
      };
      
      return JSON.stringify(responseWithMetadata, null, 2);
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error(`SEO tool failed for all variations of "${keyword}" after ${executionTime}ms:`, error);
      
      const keywordVariations = generateKeywordVariations(keyword);
      return `Error analyzing keyword "${keyword}" and its variations (${keywordVariations.join(', ')}): ${error instanceof Error ? error.message : 'Unknown error'}. All ${keywordVariations.length} keyword variations were attempted. Please try a different keyword or check your API connection.`;
    }
  },
}; 
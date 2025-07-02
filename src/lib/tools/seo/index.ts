// Import all SEO tools
import { keywordSeoAnalysisTool } from './keyword-seo-analysis';
import { fetchPageContentTool } from './fetch-page-content';
import { searchWebTool } from './search-web';
import { keywordsFinderTool } from './keywords-finder';
import { searchVideosTool } from './search-videos';
import { youtubeTranscriptTool } from './youtube-transcript';
import { findWebsiteContactsTool } from './find-website-contacts';
import { getTrafficAmountTool } from './get-traffic-amount';

// Export individual tools
export {
  keywordSeoAnalysisTool,
  fetchPageContentTool,
  searchWebTool,
  keywordsFinderTool,
  searchVideosTool,
  youtubeTranscriptTool,
  findWebsiteContactsTool,
  getTrafficAmountTool,
};

// Export SEO tools collection (matching the previous structure)
export const SEO_AGENT_TOOLS = {
  keywordSeoAnalysis: keywordSeoAnalysisTool,
  fetchPageContent: fetchPageContentTool,
  searchWeb: searchWebTool,
  keywordsFinder: keywordsFinderTool,
  searchVideos: searchVideosTool,
  youtubeTranscript: youtubeTranscriptTool,
  findWebsiteContacts: findWebsiteContactsTool,
  getTrafficAmount: getTrafficAmountTool,
}; 
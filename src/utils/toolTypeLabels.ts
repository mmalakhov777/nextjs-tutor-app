/**
 * Map tool type names to human-friendly display labels
 */
export const toolTypeLabels: Record<string, string> = {
  // Writing tools
  'writeText': 'Content Writer',
  'editParagraph': 'Text Editor',
  'writeCv': 'CV Writer',
  
  // Research tools
  'searchWeb': 'Web Search',
  'fetchPageContent': 'Web Scraper',
  'findWebsiteContacts': 'Contact Finder',
  'keywordSeoAnalysis': 'SEO Analysis',
  'keywordsFinder': 'Keyword Research',
  'searchVideos': 'Video Search',
  'youtubeTranscript': 'YouTube Transcript',
  'getTrafficAmount': 'Traffic Analysis',
  
  // Educational tools
  'createFlashCard': 'Flashcards',
  'editFlashCard': 'Flashcards',
  'deleteFlashCard': 'Flashcards',
  
  // Presentation tools
  'editSlide': 'Presentations',
  'generateSlideImage': 'Image Generator',
  
  // Other tools
  'weather': 'Weather',
  'math': 'Calculator',
  
  // Default fallback
  'default': 'AI Tool'
};

/**
 * Get human-friendly label for a tool type
 */
export function getToolTypeLabel(toolType: string): string {
  return toolTypeLabels[toolType] || toolType
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
} 
// Import tools
import { weatherTool } from './weather';
import { mathTool } from './math';
import { writeTextTool } from './write-text';
import { cvWriterTool } from './cv-writer';
import { editSlideTool } from './edit-slide';
import { editParagraphTool } from './edit-paragraph';

// Export individual tools
export { weatherTool, mathTool, writeTextTool, cvWriterTool, editSlideTool, editParagraphTool };

// Export SEO tools from the SEO subdirectory
export { 
  SEO_AGENT_TOOLS,
  keywordSeoAnalysisTool,
  fetchPageContentTool,
  searchWebTool,
  keywordsFinderTool,
  searchVideosTool,
  youtubeTranscriptTool,
  findWebsiteContactsTool,
  getTrafficAmountTool
} from './seo';

// Export flashcard tools
export {
  FLASHCARD_TOOLS,
  createFlashCardTool,
  editFlashCardTool,
  deleteFlashCardTool
} from './flashcards';

// Import Lucide React icons
import { 
  CloudSun,           // Weather
  Calculator,         // Math
  PenTool,           // Write Text
  FileUser,          // CV Writer
  Presentation,      // Edit Slide
  Edit3,             // Edit Paragraph
  BarChart3,         // SEO Analysis
  Globe2,            // Fetch Page Content
  Search,            // Search Web
  Target,            // Keywords Finder
  PlayCircle,        // Search Videos
  Subtitles,         // YouTube Transcript
  AtSign,            // Find Website Contacts
  TrendingUp,        // Get Traffic Amount
  Brain,             // Create Flashcard
  Edit,              // Edit Flashcard
  Trash2,            // Delete Flashcard
  Wrench,            // Default fallback
  FileText,          // Text files
  Mail,              // Email/contacts
  Video              // Video content
} from 'lucide-react';

// Tool Icons Mapping - Each tool gets a unique icon
export const TOOL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  // General Assistant Tools
  'getWeather': CloudSun,
  'calculateMath': Calculator,
  
  // Content Writer Tools
  'writeText': PenTool,
  'editParagraph': Edit3,
  
  // CV Writer Tools
  'writeCv': FileUser,
  
  // Presentation Tools
  'editSlide': Presentation,
  
  // SEO Tools - Each gets unique icon
  'keywordSeoAnalysis': BarChart3,
  'fetchPageContent': Globe2,
  'searchWeb': Search,
  'keywordsFinder': Target,
  'searchVideos': PlayCircle,
  'youtubeTranscript': Subtitles,
  'findWebsiteContacts': AtSign,
  'getTrafficAmount': TrendingUp,
  
  // Flashcard Tools
  'createFlashCard': Brain,
  'editFlashCard': Edit,
  'deleteFlashCard': Trash2
};

// Helper function to get tool icon
export const getToolIcon = (toolName: string) => {
  return TOOL_ICONS[toolName] || Wrench;
};

// Helper function to format tool names for display
export const formatToolName = (toolName: string) => {
  return toolName
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .replace(/^./, str => str.toUpperCase());
};

// Sample Commands for each tool - helps users understand what they can do
export const TOOL_SAMPLE_COMMANDS: Record<string, string> = {
  // General Assistant Tools
  'getWeather': 'Get weather for New York',
  'calculateMath': 'Calculate 15% of 240',
  
  // Content Writer Tools
  'writeText': 'Write a blog post about AI',
  'editParagraph': 'Edit this paragraph for clarity',
  
  // CV Writer Tools
  'writeCv': 'Create a CV for software engineer',
  
  // Presentation Tools
  'editSlide': 'Create slide about market trends',
  
  // SEO Tools
  'keywordSeoAnalysis': 'Analyze SEO for my website',
  'fetchPageContent': 'Get content from example.com',
  'searchWeb': 'Search for latest AI news',
  'keywordsFinder': 'Find keywords for fitness blog',
  'searchVideos': 'Find videos about cooking',
  'youtubeTranscript': 'Get transcript from YouTube video',
  'findWebsiteContacts': 'Find contact info for company',
  'getTrafficAmount': 'Check traffic for my website',
  
  // Flashcard Tools
  'createFlashCard': 'Create flashcard about history',
  'editFlashCard': 'Edit existing flashcard',
  'deleteFlashCard': 'Delete old flashcard',
};

// Helper function to get sample command for a tool
export const getToolSampleCommand = (toolName: string) => {
  return TOOL_SAMPLE_COMMANDS[toolName] || `Use ${formatToolName(toolName)}`;
};

// Create tool collections for easy import
export const generalAssistantTools = {
  getWeather: weatherTool,
  calculateMath: mathTool,
};

export const contentWriterTools = {
  writeText: writeTextTool,
  editParagraph: editParagraphTool,
};

export const cvWriterTools = {
  writeCv: cvWriterTool,
};

export const presentationTools = {
  editSlide: editSlideTool,
}; 
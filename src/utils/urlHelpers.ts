import type { UploadedFile } from '@/types/chat';
import type { FileUploadStatus } from '@/components/chat/cards';

// Helper function to check if a URL is a YouTube video URL
export const isYouTubeUrl = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url);
    
    // Check for youtube.com with video parameter
    if (parsedUrl.hostname.includes('youtube.com')) {
      // Must have 'v' parameter for video ID
      return parsedUrl.searchParams.has('v') && parsedUrl.searchParams.get('v') !== '';
    }
    
    // Check for youtu.be format (shortened YouTube links)
    if (parsedUrl.hostname.includes('youtu.be')) {
      // For youtu.be, the video ID is in the pathname (e.g., youtu.be/VIDEO_ID)
      const pathname = parsedUrl.pathname;
      return pathname.length > 1 && pathname !== '/'; // Must have a video ID after the slash
    }
    
    return false;
  } catch {
    return false;
  }
};

// Helper function to check if a URL is a non-video YouTube URL (channel, playlist, user, etc.)
export const isNonVideoYouTubeUrl = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url);
    
    // Check if it's a YouTube domain
    if (!parsedUrl.hostname.includes('youtube.com') && !parsedUrl.hostname.includes('youtu.be')) {
      return false;
    }
    
    // If it's already a video URL, return false
    if (isYouTubeUrl(url)) {
      return false;
    }
    
    // Check for common non-video YouTube paths
    const pathname = parsedUrl.pathname.toLowerCase();
    const nonVideoPatterns = [
      '/c/', // Channel URLs like /c/ChannelName
      '/channel/', // Channel URLs like /channel/CHANNEL_ID
      '/user/', // User URLs like /user/username
      '/@', // Handle URLs like /@username
      '/playlist', // Playlist URLs
      '/results', // Search results
      '/feed/', // Feed URLs
      '/trending', // Trending page
      '/gaming', // Gaming page
      '/music', // Music page
      '/sports', // Sports page
      '/learning', // Learning page
    ];
    
    // Check if the pathname starts with any non-video pattern
    return nonVideoPatterns.some(pattern => pathname.includes(pattern));
  } catch {
    return false;
  }
};

// Function to extract URLs from text
export const extractUrlsFromText = (text: string): string[] => {
  const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/gi;
  const matches = text.match(urlRegex);
  if (!matches) return [];
  
  // Clean each URL and remove duplicates
  const cleanedUrls = matches.map(url => cleanUrl(url)).filter(url => url.length > 0);
  return [...new Set(cleanedUrls)];
};

// Function to clean URLs by removing unwanted characters
export const cleanUrl = (url: string): string => {
  // Remove common unwanted characters that might be included when copying URLs
  let cleaned = url.trim();
  
  // Remove NUL characters (0x00) that can cause backend errors
  cleaned = cleaned.replace(/\x00/g, '');
  
  // Remove other control characters that might cause issues
  cleaned = cleaned.replace(/[\x00-\x1F\x7F]/g, '');
  
  // Remove brackets, parentheses, and other punctuation from the end
  cleaned = cleaned.replace(/[)\]}>.,;:!?'"]*$/, '');
  
  // Remove brackets, parentheses from the beginning
  cleaned = cleaned.replace(/^[(<\[{'"]*/, '');
  
  // Remove any trailing periods, commas, or other punctuation
  cleaned = cleaned.replace(/[.,;:!?]*$/, '');
  
  // Remove any markdown link syntax like [text](url) - extract just the URL
  const markdownMatch = cleaned.match(/\[.*?\]\((https?:\/\/[^)]+)\)/);
  if (markdownMatch) {
    cleaned = markdownMatch[1];
  }
  
  // Remove any remaining unwanted characters at the end
  cleaned = cleaned.replace(/[)\]}>]*$/, '');
  
  // Final cleanup: ensure no invisible or problematic characters remain
  cleaned = cleaned.replace(/[\u200B-\u200D\uFEFF]/g, ''); // Remove zero-width characters
  
  return cleaned;
};

// Function to normalize URLs for comparison
export const normalizeUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    // Remove trailing slash, convert to lowercase, remove www
    let normalized = urlObj.href.toLowerCase().replace(/\/$/, '');
    normalized = normalized.replace(/^https?:\/\/www\./, urlObj.protocol + '//');
    return normalized;
  } catch {
    return url.toLowerCase().trim();
  }
};

// Function to check if a URL is already in the session
export const isUrlAlreadyInSession = (
  url: string, 
  uploadedFiles: UploadedFile[], 
  fileUploads: FileUploadStatus[]
): boolean => {
  const normalizedUrl = normalizeUrl(url);
  
  // Check in uploaded files - multiple ways
  const inUploadedFiles = uploadedFiles.some(file => {
    // Direct URL match
    if (file.url && normalizeUrl(file.url) === normalizedUrl) {
      return true;
    }
    
    // Check metadata for original_url
    if (file.metadata && typeof file.metadata === 'object') {
      const metadata = file.metadata as any;
      if (metadata.original_url && normalizeUrl(metadata.original_url) === normalizedUrl) {
        return true;
      }
      if (metadata.url && normalizeUrl(metadata.url) === normalizedUrl) {
        return true;
      }
    }
    
    // Check if it's a link source with matching URL
    if (file.source === 'link' && file.url && normalizeUrl(file.url) === normalizedUrl) {
      return true;
    }
    
    return false;
  });
  
  // Check in current uploads
  const inCurrentUploads = fileUploads.some(upload => {
    if (upload.url && normalizeUrl(upload.url) === normalizedUrl) {
      return true;
    }
    return false;
  });
  
  // NEW: Check in local storage for previously processed links
  let inLocalStorage = false;
  try {
    const storedMetadata = localStorage.getItem('uploadedFilesMetadata');
    if (storedMetadata) {
      const metadataObj = JSON.parse(storedMetadata);
      
      for (const [fileId, fileData] of Object.entries(metadataObj)) {
        const file = fileData as any;
        
        // Check direct URL match
        if (file.url && normalizeUrl(file.url) === normalizedUrl) {
          inLocalStorage = true;
          break;
        }
        
        // Check if it's a link source with matching URL
        if (file.source === 'link' && file.url && normalizeUrl(file.url) === normalizedUrl) {
          inLocalStorage = true;
          break;
        }
        
        // Check metadata if it exists
        if (file.metadata && typeof file.metadata === 'object') {
          const metadata = file.metadata;
          if (metadata.original_url && normalizeUrl(metadata.original_url) === normalizedUrl) {
            inLocalStorage = true;
            break;
          }
          if (metadata.url && normalizeUrl(metadata.url) === normalizedUrl) {
            inLocalStorage = true;
            break;
          }
        }
      }
    }
  } catch (error) {
    // Silent error handling
  }
  
  // Additional check: look for the domain in file names (for edge cases)
  let domainInFiles = false;
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace(/^www\./, '');
    
    domainInFiles = uploadedFiles.some(file => {
      // Check if file name contains the domain (for web pages)
      if (file.source === 'link' && file.name && file.name.includes(domain)) {
        return true;
      }
      return false;
    });
    
    // Also check localStorage for domain matches
    if (!domainInFiles) {
      try {
        const storedMetadata = localStorage.getItem('uploadedFilesMetadata');
        if (storedMetadata) {
          const metadataObj = JSON.parse(storedMetadata);
          for (const [fileId, fileData] of Object.entries(metadataObj)) {
            const file = fileData as any;
            if (file.source === 'link' && file.name && file.name.includes(domain)) {
              domainInFiles = true;
              break;
            }
          }
        }
      } catch (error) {
        // Silent error handling
      }
    }
  } catch {
    // Invalid URL, continue with other checks
  }
  
  const result = inUploadedFiles || inCurrentUploads || inLocalStorage || domainInFiles;
  
  return result;
}; 
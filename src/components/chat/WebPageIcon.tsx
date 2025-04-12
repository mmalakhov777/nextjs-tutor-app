import { useState } from 'react';
import { Globe } from 'lucide-react';
import type { UploadedFile } from '@/types/chat';

export const WebPageIcon = ({ file }: { file: UploadedFile }) => {
  const [faviconLoaded, setFaviconLoaded] = useState(false);
  
  // Get domain either from metadata (preferred) or try to extract from URL
  const getDomain = () => {
    if (file.metadata?.domain) {
      return file.metadata.domain;
    }
    
    if (file.metadata?.base_url) {
      try {
        const urlObj = new URL(file.metadata.base_url);
        return urlObj.hostname;
      } catch {
        // Fall through to URL parsing
      }
    }
    
    if (file.url) {
      try {
        const urlObj = new URL(file.url);
        return urlObj.hostname;
      } catch {
        // Return null if we can't parse the URL
      }
    }
    
    return null;
  };
  
  const domain = getDomain();
  
  if (!domain) {
    return <Globe className="h-3 w-3 text-blue-500" />;
  }
  
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}`;
  
  return (
    <>
      <img 
        src={faviconUrl} 
        alt="" 
        width={12} 
        height={12} 
        className="h-3 w-3 object-contain" 
        onLoad={() => setFaviconLoaded(true)}
        onError={() => setFaviconLoaded(false)}
        style={{ display: faviconLoaded ? 'block' : 'none' }}
      />
      {!faviconLoaded && <Globe className="h-3 w-3 text-blue-500" />}
    </>
  );
}; 
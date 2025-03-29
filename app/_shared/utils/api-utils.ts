import { getBaseUrlFromWindowLocation } from './url-utils';

export const getApiEndpoint = (path: string): string => {
  // Remove leading slash if exists
  const normalizedPath = path.startsWith('/') ? path.substring(1) : path;
  
  // For server-side requests or if real backend is disabled
  // Allows fall back to mock implementation
  const useRealBackend = process.env.NEXT_PUBLIC_USE_REAL_BACKEND === 'true';
  
  if (!useRealBackend) {
    // Use mock API inside the Next.js app
    return `/api/${normalizedPath}`;
  }
  
  // In browser
  if (typeof window !== 'undefined') {
    // Check if we're in production (Vercel)
    const isProduction = 
      window.location.hostname !== 'localhost' && 
      !window.location.hostname.includes('127.0.0.1');
    
    // In production, always use the proxy to avoid CORS issues
    if (isProduction) {
      return `/api/proxy/${normalizedPath}`;
    }
    
    // In development, direct call to backend
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (backendUrl) {
      return `${backendUrl}/api/${normalizedPath}`;
    }
  }
  
  // Server-side rendering or fallback
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
  return `${backendUrl}/api/${normalizedPath}`;
};

// Headers to add to fetch requests
export const getApiHeaders = (): HeadersInit => {
  // If we're in the browser and making a request to the backend through Next.js proxy
  if (typeof window !== 'undefined') {
    const isProduction = 
      window.location.hostname !== 'localhost' && 
      !window.location.hostname.includes('127.0.0.1');
    
    if (isProduction) {
      // For internal Next.js API routes to know they should proxy to backend
      return {
        'x-proxy-to-backend': 'true',
        'Content-Type': 'application/json',
      };
    }
  }
  
  // Default headers
  return {
    'Content-Type': 'application/json',
  };
};

// For browser-specific functions
export const getBrowserApiEndpoint = (path: string): string => {
  // Remove leading slash if exists
  const normalizedPath = path.startsWith('/') ? path.substring(1) : path;
  
  // Only used in browser contexts
  if (typeof window === 'undefined') {
    throw new Error('getBrowserApiEndpoint should only be called in browser contexts');
  }
  
  const useRealBackend = process.env.NEXT_PUBLIC_USE_REAL_BACKEND === 'true';
  if (!useRealBackend) {
    // Use mock API inside the Next.js app
    return `${getBaseUrlFromWindowLocation()}/api/${normalizedPath}`;
  }
  
  // Check if we're in production (Vercel)
  const isProduction = 
    window.location.hostname !== 'localhost' && 
    !window.location.hostname.includes('127.0.0.1');
  
  // In production, always use the proxy to avoid CORS issues
  if (isProduction) {
    return `${getBaseUrlFromWindowLocation()}/api/proxy/${normalizedPath}`;
  }
  
  // In development, direct call to backend
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (backendUrl) {
    return `${backendUrl}/api/${normalizedPath}`;
  }
  
  // Fallback
  return `${getBaseUrlFromWindowLocation()}/api/${normalizedPath}`;
}; 
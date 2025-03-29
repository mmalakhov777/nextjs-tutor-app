/**
 * Utility functions for URL handling
 */

/**
 * Gets the base URL from window.location
 * Useful for client-side only code
 */
export const getBaseUrlFromWindowLocation = (): string => {
  if (typeof window === 'undefined') {
    throw new Error('getBaseUrlFromWindowLocation should only be called in browser contexts');
  }
  
  const { protocol, host } = window.location;
  return `${protocol}//${host}`;
}; 
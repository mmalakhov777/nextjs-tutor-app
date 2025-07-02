/**
 * Debug utilities for tracking initialization issues in the app
 */

// Store the original fetch function to restore it later
let originalFetch;

/**
 * Logs information about the app's initialization state
 */
export function logInitializationState() {
  console.log('====== APP INITIALIZATION STATE ======');
  console.log('User ID:', getUserIdFromUrl());
  console.log('Conversation ID:', getConversationIdFromUrl());
  console.log('LocalStorage msd_user_id:', localStorage.getItem('msd_user_id'));
  console.log('Vector Store IDs in localStorage:', getVectorStoreIdsFromLocalStorage());
  console.log('====================================');
}

/**
 * Simulate slow network requests by adding delay to all fetch calls
 * @param {number} delayMs - The delay in milliseconds to add to each fetch call
 * @returns {Function} - A function to restore the original fetch behavior
 */
export function simulateSlowNetwork(delayMs = 2000) {
  if (!originalFetch) {
    originalFetch = window.fetch;
  }
  
  console.log(`[DEBUG] Simulating slow network with ${delayMs}ms delay`);
  
  window.fetch = async function(...args) {
    const url = args[0]?.toString() || 'unknown';
    console.log(`[DEBUG] Fetch call to: ${url} (delayed by ${delayMs}ms)`);
    
    // Add delay to the request
    await new Promise(resolve => setTimeout(resolve, delayMs));
    
    // Call the original fetch
    return originalFetch.apply(this, args);
  };
  
  return restoreNetwork;
}

/**
 * Restore the original fetch behavior after simulating network conditions
 */
export function restoreNetwork() {
  if (originalFetch) {
    console.log('[DEBUG] Restoring original network behavior');
    window.fetch = originalFetch;
    originalFetch = null;
  }
}

/**
 * Simulate inconsistent vector store initialization by clearing localStorage data
 */
export function simulateInconsistentVectorStore() {
  console.log('[DEBUG] Simulating inconsistent vector store state');
  
  // Get all localStorage keys related to vector stores
  const vectorStoreKeys = Object.keys(localStorage).filter(key => 
    key.startsWith('fileMap_') || key.includes('vectorStore')
  );
  
  // Backup existing data
  const backup = {};
  vectorStoreKeys.forEach(key => {
    backup[key] = localStorage.getItem(key);
  });
  
  // Clear the related localStorage items
  vectorStoreKeys.forEach(key => {
    localStorage.removeItem(key);
    console.log(`[DEBUG] Removed localStorage key: ${key}`);
  });
  
  // Return a function to restore the data
  return () => {
    console.log('[DEBUG] Restoring vector store data');
    Object.entries(backup).forEach(([key, value]) => {
      localStorage.setItem(key, value);
    });
  };
}

/**
 * Get the user ID from the URL query parameters
 * @returns {string|null} - The user ID or null if not found
 */
function getUserIdFromUrl() {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return params.get('user_id');
}

/**
 * Get the conversation ID from the URL query parameters
 * @returns {string|null} - The conversation ID or null if not found
 */
function getConversationIdFromUrl() {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return params.get('conversation_id');
}

/**
 * Get all vector store IDs stored in localStorage
 * @returns {string[]} - Array of vector store IDs
 */
function getVectorStoreIdsFromLocalStorage() {
  if (typeof window === 'undefined') return [];
  
  return Object.keys(localStorage)
    .filter(key => key.startsWith('fileMap_'))
    .map(key => key.replace('fileMap_', ''));
}

// Make the helpers available in the browser console for debugging
if (typeof window !== 'undefined') {
  window.debugHelpers = {
    logInitializationState,
    simulateSlowNetwork,
    restoreNetwork,
    simulateInconsistentVectorStore
  };
} 
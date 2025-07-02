'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Debug logger
const debugLog = (message: string, data?: any) => {
  console.log(`[LandingPage] ${message}`, data || '');
};

// Function to get user ID from MSD
async function getUserId(): Promise<string | null> {
  debugLog("Starting getUserId process...");
  // Check if window is defined (client-side)
  if (typeof window !== "undefined") {
    try {
      // Log the entire MSD object
      debugLog("Full MSD object:", window.MSD);
      debugLog("MSD available methods:", window.MSD ? Object.keys(window.MSD) : "MSD not available");
      
      let hasValidToken = false;
      let msdId = null;
      
      // Try each method to see what's available and working
      if (window.MSD) {
        // Try getUser
        if (typeof window.MSD.getUser === 'function') {
          try {
            // Use type assertion to avoid TypeScript errors
            const userResponse = await (window.MSD as any).getUser();
            debugLog("MSD.getUser() result:", userResponse);
            
            // If user has an ID in the user object, use it
            if (userResponse?.user?.id) {
              return userResponse.user.id;
            }
          } catch (e) {
            console.error("Error calling MSD.getUser():", e);
          }
        }
        
        // Try getMsdId - get this first to use immediately
        if (typeof (window.MSD as any).getMsdId === 'function') {
          try {
            const msdIdResponse = await (window.MSD as any).getMsdId();
            debugLog("MSD.getMsdId() result:", msdIdResponse);
            if (msdIdResponse && msdIdResponse.msdId) {
              msdId = msdIdResponse.msdId;
              debugLog("Got MSD ID immediately:", msdId);
              // Store the MSD ID in localStorage right away
              localStorage.setItem('msd_user_id', msdId);
            }
          } catch (e) {
            console.error("Error calling MSD.getMsdId():", e);
          }
        }
        
        // Try getToken - check if user is already authenticated
        if (typeof (window.MSD as any).getToken === 'function') {
          try {
            const tokenResponse = await (window.MSD as any).getToken();
            debugLog("MSD.getToken() result:", tokenResponse);
            // Check if we have a valid token
            if (tokenResponse && tokenResponse.token) {
              hasValidToken = true;
              debugLog("User has a valid MSD token - properly authenticated");
            } else {
              debugLog("No valid token found - user is not properly authenticated");
            }
          } catch (e) {
            console.error("Error calling MSD.getToken():", e);
          }
        }
        
        // Try getMsdVisitId
        if (typeof (window.MSD as any).getMsdVisitId === 'function') {
          try {
            const visitIdResponse = await (window.MSD as any).getMsdVisitId();
            debugLog("MSD.getMsdVisitId() result:", visitIdResponse);
          } catch (e) {
            console.error("Error calling MSD.getMsdVisitId():", e);
          }
        }
      }
      
      // If we have an MSD ID, use it right away for chat session
      if (msdId) {
        debugLog("Using MSD ID for immediate chat session creation:", msdId);
        
        // Start the token check and auth process in parallel if not authenticated
        if (!hasValidToken && window.MSD && typeof (window.MSD as any).openAuthDialog === 'function') {
          debugLog("Starting parallel auth process - will show dialog after 20 seconds");
          
          // Start this process in parallel without awaiting
          (async () => {
            try {
              // Wait 20 seconds before showing auth dialog
              await new Promise(resolve => setTimeout(resolve, 20000));
              debugLog("20-second delay completed, opening auth dialog now");
              
              // Check token again before showing auth dialog
              let stillNeedsAuth = true;
              if (window.MSD && typeof (window.MSD as any).getToken === 'function') {
                try {
                  const tokenCheckResult = await (window.MSD as any).getToken();
                  if (tokenCheckResult && tokenCheckResult.token) {
                    debugLog("Token check after delay: User now has valid token, no need for auth dialog");
                    stillNeedsAuth = false;
                  }
                } catch (e) {
                  console.error("Error checking token after delay:", e);
                }
              }
              
              if (stillNeedsAuth && window.MSD && typeof (window.MSD as any).openAuthDialog === 'function') {
                await (window.MSD as any).openAuthDialog({
                  isClosable: false, // Make dialog not closable
                  type: "alt2",
                  shouldVerifyAuthRetrieval: true,
                  onClose: () => {
                    debugLog("Auth dialog was closed (this should not happen with isClosable:false)");
                  }
                });
                debugLog("Auth dialog completed");
              
                // Token check after auth dialog
                if (window.MSD && typeof (window.MSD as any).getToken === 'function') {
                  const tokenResponse = await (window.MSD as any).getToken();
                  debugLog("MSD.getToken() after auth result:", tokenResponse);
                  if (tokenResponse && tokenResponse.token) {
                    debugLog("User now has valid token after authentication");
                  } else {
                    debugLog("Still no valid token after authentication");
                  }
                }
              }
            } catch (e) {
              console.error("Error in parallel auth process:", e);
            }
          })();
          
          // Return the MSD ID immediately without waiting for auth to complete
          return msdId;
        }
        
        // If we already have a token, just return the MSD ID
        return msdId;
      }
      
      // If no MSD ID, check localStorage
      const storedUserId = localStorage.getItem('msd_user_id');
      if (storedUserId) {
        debugLog("Using stored user ID from localStorage:", storedUserId);
        return storedUserId;
      }
    } catch (error) {
      console.error("Error in MSD authentication flow:", error);
    }
  } else {
    debugLog("Window not defined (server-side rendering)");
  }
  
  // Fall back to generating a random ID if all else fails
  debugLog("Falling back to generating a random user ID");
  const timestamp = Date.now();
  const randomPart = Math.random().toString(36).substring(2, 10);
  const userId = `${timestamp}-${randomPart}`;
  debugLog("Generated random user ID:", userId);
  
  // Store the generated ID in localStorage for future use
  if (typeof window !== "undefined") {
    localStorage.setItem('msd_user_id', userId);
    debugLog("Stored generated user ID in localStorage");
  }
  
  return userId;
}

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    debugLog("Landing page mounted, preparing to redirect to chat");
    
    // Create async function to handle the redirect
    const handleRedirect = async () => {
      try {
        // Wait longer to ensure MSD is properly initialized
        await new Promise(resolve => setTimeout(resolve, 800));
        debugLog("Initial delay complete, proceeding with user ID retrieval");
        
        // Get current URL parameters
        const currentParams = new URLSearchParams(window.location.search);
        
        // Get user ID from MSD or fallback
        const userId = await getUserId();
        debugLog("User ID resolved:", userId);
        
        // If user_id is not already in the URL, add it
        if (!currentParams.has('user_id') && userId) {
          currentParams.set('user_id', userId);
        }
        
        // Redirect to the chat page with all parameters preserved
        const targetUrl = `/chat?${currentParams.toString()}`;
        debugLog("Redirecting to:", targetUrl);
        router.push(targetUrl);
      } catch (error) {
        console.error("Error during redirect:", error);
        debugLog("Error during redirect, using fallback ID");
        // Still try to redirect even if there's an error
        const fallbackId = Date.now().toString();
        const currentParams = new URLSearchParams(window.location.search);
        if (!currentParams.has('user_id')) {
          currentParams.set('user_id', fallbackId);
        }
        router.push(`/chat?${currentParams.toString()}`);
      }
    };
    
    // Call the async function
    handleRedirect();
  }, [router]);

  // Return a loading state while the redirect happens
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg">
        <p className="text-gray-600 text-sm">Loading...</p>
      </div>
    </div>
  );
}

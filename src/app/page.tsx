'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import '@/types/msd'; // Import global MSD type definitions

// Function to get user ID from MSD
async function getUserId(): Promise<string | null> {
  console.log("Starting getUserId process...");
  // Check if window is defined (client-side)
  if (typeof window !== "undefined") {
    try {
      // Log the entire MSD object
      console.log("Full MSD object:", window.MSD);
      console.log("MSD available methods:", window.MSD ? Object.keys(window.MSD) : "MSD not available");
      
      let hasValidToken = false;
      let msdId = null;
      
      // Try each method to see what's available and working
      if (window.MSD) {
        // Try getUser
        if (typeof window.MSD.getUser === 'function') {
          try {
            const user = window.MSD.getUser();
            console.log("MSD.getUser() result:", user);
          } catch (e) {
            console.error("Error calling MSD.getUser():", e);
          }
        }
        
        // Try getMsdId - get this first to use immediately
        if (typeof window.MSD.getMsdId === 'function') {
          try {
            const msdIdResponse = await window.MSD.getMsdId();
            console.log("MSD.getMsdId() result:", msdIdResponse);
            if (msdIdResponse && msdIdResponse.msdId) {
              msdId = msdIdResponse.msdId;
              console.log("Got MSD ID immediately:", msdId);
              // Store the MSD ID in localStorage right away
              localStorage.setItem('msd_user_id', msdId);
            }
          } catch (e) {
            console.error("Error calling MSD.getMsdId():", e);
          }
        }
        
        // Try getToken - check if user is already authenticated
        if (typeof window.MSD.getToken === 'function') {
          try {
            const tokenResponse = await window.MSD.getToken();
            console.log("MSD.getToken() result:", tokenResponse);
            // Check if we have a valid token
            if (tokenResponse && tokenResponse.token) {
              hasValidToken = true;
              console.log("User has a valid MSD token - properly authenticated");
            } else {
              console.log("No valid token found - user is not properly authenticated");
            }
          } catch (e) {
            console.error("Error calling MSD.getToken():", e);
          }
        }
        
        // Try getMsdVisitId
        if (typeof window.MSD.getMsdVisitId === 'function') {
          try {
            const visitIdResponse = await window.MSD.getMsdVisitId();
            console.log("MSD.getMsdVisitId() result:", visitIdResponse);
          } catch (e) {
            console.error("Error calling MSD.getMsdVisitId():", e);
          }
        }
      }
      
      // If we have an MSD ID, use it right away for chat session
      if (msdId) {
        console.log("Using MSD ID for immediate chat session creation:", msdId);
        
        // Start the token check and auth process in parallel if not authenticated
        if (!hasValidToken && window.MSD && window.MSD.openAuthDialog) {
          console.log("Starting parallel auth process - will show dialog after 20 seconds");
          
          // Start this process in parallel without awaiting
          (async () => {
            try {
              // Wait 20 seconds before showing auth dialog
              await new Promise(resolve => setTimeout(resolve, 20000));
              console.log("20-second delay completed, opening auth dialog now");
              
              // Check token again before showing auth dialog
              let stillNeedsAuth = true;
              if (window.MSD && typeof window.MSD.getToken === 'function') {
                try {
                  const tokenCheckResult = await window.MSD.getToken();
                  if (tokenCheckResult && tokenCheckResult.token) {
                    console.log("Token check after delay: User now has valid token, no need for auth dialog");
                    stillNeedsAuth = false;
                  }
                } catch (e) {
                  console.error("Error checking token after delay:", e);
                }
              }
              
              if (stillNeedsAuth && window.MSD && typeof window.MSD.openAuthDialog === 'function') {
                await window.MSD.openAuthDialog({
                  isClosable: false, // Make dialog not closable
                  type: "alt2",
                  shouldVerifyAuthRetrieval: true,
                  onClose: () => {
                    console.log("Auth dialog was closed (this should not happen with isClosable:false)");
                  }
                });
                console.log("Auth dialog completed");
              
                // Token check after auth dialog
                if (window.MSD && typeof window.MSD.getToken === 'function') {
                  const tokenResponse = await window.MSD.getToken();
                  console.log("MSD.getToken() after auth result:", tokenResponse);
                  if (tokenResponse && tokenResponse.token) {
                    console.log("User now has valid token after authentication");
                  } else {
                    console.log("Still no valid token after authentication");
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
        console.log("Using stored user ID from localStorage:", storedUserId);
        return storedUserId;
      }
    } catch (error) {
      console.error("Error in MSD authentication flow:", error);
    }
  } else {
    console.log("Window not defined (server-side rendering)");
  }
  
  // Fall back to generating a random ID if all else fails
  console.log("Falling back to generating a random user ID");
  const timestamp = Date.now();
  const randomPart = Math.random().toString(36).substring(2, 10);
  const userId = `${timestamp}-${randomPart}`;
  console.log("Generated random user ID:", userId);
  
  // Store the generated ID in localStorage for future use
  if (typeof window !== "undefined") {
    localStorage.setItem('msd_user_id', userId);
    console.log("Stored generated user ID in localStorage");
  }
  
  return userId;
}

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Create async function to handle the redirect
    const handleRedirect = async () => {
      try {
        // Wait longer to ensure MSD is properly initialized
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Get user ID from MSD or fallback
        const userId = await getUserId();
        
        // Redirect to the chat page with the user ID
        router.push(`/chat?user_id=${userId}`);
      } catch (error) {
        console.error("Error during redirect:", error);
        // Still try to redirect even if there's an error
        const fallbackId = Date.now().toString();
        router.push(`/chat?user_id=${fallbackId}`);
      }
    };
    
    // Call the async function
    handleRedirect();
  }, [router]);

  // Return a loading state while the redirect happens
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg">
        <p className="text-gray-600 text-sm">Loading...</p>
      </div>
    </div>
  );
}

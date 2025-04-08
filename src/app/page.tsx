'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Define MSD types to fix TypeScript errors
declare global {
  interface Window {
    MSD?: {
      getUser: () => { id: string } | null;
      getToken: () => Promise<{ token: string }>;
      getMsdId: () => Promise<{ msdId: string }>;
      getMsdVisitId: () => Promise<{ msdVisitId: string }>;
      sendAmpEvent: (event: string, data?: any) => void;
      historyReplace: (url: string, options?: { preferAppRouter?: boolean }) => void;
      openAuthDialog: (options: {
        isClosable?: boolean;
        shouldVerifyAuthRetrieval?: boolean;
        type?: string;
        onClose?: () => void;
      }) => Promise<void>;
      historyPush: (url: string, options?: { preferAppRouter?: boolean }) => Promise<void>;
    };
  }
}

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
        
        // Try getMsdId
        if (typeof window.MSD.getMsdId === 'function') {
          try {
            const msdIdResponse = await window.MSD.getMsdId();
            console.log("MSD.getMsdId() result:", msdIdResponse);
            if (msdIdResponse && msdIdResponse.msdId) {
              msdId = msdIdResponse.msdId;
            }
          } catch (e) {
            console.error("Error calling MSD.getMsdId():", e);
          }
        }
        
        // Try getToken - crucial for checking valid authentication
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
      
      // Check if we have both MSD ID and a valid token - only then consider the user properly authenticated
      if (msdId && hasValidToken) {
        console.log("User is properly authenticated with valid token and MSD ID:", msdId);
        localStorage.setItem('msd_user_id', msdId);
        return msdId;
      }
      
      // If we have an MSD ID but no token, we need to authenticate
      if (msdId && !hasValidToken) {
        console.log("User has MSD ID but no valid token - needs authentication");
      }
      
      // Check localStorage for previously authenticated user
      const storedUserId = localStorage.getItem('msd_user_id');
      // Only use stored ID if we confirm we have a valid token
      if (storedUserId && hasValidToken) {
        console.log("Using stored authenticated user ID from localStorage:", storedUserId);
        return storedUserId;
      }
      
      // If we reach here, we need to authenticate via dialog
      if (window.MSD && window.MSD.openAuthDialog) {
        console.log("User needs authentication - waiting 20 seconds before showing auth dialog");
        
        // Wait 20 seconds before showing auth dialog
        await new Promise(resolve => setTimeout(resolve, 20000));
        
        console.log("20-second delay completed, opening auth dialog now");
        try {
          await window.MSD.openAuthDialog({
            isClosable: false, // Make dialog not closable
            type: "alt2",
            shouldVerifyAuthRetrieval: true,
            onClose: () => {
              console.log("Auth dialog was closed (this should not happen with isClosable:false)");
            }
          });
          console.log("Auth dialog completed");
          
          // Log the MSD object again to see if anything changed after auth
          console.log("MSD object after auth:", window.MSD);
          
          // Check for token again after auth
          let hasTokenAfterAuth = false;
          let msdIdAfterAuth = null;
          
          if (window.MSD && typeof window.MSD.getToken === 'function') {
            try {
              const tokenResponse = await window.MSD.getToken();
              console.log("MSD.getToken() after auth result:", tokenResponse);
              if (tokenResponse && tokenResponse.token) {
                hasTokenAfterAuth = true;
                console.log("User now has valid token after authentication");
              } else {
                console.log("Still no valid token after authentication");
              }
            } catch (e) {
              console.error("Error getting token after auth:", e);
            }
          }
          
          // Try to get MSD ID after auth dialog
          if (window.MSD && window.MSD.getMsdId) {
            const msdIdResponse = await window.MSD.getMsdId();
            console.log("MSD getMsdId after auth result:", msdIdResponse);
            if (msdIdResponse && msdIdResponse.msdId) {
              msdIdAfterAuth = msdIdResponse.msdId;
              console.log("Got MSD ID after auth:", msdIdAfterAuth);
            }
          }
          
          // Only proceed if we have both valid token and MSD ID after auth
          if (hasTokenAfterAuth && msdIdAfterAuth) {
            console.log("Successfully authenticated user with valid token and MSD ID");
            localStorage.setItem('msd_user_id', msdIdAfterAuth);
            return msdIdAfterAuth;
          }
          
          console.log("Authentication was not successful - no valid token obtained");
          
        } catch (e) {
          console.error("Error during auth dialog:", e);
        }
      } else {
        console.log("MSD auth dialog not available");
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

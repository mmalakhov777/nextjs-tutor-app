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
      // Try to get MSD ID if available (this is the preferred approach)
      if (window.MSD && window.MSD.getMsdId) {
        console.log("MSD API available, attempting to get MSD ID...");
        const msdIdResponse = await window.MSD.getMsdId();
        console.log("MSD getMsdId result:", msdIdResponse);
        
        if (msdIdResponse && msdIdResponse.msdId) {
          console.log("Successfully got MSD ID:", msdIdResponse.msdId);
          // Store the MSD ID in localStorage for consistency
          localStorage.setItem('msd_user_id', msdIdResponse.msdId);
          return msdIdResponse.msdId;
        } else {
          console.log("MSD getMsdId returned no valid data");
        }
      } else {
        // Fall back to legacy getUser method
        if (window.MSD && typeof window.MSD.getUser === 'function') {
          console.log("Trying legacy MSD.getUser method...");
          const user = window.MSD.getUser();
          console.log("MSD getUser result:", user);
          if (user && user.id) {
            console.log("Successfully got user ID from MSD.getUser:", user.id);
            localStorage.setItem('msd_user_id', user.id);
            return user.id;
          }
        }
        
        console.log("MSD API or required methods not available");
      }
      
      // If still here, we couldn't get a user directly - check localStorage before trying auth
      const storedUserId = localStorage.getItem('msd_user_id');
      if (storedUserId) {
        console.log("Using stored user ID from localStorage:", storedUserId);
        return storedUserId;
      }
      
      // If still no user ID, try the auth dialog if available
      if (window.MSD && window.MSD.openAuthDialog) {
        console.log("Attempting to open MSD auth dialog...");
        try {
          await window.MSD.openAuthDialog({
            isClosable: true,
            type: "alt2",
            shouldVerifyAuthRetrieval: true,
            onClose: () => {
              console.log("Auth dialog was closed by user");
            }
          });
          console.log("Auth dialog completed");
          
          // Try again to get MSD ID after auth dialog
          if (window.MSD && window.MSD.getMsdId) {
            const msdIdResponse = await window.MSD.getMsdId();
            if (msdIdResponse && msdIdResponse.msdId) {
              console.log("Successfully got MSD ID after auth:", msdIdResponse.msdId);
              localStorage.setItem('msd_user_id', msdIdResponse.msdId);
              return msdIdResponse.msdId;
            }
          }
          
          // Fall back to legacy method again
          if (window.MSD && typeof window.MSD.getUser === 'function') {
            const user = window.MSD.getUser();
            if (user && user.id) {
              console.log("Successfully got user ID after auth:", user.id);
              localStorage.setItem('msd_user_id', user.id);
              return user.id;
            }
          }
          
          console.log("Failed to get user ID after auth dialog");
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

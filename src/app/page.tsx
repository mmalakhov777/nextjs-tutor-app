'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Define MSD types to fix TypeScript errors
declare global {
  interface Window {
    MSD?: {
      getUser: () => { id: string } | null;
      openAuthDialog?: (options: {
        isClosable?: boolean;
        shouldVerifyAuthRetrieval?: boolean;
        type?: string;
        onClose?: () => void;
      }) => Promise<void>;
    };
  }
}

// Function to get user ID from MSD
async function getUserId(): Promise<string | null> {
  console.log("Starting getUserId process...");
  // Check if window is defined (client-side)
  if (typeof window !== "undefined") {
    // Try to get user ID from MSD if available
    if (window.MSD && typeof window.MSD.getUser === 'function') {
      try {
        console.log("MSD API available, attempting to get user...");
        // This method might be asynchronous, but we need to handle it in a sync context
        const user = window.MSD.getUser();
        console.log("MSD getUser result:", user);
        if (user && user.id) {
          console.log("Successfully got user ID from MSD:", user.id);
          // Store the MSD user ID in localStorage for consistency
          localStorage.setItem('msd_user_id', user.id);
          return user.id;
        } else {
          console.log("MSD getUser returned no valid user data");
        }
      } catch (e) {
        console.error("Error getting MSD user:", e);
      }
    } else {
      console.log("MSD API or getUser method not available");
    }
    
    // If we're here, we couldn't get a user from MSD directly
    // Try the auth flow if available
    if (window.MSD && window.MSD.openAuthDialog) {
      try {
        console.log("Attempting to open MSD auth dialog...");
        
        let authCompleted = false;
        
        // Set up a timeout to prevent waiting indefinitely
        const timeoutPromise = new Promise<void>((_, reject) => {
          setTimeout(() => {
            if (!authCompleted) {
              console.log("Auth dialog timeout - proceeding with fallback");
              reject(new Error("Auth dialog timeout"));
            }
          }, 10000); // 10 second timeout
        });
        
        const authPromise = window.MSD.openAuthDialog({
          isClosable: true, // Allow dialog to be closed
          shouldVerifyAuthRetrieval: false, // Try setting this to false
          type: "alt2",
          onClose: () => {
            console.log("Auth dialog was closed by user");
            authCompleted = true;
          }
        });
        
        // Race between auth and timeout
        try {
          await Promise.race([authPromise, timeoutPromise]);
          console.log("Auth dialog completed");
        } catch (error) {
          console.log("Auth dialog failed or timed out:", error);
        }
        
        // Wait a moment to ensure auth process is fully complete
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // After auth dialog, try to get the user again
        if (window.MSD && typeof window.MSD.getUser === 'function') {
          console.log("Trying to get user ID after auth dialog");
          const user = window.MSD.getUser();
          console.log("MSD getUser after auth result:", user);
          if (user && user.id) {
            console.log("Successfully got user ID after auth:", user.id);
            // Store the MSD user ID in localStorage for consistency
            localStorage.setItem('msd_user_id', user.id);
            return user.id;
          } else {
            console.log("Failed to get user ID after auth dialog");
          }
        }
      } catch (e) {
        console.error("Error opening auth dialog:", e);
      }
    } else {
      console.log("MSD auth dialog not available");
    }
    
    // Only check localStorage after trying MSD auth
    // Check for user ID in localStorage as fallback
    const storedUserId = localStorage.getItem('msd_user_id');
    if (storedUserId) {
      console.log("Using stored user ID from localStorage:", storedUserId);
      return storedUserId;
    } else {
      console.log("No user ID found in localStorage");
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

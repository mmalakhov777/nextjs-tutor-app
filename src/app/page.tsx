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
        initialWindow?: string;
        oauth2Redirect?: string;
        oauth2OpenInNewTab?: boolean;
      }) => Promise<void>;
    };
  }
}

// Function to get user ID from MSD
async function getUserId(): Promise<string | null> {
  // Check if window is defined (client-side)
  if (typeof window !== "undefined") {
    // Try to get user ID from MSD if available
    if (window.MSD && typeof window.MSD.getUser === 'function') {
      try {
        // This method might be asynchronous, but we need to handle it in a sync context
        const user = window.MSD.getUser();
        if (user && user.id) {
          return user.id;
        }
      } catch (e) {
        console.error("Error getting MSD user:", e);
      }
    }
    
    // Check for user ID in localStorage as fallback
    const storedUserId = localStorage.getItem('msd_user_id');
    if (storedUserId) {
      return storedUserId;
    }
    
    // If still no user ID, open auth dialog
    if (window.MSD && window.MSD.openAuthDialog) {
      try {
        await window.MSD.openAuthDialog({
          isClosable: false,
          initialWindow: 'signup',
          oauth2Redirect: '/chat',
          oauth2OpenInNewTab: false,
        });
        
        // After auth dialog, try to get the user again
        if (window.MSD && typeof window.MSD.getUser === 'function') {
          const user = window.MSD.getUser();
          if (user && user.id) {
            return user.id;
          }
        }
      } catch (e) {
        console.error("Error opening auth dialog:", e);
      }
    }
  }
  
  // Fall back to generating a random ID if all else fails
  const timestamp = Date.now();
  const randomPart = Math.random().toString(36).substring(2, 10);
  const userId = `${timestamp}-${randomPart}`;
  
  // Store the generated ID in localStorage for future use
  if (typeof window !== "undefined") {
    localStorage.setItem('msd_user_id', userId);
  }
  
  return userId;
}

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Create async function to handle the redirect
    const handleRedirect = async () => {
      try {
        // Wait a moment to ensure MSD is initialized
        await new Promise(resolve => setTimeout(resolve, 300));
        
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
        <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">
          Loading...
        </h1>
        <div className="flex justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
        </div>
      </div>
    </div>
  );
}

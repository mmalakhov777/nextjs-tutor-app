'use client';

import Home from '@/app/home';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

// Define type for vector store info
type VectorStoreInfo = {
  id: string;
  fileCount?: number;
  type?: string;
} | null;

export default function ChatPage() {
  const [searchParams, setSearchParams] = useState('');
  const [vectorStoreInfo, setVectorStoreInfo] = useState<VectorStoreInfo>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isInitializationComplete, setIsInitializationComplete] = useState(false);

  // Get URL query parameters when the component mounts
  useEffect(() => {
    const params = window.location.search;
    setSearchParams(params);
    
    // Extract parameters from query string
    const urlParams = new URLSearchParams(params);
    const vectorStoreId = urlParams.get('vector_store_id');
    const userId = urlParams.get('user_id');
    const conversationId = urlParams.get('conversation_id');
    
    // Check if user_id is missing
    if (!userId) {
      setShowErrorModal(true);
      setIsInitializing(false);
      return;
    }
    
    // If we have a user ID but no conversation ID, Home component will handle the initialization
    if (userId && !conversationId) {
      setIsInitializing(true);
    } else {
      // If we already have a conversation ID, we're not initializing
      setIsInitializing(false);
      setIsInitializationComplete(true);
    }
    
    if (vectorStoreId) {
      // Set basic vector store info from URL
      setVectorStoreInfo({
        id: vectorStoreId,
        type: 'File Search Vector Store'
      });
      
      // You could also fetch additional info about the vector store here
      // fetchVectorStoreInfo(vectorStoreId);
    }
  }, []);

  // Function to handle when initialization is complete
  const handleInitializationComplete = () => {
    console.log("Initialization complete");
    setIsInitializing(false);
    setIsInitializationComplete(true);
  };

  return (
    <>
      <Home 
        vectorStoreInfoFromUrl={vectorStoreInfo} 
        onInitializationComplete={handleInitializationComplete}
      />
      
      {/* Error Modal for Missing User ID */}
      {showErrorModal && (
        <div className="fixed inset-0 bg-[#232323] bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Error</h3>
            <p className="text-gray-600 mb-6">
              Unable to initialize chat. Please try refreshing the page or contact support if the problem persists.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      )}
    </>
  );
} 
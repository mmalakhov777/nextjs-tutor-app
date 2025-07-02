'use client';

import React from 'react';
import Lottie from 'lottie-react';
import mainSceneAnimation from '../../../Main Scene.json';

interface ScenarioGeneratingLoaderProps {
  showLeftSidebar?: boolean;
  showRightSidebar?: boolean;
}

export function ScenarioGeneratingLoader({
  showLeftSidebar,
  showRightSidebar
}: ScenarioGeneratingLoaderProps) {
  // Function to calculate padding based on sidebar states (same as ChatInput.tsx and ScenarioCommandsInput.tsx)
  const calculatePadding = (showLeftSidebar?: boolean, showRightSidebar?: boolean) => {
    // Base vertical padding: 20px top, 10px bottom (increased for more spacing)
    const verticalPadding = 'pt-[20px] pb-[10px]';
    
    // If AgentsSidebar (right sidebar) is open, use very minimal padding to maximize chat space
    if (showRightSidebar) {
      return `${verticalPadding} px-1 sm:px-2 md:px-3 lg:px-4 xl:px-5 2xl:px-6`;
    }
    // If only FileSidebar (left sidebar) is open, use medium padding
    else if (showLeftSidebar) {
      return `${verticalPadding} px-6 sm:px-24 md:px-32 lg:px-40 xl:px-48 2xl:px-56`;
    }
    // If no sidebars are open, use more padding for better spacing
    else {
      return `${verticalPadding} px-8 sm:px-32 md:px-48 lg:px-64 xl:px-80 2xl:px-96`;
    }
  };

  return (
    <div className={`bg-transparent w-full relative z-[200] ${calculatePadding(showLeftSidebar, showRightSidebar)}`}>
      <div
        style={{
          display: 'flex',
          padding: '20px',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          alignSelf: 'stretch',
          borderRadius: '16px',
          border: '1px solid var(--Monochrome-Light, #E8E8E5)',
          background: 'var(--Monochrome-White, #FFF)',
          boxShadow: '0px 0px 20px 0px rgba(203, 203, 203, 0.20)',
          minHeight: '120px'
        }}
      >
        {/* Lottie Animation */}
        <div className="relative">
          <div className="w-60 h-60">
            <Lottie 
              animationData={mainSceneAnimation}
              loop={true}
              autoplay={true}
              style={{ width: '100%', height: '100%' }}
            />
          </div>
        </div>
        
        {/* Loading text */}
        <div className="mt-4 text-center">
          <p className="text-lg font-medium text-slate-900">
            Generating Multi-Agent Scenario
          </p>
        </div>
        
        {/* Progress dots */}
        <div className="flex gap-1 mt-3">
          <div 
            className="w-1.5 h-1.5 rounded-full bg-[#70D6FF]"
            style={{ animation: 'bounce 1.4s infinite ease-in-out both' }}
          />
          <div 
            className="w-1.5 h-1.5 rounded-full bg-[#70D6FF]"
            style={{ animation: 'bounce 1.4s infinite ease-in-out both', animationDelay: '0.16s' }}
          />
          <div 
            className="w-1.5 h-1.5 rounded-full bg-[#70D6FF]"
            style={{ animation: 'bounce 1.4s infinite ease-in-out both', animationDelay: '0.32s' }}
          />
        </div>
      </div>
      
      {/* Add animation styles */}
      <style jsx>{`
        @keyframes bounce {
          0%, 80%, 100% {
            transform: scale(0);
            opacity: 0.5;
          }
          40% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
} 
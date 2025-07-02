'use client';

import React, { useRef, useEffect } from 'react';
import { ChevronDown, X, Pause, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SpinnerIcon } from '@/components/icons/SpinnerIcon';
import { PlayIcon } from '@/components/icons/PlayIcon';
import { EditIcon } from '@/components/icons/EditIcon';
import { CheckIcon } from '@/components/icons/CheckIcon';
import type { ScenarioData, ScenarioStep } from '@/types/scenarios';
import { 
  getAgentCircleColor, 
  getAgentTextColor, 
  getDisplayAgentName 
} from '@/lib/agents';

interface ScenarioProgressBlockProps {
  // Common props
  title: string;
  description: string;
  steps: ScenarioStep[];
  currentStep?: number;
  completedSteps?: number[];
  isProcessing?: boolean;
  
  // Generation mode props
  isGenerating?: boolean;
  
  // Minimal mode - shows only progress bar
  minimalMode?: boolean;
  
  // Expanded/collapsed state
  isExpanded?: boolean;
  onToggleExpanded?: () => void;
  
  // Progress bar props
  showProgressBar?: boolean;
  progressPercent?: number;
  animateProgress?: boolean;
  
  // Action buttons
  primaryButton?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    loading?: boolean;
    icon?: React.ReactNode;
    variant?: 'primary' | 'secondary';
  };
  
  secondaryButtons?: Array<{
    label: string;
    onClick: () => void;
    disabled?: boolean;
    loading?: boolean;
    icon?: React.ReactNode;
    showText?: boolean;
  }>;
  
  // Time estimate
  timeEstimate?: string;
  
  // Auto-play state
  isAutoPlayActive?: boolean;
  autoPlayCountdown?: number;
  
  // Custom icon for header
  headerIcon?: React.ReactNode;
  
  // Show close button in expanded view
  showCloseButton?: boolean;
  onClose?: () => void;
}

export function ScenarioProgressBlock({
  title,
  description,
  steps,
  currentStep = 0,
  completedSteps = [],
  isProcessing = false,
  isGenerating = false,
  minimalMode = false,
  isExpanded = false,
  onToggleExpanded,
  showProgressBar = true,
  progressPercent,
  animateProgress = false,
  primaryButton,
  secondaryButtons = [],
  timeEstimate,
  isAutoPlayActive = false,
  autoPlayCountdown = 0,
  headerIcon,
  showCloseButton = false,
  onClose
}: ScenarioProgressBlockProps) {
  
  // Ref for auto-scroll functionality
  const stepsContainerRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom when new steps are added during generation
  useEffect(() => {
    if (isGenerating && stepsContainerRef.current && steps.length > 0) {
      const scrollToBottom = () => {
        if (stepsContainerRef.current) {
          stepsContainerRef.current.scrollTo({
            top: stepsContainerRef.current.scrollHeight,
            behavior: 'smooth'
          });
        }
      };
      
      // Use a small delay to ensure DOM has updated
      const timeoutId = setTimeout(scrollToBottom, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [steps.length, isGenerating]);
  
  // Calculate progress if not provided
  const calculatedProgress = progressPercent !== undefined 
    ? progressPercent 
    : steps.length > 0 
      ? (completedSteps.length / steps.length) * 100
      : 0;
  
  // Get current step data
  const currentStepData = steps[currentStep];
  
  // Determine header icon - no agent icons
  const displayHeaderIcon = headerIcon || null;
  
  // If minimal mode, show only progress bar
  if (minimalMode) {
    return (
      <div className="bg-transparent w-full relative z-[200]">
        <div
          style={{
            display: 'flex',
            padding: '12px',
            flexDirection: 'column',
            alignItems: 'flex-start',
            alignSelf: 'stretch',
            borderRadius: '16px',
            border: '1px solid var(--Monochrome-Light, #E8E8E5)',
            background: 'var(--Monochrome-White, #FFF)',
            boxShadow: '0px 0px 20px 0px rgba(203, 203, 203, 0.20)',
            minHeight: '40px' // Maintain minimum height for empty container
          }}
        >
          {/* Empty container - no content during generation */}
        </div>
      </div>
    );
  }
  
  // Regular mode with all elements
  return (
    <div className="bg-transparent w-full relative z-[200]">
      <div
        style={{
          display: 'flex',
          padding: '12px',
          flexDirection: 'column',
          alignItems: 'flex-start',
          alignSelf: 'stretch',
          borderRadius: '16px',
          border: '1px solid var(--Monochrome-Light, #E8E8E5)',
          background: 'var(--Monochrome-White, #FFF)',
          boxShadow: '0px 0px 20px 0px rgba(203, 203, 203, 0.20)'
        }}
      >
        {/* Compact header */}
        <div className="w-full">
          {/* Progress bar section */}
          <div className="w-full">
            {/* Step title and agent icon in same line */}
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                {displayHeaderIcon}
                <h3 className="font-semibold text-slate-900" style={{ fontSize: '16px' }}>{title}</h3>
              </div>
              {/* Toggle or close button */}
              {isExpanded && showCloseButton && onClose ? (
                <button
                  onClick={onClose}
                  className="flex items-center justify-center w-5 h-5 rounded-full hover:bg-gray-100 transition-colors ml-2"
                  title="Close"
                >
                  <X className="h-3.5 w-3.5 text-gray-500" />
                </button>
              ) : onToggleExpanded ? (
                <button
                  onClick={onToggleExpanded}
                  className="flex items-center justify-center w-6 h-6 rounded-full hover:bg-gray-100 transition-colors"
                  title="Toggle details"
                >
                  <ChevronDown 
                    className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${
                      isExpanded ? 'transform rotate-180' : ''
                    }`} 
                  />
                </button>
              ) : null}
            </div>
            
            {/* Progress bar */}
            {showProgressBar && (
              <div className="relative w-full mb-3">
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="h-3 rounded-full transition-all duration-300 ease-out relative"
                    style={{
                      background: 'var(--Blue-Normal, #70D6FF)',
                      width: `${calculatedProgress}%`,
                      animation: animateProgress ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none'
                    }}
                  />
                </div>
              </div>
            )}
            
            {/* Description */}
            {description && (
              <p className="text-slate-600 mb-3" style={{ fontSize: '14px' }}>
                {description}
              </p>
            )}
            
            {/* Show steps if expanded or generating */}
            {(isExpanded || isGenerating) && steps.length > 0 && (
              <div
                ref={stepsContainerRef}
                style={{
                  display: 'flex',
                  padding: '16px',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: '16px',
                  alignSelf: 'stretch',
                  borderRadius: '12px',
                  background: 'rgba(248, 248, 243, 0.50)',
                  marginBottom: '12px',
                  maxHeight: '300px', // Limit height
                  overflowY: 'auto', // Make scrollable
                  overflowX: 'hidden'
                }}
                className="custom-scrollbar"
              >
                {steps.map((step: any, stepIdx: number) => (
                  <div 
                    key={stepIdx}
                    className="flex items-center gap-2"
                  >
                    <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center">
                      {/* Step status indicator */}
                      {!isGenerating && stepIdx === currentStep ? (
                        isProcessing ? (
                          <SpinnerIcon />
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" fill="#70D6FF"/>
                            <circle cx="12" cy="12" r="4" fill="white"/>
                          </svg>
                        )
                      ) : !isGenerating && completedSteps.includes(stepIdx) ? (
                        <CheckIcon />
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="4" fill="#E8E8E5"/>
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <span 
                        style={{
                          color: 'var(--Monochrome-Black-Hover, #3C3C3C)',
                          fontFamily: 'Inter',
                          fontSize: '14px',
                          fontStyle: 'normal',
                          fontWeight: 500,
                          lineHeight: '20px'
                        }}
                      >
                        {step.title || `Step ${stepIdx + 1}`}
                      </span>
                      {((isExpanded && stepIdx === currentStep) || isGenerating) && step.description && (
                        <div 
                          className="mt-1"
                          style={{
                            color: 'var(--Monochrome-Black-Hover, #3C3C3C)',
                            fontFamily: 'Inter',
                            fontSize: '12px',
                            fontStyle: 'normal',
                            fontWeight: 400,
                            lineHeight: '16px',
                            opacity: 0.7
                          }}
                        >
                          {step.description}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Control buttons */}
            <div className="flex items-center gap-2 min-w-0">
              {/* Primary button */}
              {primaryButton && (
                <Button
                  onClick={primaryButton.onClick}
                  disabled={primaryButton.disabled}
                  size="sm"
                  className="text-xs flex-shrink-0"
                  style={{
                    display: 'flex',
                    padding: '8px 12px',
                    alignItems: 'center',
                    gap: '4px',
                    borderRadius: '8px',
                    background: primaryButton.variant === 'secondary' 
                      ? 'var(--Monochrome-White, #FFF)'
                      : (isAutoPlayActive || isProcessing) 
                        ? 'var(--Blue-Normal, #70D6FF)' 
                        : 'var(--Monochrome-Black, #232323)',
                    color: primaryButton.variant === 'secondary'
                      ? 'var(--Monochrome-Black, #232323)'
                      : (isAutoPlayActive || isProcessing) 
                        ? 'var(--Monochrome-Black, #232323)' 
                        : 'white',
                    fontSize: '14px',
                    fontWeight: 500,
                    border: primaryButton.variant === 'secondary' 
                      ? '1px solid var(--Monochrome-Light, #E8E8E5)' 
                      : 'none',
                    height: '36px'
                  }}
                >
                  {primaryButton.loading ? (
                    <SpinnerIcon className="h-3 w-3 flex-shrink-0" />
                  ) : primaryButton.icon}
                  <span className="whitespace-nowrap">
                    {isAutoPlayActive && autoPlayCountdown > 0 
                      ? `Next step in ${autoPlayCountdown}s` 
                      : primaryButton.label}
                  </span>
                </Button>
              )}
              
              {/* Secondary buttons */}
              {!isAutoPlayActive && !isProcessing && secondaryButtons.map((button, idx) => (
                <Button
                  key={idx}
                  onClick={button.onClick}
                  disabled={button.disabled}
                  size="sm"
                  className="text-xs flex-shrink-0 group"
                  style={{
                    display: 'flex',
                    padding: button.showText ? '8px 12px' : '8px',
                    alignItems: 'center',
                    gap: '4px',
                    borderRadius: '8px',
                    border: '1px solid var(--Monochrome-Light, #E8E8E5)',
                    background: 'var(--Monochrome-White, #FFF)',
                    color: 'var(--Monochrome-Black, #232323)',
                    fontSize: '14px',
                    fontWeight: 500,
                    height: '36px',
                    minWidth: '36px'
                  }}
                >
                  {button.loading ? (
                    <SpinnerIcon className="h-3 w-3 animate-spin flex-shrink-0" />
                  ) : button.icon}
                  {button.showText && <span className="whitespace-nowrap">{button.label}</span>}
                </Button>
              ))}
              
              {/* Spacer */}
              <div className="flex-1 min-w-0"></div>
              
              {/* Time estimate */}
              {timeEstimate && (
                <div 
                  className="flex items-center gap-1 text-xs flex-shrink-0"
                  style={{
                    color: 'var(--Monochrome-Medium, #6B6B69)',
                    fontSize: '14px',
                    fontWeight: 400
                  }}
                >
                  {timeEstimate}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Add styles for animations and custom scrollbar */}
      <style jsx>{`
        ${animateProgress ? `
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.5;
            }
          }
        ` : ''}
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #E8E8E5;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #D0D0D0;
        }
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #E8E8E5 transparent;
        }
      `}</style>
    </div>
  );
} 
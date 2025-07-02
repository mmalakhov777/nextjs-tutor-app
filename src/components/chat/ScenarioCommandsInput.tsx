'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Check, Sparkles, ChevronDown, X, Play, Pause, Save, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingIndicator } from '@/components/chat/LoadingIndicator';
import { SpinnerIcon } from '@/components/icons/SpinnerIcon';
import { PlayIcon } from '@/components/icons/PlayIcon';
import { EditIcon } from '@/components/icons/EditIcon';
import { CheckIcon } from '@/components/icons/CheckIcon';
import { BookmarkIcon } from '@/components/icons/BookmarkIcon';
import { ScenarioProgressBlock } from '@/components/chat/ScenarioProgressBlock';
import { ScenarioGeneratingLoader } from '@/components/chat/ScenarioGeneratingLoader';
import type { ScenarioData, ScenarioAction, ScenarioStep } from '@/types/scenarios';
import { 
  getAgentCircleColor, 
  getAgentTextColor, 
  getDisplayAgentName 
} from '@/lib/agents';

interface ScenarioCommandsInputProps {
  scenario: ScenarioData;
  currentStep: number;
  completedSteps: number[];
  triggeredActions: Record<string, boolean>;
  onStepAction: (prompt: string, actionIndex: number, actionType?: 'research' | 'chat', agentName?: string) => void;
  onNextStep: () => void;
  onGoToStep: (stepIndex: number) => void;
  onBackToScenarios: () => void;
  onTypeYourOwn: (prefillText?: string, agentName?: string) => void;
  disabled?: boolean;
  isProcessing?: boolean;
  isClosingScenario?: boolean;
  isNextStepLoading?: boolean;
  isTypeYourOwnLoading?: boolean;
  onSaveScenario?: (scenario: ScenarioData) => Promise<void>;
  onShareScenario?: (scenario: ScenarioData) => Promise<void>;
  isSavingScenario?: boolean;
  // Scenario generation props
  isGeneratingScenario?: boolean;
  scenarioError?: Error | null;
  onStartScenarioAgain?: () => void;
  scenarioObject?: { scenarios?: any[] } | null;
  onRunGeneratedScenario?: () => void;
  // Sidebar state props for padding calculation
  showLeftSidebar?: boolean;
  showRightSidebar?: boolean;
}

export function ScenarioCommandsInput({
  scenario,
  currentStep,
  completedSteps,
  triggeredActions,
  onStepAction,
  onNextStep,
  onGoToStep,
  onBackToScenarios,
  onTypeYourOwn,
  disabled = false,
  isProcessing = false,
  isClosingScenario = false,
  isNextStepLoading = false,
  isTypeYourOwnLoading = false,
  onSaveScenario,
  onShareScenario,
  isSavingScenario = false,
  // Scenario generation props
  isGeneratingScenario = false,
  scenarioError,
  onStartScenarioAgain,
  scenarioObject,
  onRunGeneratedScenario,
  // Sidebar state props
  showLeftSidebar,
  showRightSidebar
}: ScenarioCommandsInputProps) {
  
  // State for description dropdown
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  
  // State for scenario details dropdown
  const [isScenarioDetailsExpanded, setIsScenarioDetailsExpanded] = useState(false);
  
  // State to track if link was just copied
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  
  // Auto-play state
  const [isAutoPlayActive, setIsAutoPlayActive] = useState(false);
  const [autoPlayCountdown, setAutoPlayCountdown] = useState(0);
  const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isAutoPlayActiveRef = useRef(false);
  const userStoppedAutoPlayRef = useRef(false); // Track if user manually stopped auto-play
  
  // Ref for auto-scroll functionality in scenario generation
  const scenarioContentRef = useRef<HTMLDivElement>(null);
  
  // Sync ref with state
  useEffect(() => {
    isAutoPlayActiveRef.current = isAutoPlayActive;
  }, [isAutoPlayActive]);
  
  // Auto-scroll effect for scenario generation
  useEffect(() => {
    if (scenarioContentRef.current && (isGeneratingScenario || scenarioObject)) {
      // Smooth scroll to bottom when new content is added
      const scrollToBottom = () => {
        if (scenarioContentRef.current) {
          scenarioContentRef.current.scrollTo({
            top: scenarioContentRef.current.scrollHeight,
            behavior: 'smooth'
          });
        }
      };
      
      // Use a small delay to ensure DOM has updated
      const timeoutId = setTimeout(scrollToBottom, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [scenarioObject, isGeneratingScenario]);
  
  // Auto-play delay in seconds
  const AUTO_PLAY_DELAY = 5;
  
  // Ref for the buttons container to measure available space
  const buttonsContainerRef = useRef<HTMLDivElement>(null);
  const [showButtonText, setShowButtonText] = useState(true);
  
  // Dynamic space calculation effect
  useEffect(() => {
    const checkAvailableSpace = () => {
      if (!buttonsContainerRef.current) return;
      
      const container = buttonsContainerRef.current;
      const containerWidth = container.offsetWidth;
      
      // Calculate minimum width needed for all buttons with text
      // Continue scenario: ~160px, Edit Step: ~100px, Previous: ~100px, Close: ~140px
      // Plus gaps (3 * 8px = 24px): Total ~524px
      // Set to 600px to allow some breathing room
      const minWidthWithText = 600;
      
      // If container is smaller than minimum width, hide text
      const shouldShowText = containerWidth >= minWidthWithText;
      setShowButtonText(shouldShowText);
    };
    
    // Check on mount and resize
    checkAvailableSpace();
    
    const resizeObserver = new ResizeObserver(checkAvailableSpace);
    if (buttonsContainerRef.current) {
      resizeObserver.observe(buttonsContainerRef.current);
      // Also observe the parent element if it exists
      if (buttonsContainerRef.current.parentElement) {
        resizeObserver.observe(buttonsContainerRef.current.parentElement);
      }
    }
    
    // Also check on window resize for extra safety
    window.addEventListener('resize', checkAvailableSpace);
    
    // Force a check after a small delay to catch any async layout changes
    const timeoutId = setTimeout(checkAvailableSpace, 100);
    
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', checkAvailableSpace);
      clearTimeout(timeoutId);
    };
  }, []);
  
  // Force recalculation on every render to catch layout changes
  useEffect(() => {
    if (!buttonsContainerRef.current) return;
    
    // Use requestAnimationFrame to ensure DOM has updated
    const rafId = requestAnimationFrame(() => {
      const container = buttonsContainerRef.current;
      if (container) {
        const containerWidth = container.offsetWidth;
        const parentWidth = container.parentElement?.offsetWidth || 0;
        const grandparentWidth = container.parentElement?.parentElement?.offsetWidth || 0;
        
        const minWidthWithText = 600;
        const shouldShowText = containerWidth >= minWidthWithText;
        
        if (showButtonText !== shouldShowText) {
          setShowButtonText(shouldShowText);
        }
      }
    });
    
    return () => cancelAnimationFrame(rafId);
  }, [showButtonText]);
  
  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current);
      }
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, []);
  
  // Auto-play functionality
  const triggerNextActionRef = useRef<() => void>(() => {});
  const onStepActionRef = useRef(onStepAction);
  const onNextStepRef = useRef(onNextStep);
  const isTimerScheduledRef = useRef(false);
  
  // Update refs when functions change
  useEffect(() => {
    onStepActionRef.current = onStepAction;
    onNextStepRef.current = onNextStep;
  }, [onStepAction, onNextStep]);
  
  // Reset user stop flag when scenario changes
  useEffect(() => {
    userStoppedAutoPlayRef.current = false;
    console.log('Scenario changed, resetting user stop flag');
  }, [scenario.id]);

  // Auto-start scenario when it begins (when we have scenario steps but no completed steps yet)
  useEffect(() => {
    if (scenario && scenario.steps && scenario.steps.length > 0 && completedSteps.length === 0 && !isAutoPlayActive && !isProcessing && !userStoppedAutoPlayRef.current) {
      // Only auto-start if we have actions in the first step AND user hasn't manually stopped auto-play
      const firstStep = scenario.steps[0];
      if (firstStep && firstStep.actions && firstStep.actions.length > 0) {
        console.log('Auto-starting scenario');
        // Start auto-play automatically
        setIsAutoPlayActive(true);
        setAutoPlayCountdown(AUTO_PLAY_DELAY);
      }
    }
  }, [scenario, completedSteps.length, isAutoPlayActive, isProcessing, AUTO_PLAY_DELAY]);
  
  const startAutoPlay = useCallback(() => {
    console.log('startAutoPlay called - user manually started');
    userStoppedAutoPlayRef.current = false; // Reset the stop flag when user manually starts
    setIsAutoPlayActive(true);
    setAutoPlayCountdown(AUTO_PLAY_DELAY);
  }, [AUTO_PLAY_DELAY]);
  
  const stopAutoPlay = useCallback(() => {
    console.log('stopAutoPlay called - user manually stopped');
    userStoppedAutoPlayRef.current = true; // Mark that user manually stopped auto-play
    setIsAutoPlayActive(false);
    setAutoPlayCountdown(0);
    isTimerScheduledRef.current = false; // Reset the flag immediately
    
    if (autoPlayTimerRef.current) {
      clearTimeout(autoPlayTimerRef.current);
      autoPlayTimerRef.current = null;
    }
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  }, []);
  
  const triggerNextAction = useCallback(() => {
    const currentStepData = scenario.steps[currentStep];
    if (!currentStepData || !currentStepData.actions || currentStepData.actions.length === 0) {
      setIsAutoPlayActive(false);
      setAutoPlayCountdown(0);
      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current);
        autoPlayTimerRef.current = null;
      }
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
      return;
    }
    
    // Find the first untriggered action
    for (let actionIndex = 0; actionIndex < currentStepData.actions.length; actionIndex++) {
      const actionId = `step_${currentStep}_action_${actionIndex}`;
      const isTriggered = triggeredActions[actionId];
      
      if (!isTriggered) {
        const action = currentStepData.actions[actionIndex];
        onStepAction(action.prompt, actionIndex, action.type, action.agentName);
        
        // Don't clear countdown here - let the processing state handle it
        // Just clear the timers
        if (countdownTimerRef.current) {
          clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
        }
        if (autoPlayTimerRef.current) {
          clearTimeout(autoPlayTimerRef.current);
          autoPlayTimerRef.current = null;
        }
        return;
      }
    }
    
    // If all actions are triggered, stop auto-play inline
    setIsAutoPlayActive(false);
    setAutoPlayCountdown(0);
    if (autoPlayTimerRef.current) {
      clearTimeout(autoPlayTimerRef.current);
      autoPlayTimerRef.current = null;
    }
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  }, [scenario.steps, currentStep, triggeredActions, onStepAction]);
  
  // Update the ref whenever the function changes
  triggerNextActionRef.current = triggerNextAction;
  
  // Unified auto-play driver effect
  useEffect(() => {
    console.log('Auto-play effect triggered:', { isAutoPlayActive, isProcessing, disabled, isTimerScheduled: isTimerScheduledRef.current });
    
    if (!isAutoPlayActive) {
      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current);
        autoPlayTimerRef.current = null;
      }
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
      isTimerScheduledRef.current = false;
      return;
    }

    // If we are waiting for AI response, do nothing until processing finishes
    if (isProcessing || disabled || isNextStepLoading || isTypeYourOwnLoading) {
      console.log('Auto-play paused due to processing or disabled state');
      return;
    }

    // If timer is already scheduled, don't schedule another one
    if (isTimerScheduledRef.current) {
      console.log('Timer already scheduled, skipping');
      return;
    }

    // Determine next untriggered action in current step
    const stepData = scenario.steps[currentStep];
    if (!stepData) {
      // Safety: stop auto-play if step data missing
      console.log('No step data, stopping auto-play');
      setIsAutoPlayActive(false);
      return;
    }

    const nextActionIndex = stepData.actions?.findIndex((_, idx) => {
      const actionId = `step_${currentStep}_action_${idx}`;
      return !triggeredActions[actionId];
    }) ?? -1;

    // If no more actions in this step
    if (nextActionIndex === -1) {
      console.log('No more actions in current step');
      // Move to next step if any
      if (currentStep < scenario.steps.length - 1) {
        console.log('Moving to next step');
        onNextStepRef.current();
      } else {
        // Scenario finished
        console.log('Scenario finished, stopping auto-play');
        setIsAutoPlayActive(false);
      }
      return;
    }

    // Mark timer as scheduled
    isTimerScheduledRef.current = true;
    console.log('Scheduling next action with countdown');
    
    // Schedule next action after delay with countdown
    setAutoPlayCountdown(AUTO_PLAY_DELAY);

    // Clear any existing timers
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current);

    // Countdown display
    countdownTimerRef.current = setInterval(() => {
      setAutoPlayCountdown((prev) => {
        if (prev <= 1) {
          if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Trigger action after delay
    autoPlayTimerRef.current = setTimeout(() => {
      // Double-check that auto-play is still active before triggering
      if (!isAutoPlayActiveRef.current) {
        console.log('Auto-play was stopped, not triggering action');
        isTimerScheduledRef.current = false;
        return;
      }
      
      const action = stepData.actions?.[nextActionIndex];
      if (action) {
        console.log('Triggering auto-play action:', action.label);
        onStepActionRef.current(action.prompt, nextActionIndex, action.type, action.agentName);
      }
      isTimerScheduledRef.current = false; // Reset flag after action is triggered
    }, AUTO_PLAY_DELAY * 1000);

    // Cleanup on effect rerun/unmount
    return () => {
      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current);
        autoPlayTimerRef.current = null;
      }
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
      isTimerScheduledRef.current = false;
    };
  }, [isAutoPlayActive, isProcessing, disabled, isNextStepLoading, isTypeYourOwnLoading, currentStep, triggeredActions, AUTO_PLAY_DELAY]);

  // Auto-advance to next step after processing completes (manual mode)
  useEffect(() => {
    if (isAutoPlayActive) return; // skip when auto-play is running
    if (!isProcessing && !isNextStepLoading && !isTypeYourOwnLoading) {
      const isCurrentStepCompleted = completedSteps.includes(currentStep);
      const hasNextStep = currentStep < scenario.steps.length - 1;
      if (isCurrentStepCompleted && hasNextStep) {
        console.log('Auto-advancing to next step (manual mode)');
        const timer = setTimeout(() => {
          onNextStep();
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [isProcessing, isNextStepLoading, isTypeYourOwnLoading, completedSteps, currentStep, scenario.steps.length, onNextStep, isAutoPlayActive]);

  // Pause timers while AI is processing
  useEffect(() => {
    if (isProcessing && isAutoPlayActive) {
      console.log('Pausing auto-play timers due to processing');
      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current);
        autoPlayTimerRef.current = null;
      }
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
      setAutoPlayCountdown(0);
      isTimerScheduledRef.current = false; // Reset flag when processing starts
    }
  }, [isProcessing, isAutoPlayActive]);

  // Handle customize button click - prefill with first command
  const handleCustomizeClick = () => {
    if (!disabled && !isTypeYourOwnLoading) {
      const currentStepData = scenario.steps[currentStep];
      if (currentStepData && currentStepData.actions && currentStepData.actions.length > 0) {
        // Get the first action's prompt and agent
        const firstAction = currentStepData.actions[0];
        const firstActionPrompt = firstAction.prompt;
        const firstActionAgent = firstAction.agentName ? getDisplayAgentName(firstAction.agentName) : undefined;
        
        // Call onTypeYourOwn with both prefilled text and agent
        onTypeYourOwn(firstActionPrompt, firstActionAgent);
      } else {
        // If no actions, call without prefill
        onTypeYourOwn();
      }
    }
  };
  
  // Helper function to truncate text to 5 words maximum
  const truncateToWords = (text: string, maxWords: number = 5) => {
    const words = text.split(' ');
    if (words.length <= maxWords) {
      return text;
    }
    return words.slice(0, maxWords).join(' ') + '...';
  };

  // Function to calculate padding based on sidebar states (same as ChatInput.tsx)
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

  const currentStepData = scenario.steps[currentStep];
  const isCurrentStepCompleted = completedSteps.includes(currentStep);
  const hasPreviousStep = currentStep > 0;
  
  // Check if all steps are completed
  const allStepsCompleted = completedSteps.length === scenario.steps.length;

  // Show scenario generation state if generating
  if (isGeneratingScenario || (scenarioObject && !scenario.steps?.length)) {
    const displayScenarios = scenarioObject?.scenarios || [];
    const hasScenarios = displayScenarios.length > 0;
    const firstScenario = hasScenarios ? displayScenarios[0] : null;
    
    // Show the loading animation if generating and no scenarios yet
    if (isGeneratingScenario && !hasScenarios) {
      return <ScenarioGeneratingLoader showLeftSidebar={showLeftSidebar} showRightSidebar={showRightSidebar} />;
    }
    
    // Calculate mock progress for generation
    const mockSteps = firstScenario?.steps || [];
    
    return (
      <div className={`bg-transparent w-full relative z-[200] ${calculatePadding(showLeftSidebar, showRightSidebar)}`}>
        <ScenarioProgressBlock
          title={hasScenarios && firstScenario?.title ? firstScenario.title : 'Generating Multi-Agent Scenario'}
          description={hasScenarios 
            ? ''
            : 'Creating a personalized learning path with AI agents...'}
          steps={mockSteps}
          isGenerating={true}
          minimalMode={false}
          showProgressBar={!hasScenarios}
          progressPercent={hasScenarios ? 100 : 50}
          animateProgress={!hasScenarios}
          primaryButton={
            hasScenarios ? {
              label: isGeneratingScenario ? 'Generating...' : 'Run scenario',
              onClick: onRunGeneratedScenario || (() => {}),
              icon: <PlayIcon className="flex-shrink-0" />,
              loading: isGeneratingScenario,
              disabled: isGeneratingScenario
            } : undefined
          }
          timeEstimate={hasScenarios && mockSteps.length > 0 
            ? `${mockSteps.length} ${mockSteps.length === 1 ? 'step' : 'steps'} • ~${mockSteps.length} ${mockSteps.length === 1 ? 'minute' : 'minutes'}`
            : undefined}
        />
      </div>
    );
  }

  // Show error state if there's an error
  if (scenarioError) {
    return (
      <div className={`bg-transparent w-full relative z-[200] ${calculatePadding(showLeftSidebar, showRightSidebar)}`}>
        <div 
          style={{
            display: 'flex',
            padding: '20px',
            flexDirection: 'column',
            alignItems: 'flex-start',
            alignSelf: 'stretch',
            borderRadius: '16px',
            border: '1px solid var(--Monochrome-Light, #E8E8E5)',
            background: 'var(--Monochrome-White, #FFF)',
            boxShadow: '0px 0px 20px 0px rgba(203, 203, 203, 0.20)'
          }}
        >
          <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200 mb-4 w-full">
            <p className="font-semibold mb-1">Error occurred</p>
            <p className="text-sm">{scenarioError.message}</p>
          </div>
          
          {onStartScenarioAgain && (
            <Button
              onClick={onStartScenarioAgain}
              variant="outline"
              className="mt-2"
            >
              Try Again
            </Button>
          )}
        </div>
      </div>
    );
  }

  // If all steps are completed AND processing is finished, show completion message
  if (allStepsCompleted && !isProcessing && !isNextStepLoading && !isTypeYourOwnLoading) {
    const isTemporaryScenario = scenario.id?.startsWith('temp-') || !scenario.id;
    
    return (
      <div className={`bg-transparent w-full relative z-[200] ${calculatePadding(showLeftSidebar, showRightSidebar)}`}>
        <div 
          style={{
            display: 'flex',
            padding: '20px',
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: '16px',
            alignSelf: 'stretch',
            borderRadius: '16px',
            border: '1px solid var(--Monochrome-Light, #E8E8E5)',
            background: 'var(--Monochrome-White, #FFF)',
            boxShadow: '0px 0px 20px 0px rgba(203, 203, 203, 0.20)'
          }}
        >
          {/* First section - Emoji */}
          <div className="flex-shrink-0">
            <div 
              className="flex items-center justify-center" 
              style={{ width: '20px', height: '20px' }}
            >
              🎉
            </div>
          </div>
          
          {/* Second section - All other content */}
          <div className="flex-1 flex flex-col">
            {/* Title */}
            <h2 className="text-lg font-semibold text-slate-900">
              The scenario is complete
            </h2>
            
            {/* Description */}
            <p className="text-sm text-slate-600 text-left mb-2.5">
              Now you can continue working on the project using chat input
            </p>
            
            {/* Action buttons */}
            <div className="flex flex-col gap-3 w-full max-w-sm">
              {/* Buttons row - Save & Share and Continue chatting */}
              <div className="flex gap-2 w-full">
                {/* Save & Share button */}
                {(onSaveScenario || onShareScenario) && (
                  <Button
                    onClick={async () => {
                      if (isTemporaryScenario && onSaveScenario) {
                        // First save the scenario (which will also share it)
                        await onSaveScenario(scenario);
                        // Show copied feedback
                        setIsLinkCopied(true);
                        setTimeout(() => setIsLinkCopied(false), 2000);
                      } else if (onShareScenario) {
                        // If already saved, just share
                        await onShareScenario(scenario);
                        // Show copied feedback
                        setIsLinkCopied(true);
                        setTimeout(() => setIsLinkCopied(false), 2000);
                      }
                    }}
                    disabled={disabled || isSavingScenario}
                    className="flex-1"
                    style={{
                      display: 'flex',
                      padding: '8px 12px',
                      alignItems: 'center',
                      gap: '4px',
                      borderRadius: '8px',
                      background: 'var(--Monochrome-Black, #232323)',
                      color: 'white',
                      border: 'none',
                      cursor: disabled || isSavingScenario ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: 500,
                      height: '36px',
                      maxWidth: '160px'
                    }}
                  >
                    {isSavingScenario ? (
                      <>
                        <SpinnerIcon className="h-4 w-4 animate-spin mr-2" />
                        {isTemporaryScenario ? 'Saving...' : 'Sharing...'}
                      </>
                    ) : isLinkCopied ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Link copied!
                      </>
                    ) : (
                      <>
                        <BookmarkIcon className="mr-2" />
                        {isTemporaryScenario ? 'Save & Share' : 'Copy link'}
                      </>
                    )}
                  </Button>
                )}
                
                {/* Continue chatting button */}
                <Button
                  onClick={() => onTypeYourOwn()}
                  disabled={disabled || isTypeYourOwnLoading}
                  className="flex-1"
                  style={{
                    display: 'flex',
                    padding: '8px 12px',
                    alignItems: 'center',
                    gap: '4px',
                    borderRadius: '8px',
                    border: '1px solid var(--Monochrome-Light, #E8E8E5)',
                    background: 'var(--Monochrome-Superlight, #F2F2ED)',
                    color: 'var(--Monochrome-Black, #232323)',
                    fontSize: '14px',
                    fontWeight: 500,
                    height: '36px',
                    maxWidth: '160px',
                    cursor: disabled || isTypeYourOwnLoading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isTypeYourOwnLoading ? (
                    <>
                      <SpinnerIcon className="h-4 w-4 animate-spin mr-2" />
                      Continue chatting
                    </>
                  ) : (
                    <>
                      Continue chatting
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentStepData) {
    return (
      <div className={`bg-transparent w-full relative z-[200] ${calculatePadding(showLeftSidebar, showRightSidebar)}`}>
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
          <p className="text-slate-600 text-center text-sm">Scenario completed!</p>
          <Button
            onClick={onBackToScenarios}
            className="mt-2"
            variant="outline"
            size="sm"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Scenarios
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-transparent w-full relative z-[200] ${calculatePadding(showLeftSidebar, showRightSidebar)}`}>
      {/* Scenario Details Dropdown - Expanded View */}
      {isScenarioDetailsExpanded && (
        <ScenarioProgressBlock
          title={scenario.title}
          description={currentStepData.description}
          steps={scenario.steps}
          currentStep={currentStep}
          completedSteps={completedSteps}
          isProcessing={isProcessing}
          isExpanded={true}
          showCloseButton={true}
          onClose={() => setIsScenarioDetailsExpanded(false)}
          showProgressBar={false}
          primaryButton={{
            label: isProcessing ? 'AI is responding...' : isAutoPlayActive ? (autoPlayCountdown > 0 ? `Next step in ${autoPlayCountdown}s` : 'Ready') : 'Continue scenario',
            onClick: () => {
              console.log('Primary button clicked (expanded), isAutoPlayActive:', isAutoPlayActive);
              if (isAutoPlayActive) {
                stopAutoPlay();
              } else {
                startAutoPlay();
              }
            },
            disabled: disabled || !currentStepData?.actions || !Array.isArray(currentStepData.actions) || currentStepData.actions.length === 0,
            loading: isProcessing,
            icon: isProcessing ? undefined : isAutoPlayActive ? <Pause className="h-3 w-3 flex-shrink-0" /> : <PlayIcon className="flex-shrink-0" />
          }}
          secondaryButtons={
            (isAutoPlayActive || isProcessing) ? [] : [
              {
                label: 'Edit Step',
                onClick: handleCustomizeClick,
                disabled: disabled || isTypeYourOwnLoading,
                loading: isTypeYourOwnLoading,
                icon: <EditIcon className="flex-shrink-0" />,
                showText: true
              },
              {
                label: 'Close scenario',
                onClick: onBackToScenarios,
                disabled: isClosingScenario || disabled,
                loading: isClosingScenario,
                icon: <X className="h-3 w-3 flex-shrink-0" />,
                showText: true
              }
            ]
          }
          timeEstimate={
            (isAutoPlayActive || isProcessing) ? (() => {
              const remainingSteps = scenario.steps && Array.isArray(scenario.steps) 
                ? scenario.steps.length - completedSteps.length 
                : 0;
              const estimatedMinutes = remainingSteps;
              return `${estimatedMinutes} ${estimatedMinutes === 1 ? 'minute' : 'minutes'} left`;
            })() : undefined
          }
          isAutoPlayActive={isAutoPlayActive}
          autoPlayCountdown={autoPlayCountdown}
        />
      )}
      
      {/* Main control interface - Collapsed View */}
      {!isScenarioDetailsExpanded && (
        <ScenarioProgressBlock
          title={currentStepData.title}
          description={currentStepData.description}
          steps={scenario.steps}
          currentStep={currentStep}
          completedSteps={completedSteps}
          isProcessing={isProcessing}
          isExpanded={false}
          onToggleExpanded={() => setIsScenarioDetailsExpanded(true)}
          showProgressBar={true}
          primaryButton={{
            label: isProcessing ? 'AI is responding...' : isAutoPlayActive ? (autoPlayCountdown > 0 ? `Next step in ${autoPlayCountdown}s` : 'Ready') : 'Continue scenario',
            onClick: () => {
              console.log('Primary button clicked (collapsed), isAutoPlayActive:', isAutoPlayActive);
              if (isAutoPlayActive) {
                stopAutoPlay();
              } else {
                startAutoPlay();
              }
            },
            disabled: disabled || !currentStepData?.actions || !Array.isArray(currentStepData.actions) || currentStepData.actions.length === 0,
            loading: isProcessing,
            icon: isProcessing ? undefined : isAutoPlayActive ? <Pause className="h-3 w-3 flex-shrink-0" /> : <PlayIcon className="flex-shrink-0" />
          }}
          secondaryButtons={
            (isAutoPlayActive || isProcessing) ? [] : [
              {
                label: 'Edit Step',
                onClick: handleCustomizeClick,
                disabled: disabled || isTypeYourOwnLoading,
                loading: isTypeYourOwnLoading,
                icon: <EditIcon className="flex-shrink-0" />,
                showText: showButtonText
              },
              ...(hasPreviousStep ? [{
                label: 'Previous',
                onClick: () => onGoToStep(currentStep - 1),
                disabled: disabled,
                icon: <ChevronLeft className="h-3 w-3 flex-shrink-0" />,
                showText: showButtonText
              }] : []),
              {
                label: 'Close scenario',
                onClick: onBackToScenarios,
                disabled: isClosingScenario || disabled,
                loading: isClosingScenario,
                icon: <X className="h-3 w-3 flex-shrink-0" />,
                showText: showButtonText
              }
            ]
          }
          timeEstimate={
            (isAutoPlayActive || isProcessing) ? (() => {
              const remainingSteps = scenario.steps && Array.isArray(scenario.steps) 
                ? scenario.steps.length - completedSteps.length 
                : 0;
              const estimatedMinutes = remainingSteps;
              return `${estimatedMinutes} ${estimatedMinutes === 1 ? 'minute' : 'minutes'} left`;
            })() : undefined
          }
          isAutoPlayActive={isAutoPlayActive}
          autoPlayCountdown={autoPlayCountdown}
        />
      )}
    </div>
  );
} 
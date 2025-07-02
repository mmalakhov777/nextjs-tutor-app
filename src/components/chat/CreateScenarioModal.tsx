'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Loader2, Square, Search, BookOpen, TrendingUp, Layers, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PlusIcon } from '@/components/icons/PlusIcon';
import { Textarea } from '@/components/ui/textarea';
import { MicrophoneIcon } from '@/components/icons/MicrophoneIcon';
import { blobToBase64 } from '@/utils/audioUtils';
import { speechToText } from '@/services/audioService';
import { toast } from 'react-hot-toast';
import { experimental_useObject as useObject } from '@ai-sdk/react';
import { ResponseSchema } from '@/app/api/scenarios/generate/schema';
import { getAgentDescription } from '@/data/agentDescriptions';
import { getAgentIcon, getAgentCircleColor, getAgentTextColor, getDisplayAgentName, getAgentShortDescription } from '@/lib/agents';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CreateScenarioModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateScenario: (scenarioJsonString: string) => void;
}

export function CreateScenarioModal({ 
  isOpen, 
  onOpenChange, 
  onCreateScenario 
}: CreateScenarioModalProps) {
  const [userPrompt, setUserPrompt] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { 
    object,
    submit,
    isLoading,
    error,
    stop,
  } = useObject({
    api: '/api/scenarios/generate',
    schema: ResponseSchema, 
    onFinish: ({ object, error }) => {
      if (error) {
        toast.error(`Scenario generation failed: ${error.message}`);
      }
    },
    onError: (err) => {
      toast.error(`API Error: ${err.message}`);
    }
  });

  // Audio recording states
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  
  // MediaRecorder references
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Handle scenario creation
  const handleCreateScenario = () => {
    if (userPrompt.trim()) {
      submit({ prompt: userPrompt });
    }
  };

  // Handle starting again
  const handleStartAgain = () => {
    setUserPrompt('');
    if (object) {
      object.scenarios = [];
    }
    stop();
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (userPrompt.trim()) {
        handleCreateScenario();
      }
    }
  };
  
  // Start recording
  const startRecording = async () => {
    try {
      let mimeType = null;
      const supportedMimeTypes = [
        'audio/mp4',
        'audio/mpeg',
        'audio/wav',
      ];

      for (const type of supportedMimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          break;
        }
      }

      if (!mimeType) {
        throw new Error('No supported audio format found');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
        }
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000
      });

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        
        try {
          setIsTranscribing(true);
          const text = await speechToText(audioBlob);
          if (text) {
            setUserPrompt(text);
            setIsRecording(false);
            setIsTranscribing(false);
          } else {
             setIsRecording(false);
             setIsTranscribing(false);
          }
        } catch (error) {
          toast.error('Failed to process audio. Please try again.');
          setIsRecording(false);
          setIsTranscribing(false);
        } finally {
           stream.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100);
      setIsRecording(true);
      setUserPrompt('');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setRecordingError('Failed to start recording: ' + errorMessage);
      toast.error('Failed to start recording: ' + errorMessage);
      setIsRecording(false);
    }
  };
  
  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    } else {
      setIsRecording(false);
      setIsTranscribing(false);
      if (mediaRecorderRef.current?.stream) {
         mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    }
  };
  
  // Handle recording toggle
  const toggleRecording = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      await startRecording();
    }
  };
  
  // Cleanup
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
       if (mediaRecorderRef.current?.stream) {
         mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Function to run the scenario and trigger first command
  const handleRunScenario = () => {
    if (object && object.scenarios && object.scenarios.length > 0) {
      try {
        const scenarioJson = JSON.stringify(object.scenarios);
        console.log('[CreateScenarioModal] Running scenario - JSON being passed to AgentsSidebar:');
        console.log(scenarioJson);
        console.log('[CreateScenarioModal] Parsed scenario object:');
        console.log(JSON.stringify(object.scenarios, null, 2));
        
        onOpenChange(false);
        
        setTimeout(() => {
          console.log('[CreateScenarioModal] Calling onCreateScenario with JSON:', scenarioJson);
          onCreateScenario(scenarioJson);
        }, 100);
        
      } catch (e) {
        console.error('[CreateScenarioModal] Error in handleRunScenario:', e);
        toast.error('Unable to run scenario: Invalid format after generation.');
      }
    } else {
      console.error('[CreateScenarioModal] No scenario generated or scenario is empty:', {
        hasObject: !!object,
        hasScenarios: !!(object && object.scenarios),
        scenariosLength: object?.scenarios?.length || 0
      });
      toast.error('No scenario generated or scenario is empty.');
    }
  };
  
  const displayScenarios = object?.scenarios || [];
  const hasScenarios = displayScenarios.length > 0;
  const showHeaderContent = !isLoading && !hasScenarios;
  const hideHeaderCompletely = isLoading || hasScenarios;

  // Example scenarios data
  const exampleScenarios = [
    {
      title: "Deep Research",
      description: "Multi-source analysis with insights",
      icon: BookOpen,
      prompt: "I need to conduct deep research on artificial intelligence's impact on education. The scenario should involve:\n• Using at least 3 research agents: Perplexity for academic sources, YouTube Agent for video content analysis, and Web Researcher for comprehensive web coverage\n• Gathering information from academic sources, industry reports, and expert opinions\n• Analyzing current trends and future predictions\n• Identifying key challenges and opportunities\n• Creating a comprehensive report with actionable recommendations\n• Target audience: Educational administrators and policy makers\n• Expected outcome: A well-researched strategic document for 5000 words for AI integration in schools"
    },
    {
      title: "SEO Article",
      description: "Optimized content that ranks",
      icon: TrendingUp,
      prompt: "Create an SEO article writing scenario focused on 'AI tools for small businesses'. The scenario should include:\n• Keyword research and competitive analysis\n• Content structure optimization for search engines\n• Writing engaging, informative content that converts\n• Meta descriptions and title optimization\n• Internal linking strategy\n• Target audience: Small business owners looking to implement AI\n• Expected outcome: A 2000-word article that ranks in top 10 for target keywords"
    },
    {
      title: "AI Video Flashcards",
      description: "YouTube → Learning cards",
      icon: Layers,
      prompt: "Create flashcards based on the most popular YouTube video about artificial intelligence. The scenario should involve:\n• Analyzing the video content and extracting key concepts\n• Creating question-answer pairs for active recall\n• Organizing information by difficulty and topic\n• Target audience: Students and professionals learning about AI\n• Expected outcome: 5+ high-quality flashcards covering all major concepts from the video\n• Assessment: Self-testing with spaced repetition for long-term retention"
    }
  ];

  // Handle example card click
  const handleExampleClick = (prompt: string) => {
    setUserPrompt(prompt);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 100);
  };

  // Handle close
  const handleClose = () => {
    onOpenChange(false);
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <style jsx global>{`
        .chat-textarea::placeholder {
          color: #6b7280;
          font-size: 16px;
        }
        
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E8E8E5; border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #D0D0D0; }
        .custom-scrollbar { scrollbar-width: thin; scrollbar-color: #E8E8E5 transparent; }

        .highlight-text {
          display: inline-block;
          background-color: #e0f2fe;
          padding: 4px 12px;
          border-radius: 8px;
        }
      `}</style>

      {/* Modal Overlay */}
      <div 
        className="fixed inset-0 z-[9999] flex items-center justify-center p-0 sm:p-4"
        style={{ 
          background: 'rgba(35, 35, 35, 0.20)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)'
        }}
        onClick={handleBackdropClick}
      >
        {/* Modal Content */}
        <div 
          className={`relative w-full h-full ${hasScenarios ? 'sm:w-[1200px] sm:max-w-[90vw]' : 'sm:w-[900px]'} sm:h-full sm:min-h-[500px] sm:max-h-[90vh] bg-white rounded-none sm:rounded-2xl flex flex-col`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute right-6 top-6 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 z-10"
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </button>

          <div className="flex flex-col h-full w-full overflow-hidden">
            {/* Header with highlighted title - shown only in default state */}
            {!hideHeaderCompletely && (
              <div className="px-8 pt-12 pb-8 text-left flex-shrink-0">
                <h1 className="font-bold mb-3" style={{ fontSize: '32px' }}>
                  What will your Scenario be about?
                </h1>
                <p className="text-sm sm:text-base max-w-2xl leading-relaxed" style={{ color: '#3C3C3C' }}>
                  Describe your learning scenario with specific goals, target audience, and desired outcomes. 
                  Our AI agents will create a structured, step-by-step plan tailored to your needs.
                </p>
              </div>
            )}

            {/* Main content area - this should be scrollable */}
            <div className={`flex-1 min-h-0 overflow-hidden ${hideHeaderCompletely ? 'pt-12' : ''}`}>
              {/* Loading state */}
              {isLoading && displayScenarios.length === 0 && (
                <div className="flex items-center justify-center h-full px-8">
                  <div className="text-center">
                    <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <span className="text-lg" style={{ color: '#3C3C3C' }}>Generating your scenario...</span>
                  </div>
                </div>
              )}
            
              {/* Error state */}
              {error && (
                <div className="px-8">
                  <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200 mb-6">
                    <p className="font-semibold mb-1">Error occurred</p>
                    <p>{error.message}</p>
                  </div>
                </div>
              )}
            
              {/* Generated scenarios display */}
              {hasScenarios ? (
                <div className="flex h-full overflow-hidden">
                  {/* Left side - scrollable content */}
                  <div className="w-full lg:w-[75%] h-full overflow-y-auto px-8 custom-scrollbar">
                    <div className="py-6">
                      <div className="space-y-8 pr-0 lg:pr-6">
                        {displayScenarios.map((scenario: any, idx: number) => {
                          const steps = scenario.steps && Array.isArray(scenario.steps)
                            ? scenario.steps
                            : scenario.actions && Array.isArray(scenario.actions)
                              ? [{
                                  title: scenario.title,
                                  description: scenario.description,
                                actions: scenario.actions
                              }]
                              : [];
                              
                          const hasMultipleSteps = steps.length > 1;
                          const firstStepIsDifferent = steps.length === 1 && 
                            (steps[0].title !== scenario.title || steps[0].description !== scenario.description);
                          const showScenarioHeader = hasMultipleSteps || firstStepIsDifferent;
                          
                          return (
                            <div key={idx} className="flex flex-col">
                              {showScenarioHeader && (
                                <div className="mb-4">
                                  <div className="flex justify-between items-center mb-3">
                                    <h2 className="text-xl font-semibold">{scenario.title}</h2>
                                  </div>
                                  <p className="text-sm mb-3" style={{ color: '#3C3C3C' }}>{scenario.description}</p>
                                  
                                  {/* Goal, Metrics of Success, and Expected Outcome cards */}
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                                    {scenario.goal && (
                                      <div className="p-3 border-r border-gray-200">
                                        <div className="mb-1">
                                          <h3 className="text-sm font-medium text-[#232323]">Goal</h3>
                                        </div>
                                        <p className="text-xs" style={{ color: '#3C3C3C' }}>{scenario.goal}</p>
                                      </div>
                                    )}
                                    
                                    {scenario.metricsOfSuccess && (
                                      <div className="p-3 border-r border-gray-200">
                                        <div className="mb-1">
                                          <h3 className="text-sm font-medium text-[#232323]">Metrics of Success</h3>
                                        </div>
                                        <p className="text-xs" style={{ color: '#3C3C3C' }}>{scenario.metricsOfSuccess}</p>
                                      </div>
                                    )}
                                    
                                    {scenario.outcome && (
                                      <div className="p-3">
                                        <div className="mb-1">
                                          <h3 className="text-sm font-medium text-[#232323]">Expected Outcome</h3>
                                        </div>
                                        <p className="text-xs" style={{ color: '#3C3C3C' }}>{scenario.outcome}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                              
                              {steps.length > 0 && (
                                <div className="space-y-4">
                                  {steps.map((step: any, stepIdx: number) => (
                                    <div 
                                      key={stepIdx}
                                      className="p-4 bg-white mb-4"
                                      style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'stretch',
                                        gap: '12px',
                                        alignSelf: 'stretch',
                                        borderTop: stepIdx === 0 ? '1px solid var(--Monochrome-Light, #E8E8E5)' : 'none',
                                        borderBottom: '1px solid var(--Monochrome-Light, #E8E8E5)',
                                        background: '#FFF',
                                      }}
                                    >
                                      <div className="flex items-start w-full">
                                        <div 
                                          className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mr-3 text-sm font-medium text-slate-700"
                                          style={{
                                            width: '24px',
                                            height: '24px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            marginRight: '12px',
                                            borderRadius: '1000px',
                                            background: 'var(--Blue-Light, #C7EFFF)',
                                            color: '#232323',
                                            fontSize: '14px',
                                            fontWeight: 500
                                          }}
                                        >
                                          {stepIdx + 1}
                                        </div>
                                        <div className="w-full flex-grow flex flex-col" style={{ width: '100%' }}>
                                          <h4 className="font-medium text-slate-900">{step.title || `Step ${stepIdx + 1}`}</h4>
                                          <p className="text-sm mb-3" style={{ color: '#3C3C3C' }}>{step.description || ''}</p>
                                          
                                          {step.actions && Array.isArray(step.actions) && (
                                            <div className="space-y-2 mt-3 w-full" style={{ width: '100%' }}>
                                              {step.actions.map((action: any, actionIdx: number) => (
                                                <div 
                                                  key={actionIdx}
                                                  className="text-left text-sm transition-colors text-[#232323]"
                                                  style={{
                                                    display: 'flex',
                                                    padding: '16px',
                                                    flexDirection: 'column',
                                                    alignItems: 'flex-start',
                                                    gap: '12px',
                                                    alignSelf: 'stretch',
                                                    width: '100%',
                                                    minWidth: '100%',
                                                    maxWidth: '100%',
                                                    borderRadius: '16px',
                                                    border: '1px solid var(--Monochrome-Light, #E8E8E5)',
                                                    background: 'var(--Monochrome-Ultralight, #F8F8F3)',
                                                    boxShadow: 'none',
                                                    opacity: 1,
                                                    cursor: 'default'
                                                  }}
                                                >
                                                  {/* Hide command titles
                                                  <div className="flex items-center justify-between w-full">
                                                    <span style={{
                                                      color: 'var(--Monochrome-Black, #232323)',
                                                      fontFamily: '"Aeonik Pro", sans-serif',
                                                      fontSize: '14px',
                                                      fontStyle: 'normal',
                                                      fontWeight: 400,
                                                      lineHeight: '20px',
                                                      marginRight: '8px'
                                                    }}>
                                                      {action.label}
                                                    </span>
                                                  </div>
                                                  */}
                                                  <div className="flex items-center gap-2">
                                                    {action.agentName && (
                                                      <div 
                                                        className={`w-6 h-6 rounded-full flex items-center justify-center p-1 flex-shrink-0 ${getAgentCircleColor(action.agentName)} ${getAgentTextColor(action.agentName)}`}
                                                      >
                                                        {React.createElement(getAgentIcon(action.agentName), { className: "h-5 w-5" })}
                                                      </div>
                                                    )}
                                                    <div className="text-sm" style={{ color: '#3C3C3C' }}>{action.prompt || action.description}</div>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {isLoading && hasScenarios && (
                          <div className="flex items-center justify-center py-6 mb-6">
                            <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full mr-2"></div>
                            <span style={{ color: '#3C3C3C' }}>Generating scenario...</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Right sidebar - fixed */}
                  <div className="hidden lg:block w-[25%] pl-6 pr-8 border-l border-gray-200">
                    <div className="pt-3">
                      <div className="w-full bg-white rounded-lg p-6 border border-gray-200">
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-900">
                              AI Agents at your service
                            </h3>
                          </div>
                          
                          <p className="text-[10px] leading-relaxed mb-4" style={{ color: '#3C3C3C' }}>
                            <span className="font-medium">Sequential AI Processing:</span> Each agent contributes specialized expertise to deliver optimal results.
                          </p>
                          
                          <ul className="space-y-3">
                            {isLoading ? (
                              <>
                                <li className="flex items-center">
                                  <div className="w-5 h-5 rounded-full bg-gray-300 animate-pulse mr-3 flex-shrink-0"></div>
                                  <div className="h-4 bg-gray-300 rounded animate-pulse w-40"></div>
                                </li>
                                <li className="flex items-center">
                                  <div className="w-5 h-5 rounded-full bg-gray-300 animate-pulse mr-3 flex-shrink-0"></div>
                                  <div className="h-4 bg-gray-300 rounded animate-pulse w-48"></div>
                                </li>
                                <li className="flex items-center">
                                  <div className="w-5 h-5 rounded-full bg-gray-300 animate-pulse mr-3 flex-shrink-0"></div>
                                  <div className="h-4 bg-gray-300 rounded animate-pulse w-56"></div>
                                </li>
                                <li className="flex items-center">
                                  <div className="w-5 h-5 rounded-full bg-gray-300 animate-pulse mr-3 flex-shrink-0"></div>
                                  <div className="h-4 bg-gray-300 rounded animate-pulse w-32"></div>
                                </li>
                              </>
                            ) : (
                              <>
                                {(() => {
                                  const mentionedAgents = new Set<string>();
                                  displayScenarios.forEach((scenario: any) => {
                                    const steps = scenario.steps && Array.isArray(scenario.steps)
                                      ? scenario.steps
                                      : scenario.actions && Array.isArray(scenario.actions)
                                        ? [{
                                            title: scenario.title,
                                            description: scenario.description,
                                            actions: scenario.actions
                                          }]
                                        : [];
                                    
                                    steps.forEach((step: any) => {
                                      if (step.actions && Array.isArray(step.actions)) {
                                        step.actions.forEach((action: any) => {
                                          if (action.agentName) {
                                            mentionedAgents.add(action.agentName);
                                          }
                                        });
                                      }
                                    });
                                  });
                                  
                                  return Array.from(mentionedAgents).map((agentName, index) => {
                                    const description = getAgentShortDescription(agentName);
                                    
                                    return (
                                      <li key={index} className="flex items-start">
                                        <div 
                                          className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 flex-shrink-0 mt-0.5 p-1 ${getAgentCircleColor(agentName)} ${getAgentTextColor(agentName)}`}
                                        >
                                          {React.createElement(getAgentIcon(agentName), { className: "h-5 w-5" })}
                                        </div>
                                        <div className="flex flex-col">
                                          <span className="text-gray-900 text-sm font-medium">{getDisplayAgentName(agentName)}</span>
                                          <span className="text-xs leading-relaxed" style={{ color: '#3C3C3C' }}>{description}</span>
                                        </div>
                                      </li>
                                    );
                                  });
                                })()}
                              </>
                            )}
                          </ul>
                        </div>
                        
                        {/* Action buttons */}
                        {!isLoading && hasScenarios && (
                          <div className="mt-6 space-y-3">
                            <Button
                              onClick={handleRunScenario}
                              className="w-full text-[#232323]"
                              style={{
                                display: 'flex',
                                padding: '10px 16px',
                                height: '40px',
                                justifyContent: 'center',
                                alignItems: 'center',
                                gap: '8px',
                                borderRadius: '8px',
                                background: 'var(--Yellow-Normal, #FED770)'
                              }}
                            >
                              Run Scenario
                            </Button>
                            
                            <button
                              onClick={handleStartAgain}
                              className="w-full"
                              style={{
                                height: '40px',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                padding: '10px 16px',
                                borderRadius: '8px',
                                border: '1px solid var(--light)',
                                background: 'var(--white)',
                                color: 'var(--Monochrome-Black, #232323)',
                                fontSize: '14px',
                                fontWeight: 400,
                                transition: 'all 0.2s ease-in-out',
                                cursor: 'pointer'
                              }}
                              onMouseOver={(e) => {
                                e.currentTarget.style.background = 'var(--superlight)';
                                e.currentTarget.style.borderColor = 'var(--normal)';
                              }}
                              onMouseOut={(e) => {
                                e.currentTarget.style.background = 'var(--white)';
                                e.currentTarget.style.borderColor = 'var(--light)';
                              }}
                            >
                              Start Again
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                !isLoading && !error && (
                  <div className="flex flex-col mt-4 px-8">
                    {/* Form styled like screenshot */}
                    <div className="max-w-xl mx-auto w-full shadow-none"
                      style={{
                        display: 'flex',
                        padding: '20px 20px 10px 20px',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        alignItems: 'flex-end',
                        flex: '1 0 0',
                        alignSelf: 'stretch',
                        borderRadius: '20px',
                        border: '1px solid var(--Monochrome-Light, #E8E8E5)',
                        background: 'var(--Monochrome-Ultralight, #F8F8F3)'
                      }}
                    >
                      <div className="w-full pb-0">
                        <Textarea
                          id="scenario-description"
                          ref={textareaRef}
                          value={userPrompt}
                          onChange={(e) => setUserPrompt(e.target.value)}
                          onKeyDown={handleKeyPress}
                          disabled={isRecording || isTranscribing || isLoading}
                          placeholder={
                            isRecording ? "Recording..." : 
                            isTranscribing ? "Transcribing..." :
                            isLoading ? "Generating scenario..." :
                            "Describe your scenario:\n• Main topic and learning goals\n• Student background and challenges\n• Desired outcome and assessment"
                          }
                          className="w-full resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-gray-700"
                          style={{ 
                            height: '160px',
                            overflowY: 'auto',
                            overflowX: 'hidden',
                            fontSize: '16px',
                            lineHeight: '1.6',
                            scrollbarWidth: 'thin',
                            scrollbarColor: '#CBD5E0 transparent'
                          }}
                        />
                      </div>
                      
                      {/* Footer with controls */}
                      <div className="flex items-center justify-between gap-2 w-full pt-3">
                        {/* Examples as scrollable cards */}
                        <div className="flex-1 mr-4">
                          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                            {exampleScenarios.map((example, index) => (
                              <button
                                key={index}
                                onClick={() => handleExampleClick(example.prompt)}
                                disabled={isRecording || isTranscribing || isLoading}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex-shrink-0 ${index > 0 ? 'hidden sm:flex' : ''}`}
                                style={{
                                  background: 'var(--Monochrome-Superlight, #F2F2ED)',
                                  border: '1px solid #E8E8E5'
                                }}
                                onMouseOver={(e) => {
                                  if (!isRecording && !isTranscribing && !isLoading) {
                                    e.currentTarget.style.background = '#EAEAE5';
                                  }
                                }}
                                onMouseOut={(e) => {
                                  if (!isRecording && !isTranscribing && !isLoading) {
                                    e.currentTarget.style.background = 'var(--Monochrome-Superlight, #F2F2ED)';
                                  }
                                }}
                              >
                                <example.icon className="h-4 w-4 text-gray-500 flex-shrink-0" />
                                <span className="text-sm font-medium text-gray-700">{example.title}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        {/* Record button on the right */}
                        <button
                          onClick={toggleRecording}
                          disabled={isTranscribing || isLoading}
                          style={{
                            display: 'flex',
                            padding: '8px',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '8px',
                            background: isRecording ? 'var(--Error-400, #EF4444)' : 'var(--Monochrome-Superlight, #F2F2ED)',
                            border: '1px solid #E8E8E5',
                            cursor: 'pointer',
                            opacity: (isTranscribing || isLoading) ? 0.5 : 1,
                            position: 'relative'
                          }}
                        >
                          {isTranscribing ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : isRecording ? (
                            <Square className="h-4 w-4 text-white" />
                          ) : (
                            <MicrophoneIcon className="h-4 w-4" />
                          )}
                          {isRecording && !isTranscribing && (
                            <span style={{ 
                              position: 'absolute',
                              fontSize: '12px', 
                              fontWeight: 500, 
                              color: 'white',
                              bottom: '-18px',
                              left: '50%',
                              transform: 'translateX(-50%)',
                              whiteSpace: 'nowrap'
                            }}>
                              Stop
                            </span>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
            
            {/* Footer with buttons */}
            {!hasScenarios && !isLoading && (
              <div className="w-full flex justify-between gap-3 bg-white px-8 py-10 flex-shrink-0 rounded-b-none sm:rounded-b-2xl">
                <div className="flex flex-col justify-center items-center w-full gap-3">
                  <Button
                    onClick={handleCreateScenario}
                    disabled={!userPrompt.trim() || isRecording || isTranscribing}
                    className="text-white flex items-center gap-2"
                    style={{
                      display: 'flex',
                      padding: '16px 40px',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: '8px',
                      borderRadius: '100px',
                      background: 'var(--Monochrome-Black, #232323)',
                      border: 'none',
                      fontSize: '16px',
                      height: '56px'
                    }}
                  >
                    <span>Create Scenario</span>
                  </Button>
                  
                  <button
                    onClick={handleClose}
                    className="text-gray-500 hover:text-gray-700 transition-colors"
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '14px',
                      cursor: 'pointer',
                      padding: '8px 16px'
                    }}
                  >
                    no, I want just chatting
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
} 
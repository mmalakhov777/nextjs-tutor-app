'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronDown, Search, PlusIcon, Save, Share2, ChevronLeft, Loader2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useScenarioContext } from '@/contexts/ScenarioContext';
import { ScenariosModal } from './ScenariosModal';
import type { ScenarioData } from '@/types/scenarios';

interface ScenariosDropdownProps {
  onScenarioSelect: (scenario: ScenarioData) => void;
  disabled?: boolean;
  currentScenario?: ScenarioData | null;
  sessionId?: string;
  activeScenario?: ScenarioData | null;
  onContinueScenario?: () => void;
  activeScenarioProgress?: {
    scenario: ScenarioData;
    currentStep: number;
    completedSteps: number[];
    triggeredActions: Record<string, boolean>;
  } | null;
  isVerySmall?: boolean;
  isSmall?: boolean;
  onOpenCreateScenarioModal?: () => void;
  onCreateScenario?: (scenariosJson: string) => void;
}

export function ScenariosDropdown({
  onScenarioSelect,
  disabled = false,
  currentScenario = null,
  sessionId,
  activeScenario = null,
  onContinueScenario,
  activeScenarioProgress,
  isVerySmall = false,
  isSmall = false,
  onOpenCreateScenarioModal,
  onCreateScenario
}: ScenariosDropdownProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showScenariosModal, setShowScenariosModal] = useState(false);
  const [isSavingScenario, setIsSavingScenario] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    scenarios: contextScenarios,
    isLoading: isLoadingScenariosFromContext,
    selectedScenario,
    scenarioIdFromUrl,
    setExpandedScenario: setExpandedScenarioInContext,
  } = useScenarioContext();

  const [scenarios, setScenarios] = useState<ScenarioData[]>([]);
  const [isLoadingScenarios, setIsLoadingScenarios] = useState(true);

  // Reset UI state when currentScenario becomes null (new chat started)
  useEffect(() => {
    if (currentScenario === null) {
      // Close any open dropdowns or modals
      setShowDropdown(false);
      setShowScenariosModal(false);
      setNotification(null);
      
      console.log('ScenariosDropdown: Scenario reset detected, closing dropdowns');
    }
  }, [currentScenario]);

  // Session storage functions
  const getSessionStorageKey = (sessionId: string) => `scenarios_session_${sessionId}`;
  
  const saveScenarioToSession = (scenario: ScenarioData, sessionId: string) => {
    try {
      const key = getSessionStorageKey(sessionId);
      const existingScenarios = JSON.parse(sessionStorage.getItem(key) || '[]');
      
      // Check if scenario already exists (by ID)
      const existingIndex = existingScenarios.findIndex((s: ScenarioData) => s.id === scenario.id);
      
      if (existingIndex >= 0) {
        // Update existing scenario
        existingScenarios[existingIndex] = scenario;
      } else {
        // Add new scenario to the beginning
        existingScenarios.unshift(scenario);
      }
      
      sessionStorage.setItem(key, JSON.stringify(existingScenarios));
    } catch (error) {
      console.error('Error saving scenario to session storage:', error);
    }
  };
  
  const loadScenariosFromSession = (sessionId: string): ScenarioData[] => {
    try {
      const key = getSessionStorageKey(sessionId);
      const stored = sessionStorage.getItem(key);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading scenarios from session storage:', error);
      return [];
    }
  };
  
  const removeScenarioFromSession = (scenarioId: string, sessionId: string) => {
    try {
      const key = getSessionStorageKey(sessionId);
      const existingScenarios = JSON.parse(sessionStorage.getItem(key) || '[]');
      const filteredScenarios = existingScenarios.filter((s: ScenarioData) => s.id !== scenarioId);
      sessionStorage.setItem(key, JSON.stringify(filteredScenarios));
    } catch (error) {
      console.error('Error removing scenario from session storage:', error);
    }
  };
  
  // Helper function to get first word for dropdown button display
  const getFirstWordTitle = (title: string) => {
    return title.split(' ')[0]; // Return only the first word
  };
  
  const getActiveScenarioProgress = (sessionId: string) => {
    // Use the database-based progress passed as prop instead of sessionStorage
    if (activeScenarioProgress && activeScenarioProgress.scenario) {
      console.log('Using database-based scenario progress:', activeScenarioProgress);
      return activeScenarioProgress;
    }
    
    // Fallback to sessionStorage for backward compatibility (though this should be removed eventually)
    try {
      const key = `scenario_progress_${sessionId}`;
      const stored = sessionStorage.getItem(key);
      const progress = stored ? JSON.parse(stored) : null;
      console.log('Fallback to sessionStorage scenario progress:', { sessionId, key, stored, progress });
      return progress;
    } catch (error) {
      console.error('Error loading active scenario progress:', error);
      return null;
    }
  };

  // Sync scenarios from context and session storage
  useEffect(() => {
    let updatedScenarios = [...contextScenarios];
    
    // If there's a selected scenario from URL that's not in the context scenarios, add it
    if (selectedScenario && !contextScenarios.find(s => s.id === selectedScenario.id)) {
      updatedScenarios = [selectedScenario, ...contextScenarios];
    }
    
    // Load session-specific scenarios if sessionId is available
    if (sessionId) {
      const sessionScenarios = loadScenariosFromSession(sessionId);
      
      // Merge session scenarios with context scenarios, avoiding duplicates
      sessionScenarios.forEach(sessionScenario => {
        if (!updatedScenarios.find(s => s.id === sessionScenario.id)) {
          updatedScenarios.unshift(sessionScenario); // Add session scenarios at the beginning
        }
      });
    }
    
    setScenarios(updatedScenarios);
    setIsLoadingScenarios(isLoadingScenariosFromContext);
  }, [contextScenarios, isLoadingScenariosFromContext, selectedScenario, sessionId]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showDropdown]);

  // Function to save a scenario
  const handleSaveScenario = async (scenario: ScenarioData, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    
    setIsSavingScenario(true);
    try {
      // Transform steps to ensure agent names are properly mapped
      const transformedSteps = scenario.steps.map((step: any) => ({
        ...step,
        actions: step.actions?.map((action: any) => ({
          label: action.label,
          prompt: action.prompt,
          type: action.type,
          agent_name: action.agentName || action.agent_name
        })) || []
      }));

      const response = await fetch('/api/scenarios/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: scenario.title,
          description: scenario.description,
          goal: scenario.goal || 'Complete the scenario objectives',
          metricsOfSuccess: scenario.metricsOfSuccess || 'Successfully complete all steps',
          outcome: scenario.outcome || 'Achieve the desired result',
          category: scenario.category || 'General',
          steps: transformedSteps,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setNotification('Scenario saved successfully!');
        setTimeout(() => setNotification(null), 3000);
        
        // Update the scenario ID to the saved one
        scenario.id = result.id;
        
        // Update the scenarios array
        setScenarios(prevScenarios => 
          prevScenarios.map(s => 
            s.id === scenario.id ? { ...s, id: result.id } : s
          )
        );
        
        // Update session storage if sessionId is available
        if (sessionId) {
          // Remove the old temporary scenario and add the saved one
          removeScenarioFromSession(scenario.id, sessionId);
          saveScenarioToSession({ ...scenario, id: result.id }, sessionId);
        }
      } else {
        const error = await response.json();
        setNotification(`Failed to save scenario: ${error.error}`);
        setTimeout(() => setNotification(null), 3000);
      }
    } catch (error) {
      setNotification(`Error saving scenario: ${error}`);
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setIsSavingScenario(false);
    }
  };

  // Function to share a scenario
  const handleShareScenario = async (scenario: ScenarioData, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    
    try {
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const baseUrl = isLocal ? `${window.location.protocol}//${window.location.host}` : 'https://mystylus.ai';
      const path = isLocal ? '' : '/chat-agents';
      const shareUrl = `${baseUrl}${path}/?scenario=${scenario.id}`;
      
      await navigator.clipboard.writeText(shareUrl);
      setNotification('Scenario link copied to clipboard!');
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      // Fallback for browsers that don't support clipboard API
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const baseUrl = isLocal ? `${window.location.protocol}//${window.location.host}` : 'https://mystylus.ai';
      const path = isLocal ? '' : '/chat-agents';
      const shareUrl = `${baseUrl}${path}/?scenario=${scenario.id}`;
      
      const tempInput = document.createElement('input');
      tempInput.value = shareUrl;
      document.body.appendChild(tempInput);
      tempInput.select();
      document.execCommand('copy');
      document.body.removeChild(tempInput);
      
      setNotification('Scenario link copied to clipboard!');
      setTimeout(() => setNotification(null), 3000);
    }
  };

  // Handle scenario selection
  const handleScenarioSelect = (scenario: ScenarioData) => {
    onScenarioSelect(scenario);
    setShowDropdown(false);
  };

  // Render scenario card
  const renderScenarioCard = (scenario: ScenarioData) => {
    const isTemporaryScenario = scenario.id?.startsWith('temp-') || !scenario.id;
    
    return (
      <div 
        key={scenario.id}
        className="cursor-pointer transition-all duration-200 p-3 hover:bg-gray-50 rounded-lg"
        onClick={() => handleScenarioSelect(scenario)}
      >
        <div className="flex flex-col w-full">
          <h3 className="font-semibold text-slate-900 mb-1 text-sm">{scenario.title}</h3>
          <p className="text-xs text-slate-600 mb-2">{scenario.description}</p>
          
          {/* Save/Share buttons */}
          <div className="flex items-center gap-2">
            {isTemporaryScenario ? (
              <button
                onClick={(e) => handleSaveScenario(scenario, e)}
                disabled={isSavingScenario}
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-colors"
                style={{
                  border: '1px solid var(--Blue-Normal, #70D6FF)',
                  background: isSavingScenario ? 'var(--Monochrome-Light, #E8E8E5)' : 'var(--Blue-Normal, #70D6FF)',
                  color: isSavingScenario ? 'var(--Monochrome-Deep, #6C6C6C)' : 'white',
                  cursor: isSavingScenario ? 'not-allowed' : 'pointer'
                }}
              >
                <Save className="h-3 w-3" />
                <span>{isSavingScenario ? 'Saving...' : 'Save'}</span>
              </button>
            ) : (
              <button
                onClick={(e) => handleShareScenario(scenario, e)}
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-colors"
                style={{
                  border: '1px solid var(--Blue-Normal, #70D6FF)',
                  background: 'var(--Blue-Normal, #70D6FF)',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                <Share2 className="h-3 w-3" />
                <span>Share</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render create scenario card
  const renderCreateScenarioCard = () => {
    return (
      <div 
        className="cursor-pointer transition-all duration-200 p-3 hover:bg-blue-50 rounded-lg border border-blue-200 bg-blue-50"
        onClick={() => onOpenCreateScenarioModal?.()}
      >
        <div className="flex items-center">
          <PlusIcon className="h-4 w-4 mr-2 text-blue-600" />
          <div className="flex flex-col">
            <h3 className="font-semibold text-blue-900 text-sm">Create Scenario</h3>
            <p className="text-xs text-blue-700">Create your own walkthrough flow</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative">
      {/* Notification */}
      {notification && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-[9999]">
          {notification}
        </div>
      )}

      {/* Scenarios Dropdown */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute z-[210] scrollbar-hide"
          style={{
            bottom: '100%',
            right: '0',
            marginBottom: '8px',
            width: '320px',
            maxHeight: '400px',
            padding: '12px',
            borderRadius: '16px',
            background: '#232323',
            boxShadow: '0 10px 40px rgba(35, 35, 35, 0.2), 0 4px 12px rgba(35, 35, 35, 0.1)',
            border: '1px solid rgba(255,255,255,0.1)',
            overflow: 'auto',
          }}
        >
          <div className="py-2">
            {/* Dynamic header based on context */}
            <div className="text-xs font-semibold text-gray-300 mb-3 px-3 tracking-wide uppercase">
              {(() => {
                const activeProgress = sessionId ? getActiveScenarioProgress(sessionId) : null;
                const hasActiveScenario = activeProgress && activeProgress.scenario;
                const hasSavedScenarios = scenarios.length > 0;
                
                if (hasActiveScenario) {
                  return `Continue Scenario & More (${scenarios.length + 1} options)`;
                } else if (hasSavedScenarios) {
                  return `Saved Scenarios (${scenarios.length} available)`;
                } else {
                  return "Create New Scenario";
                }
              })()}
            </div>
            
            <div className="space-y-2">
              {/* Continue scenario option - show if there's active progress */}
              {sessionId && (() => {
                const activeProgress = getActiveScenarioProgress(sessionId);
                console.log('Continue button check:', { sessionId, activeProgress, hasScenario: activeProgress?.scenario });
                if (activeProgress && activeProgress.scenario) {
                  return (
                    <div 
                      className="cursor-pointer transition-all duration-200 p-3 hover:bg-[#3C3C3C] rounded-lg border border-green-400 bg-green-900/20"
                      onClick={() => {
                        console.log('Continue button clicked');
                        if (onContinueScenario) {
                          onContinueScenario();
                        }
                        setShowDropdown(false);
                      }}
                    >
                      <div className="flex items-center">
                        <ChevronRight className="h-4 w-4 mr-2 text-green-400" />
                        <div className="flex flex-col">
                          <h3 className="font-semibold text-green-300 text-sm">Continue: {activeProgress.scenario.title}</h3>
                          <p className="text-xs text-green-400">
                            Step {activeProgress.currentStep + 1} of {activeProgress.scenario.steps?.length || 0}
                            {activeProgress.completedSteps?.length > 0 && ` • ${activeProgress.completedSteps.length} completed`}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Create scenario card */}
              <div 
                className="cursor-pointer transition-all duration-200 p-3 hover:bg-[#3C3C3C] rounded-lg border border-blue-400 bg-blue-900/20"
                onClick={() => {
                  onOpenCreateScenarioModal?.();
                  setShowDropdown(false);
                }}
              >
                <div className="flex items-center">
                  <PlusIcon className="h-4 w-4 mr-2 text-blue-400" />
                  <div className="flex flex-col">
                    <h3 className="font-semibold text-blue-300 text-sm">Create New Scenario</h3>
                    <p className="text-xs text-blue-400">Generate a custom learning path</p>
                  </div>
                </div>
              </div>

              {/* Divider between create and saved scenarios (only if there are saved scenarios) */}
              {scenarios.length > 0 && (
                <div className="mx-2 my-3 border-t border-gray-600"></div>
              )}

              {/* Saved scenarios section */}
              {isLoadingScenarios ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-300" />
                  <span className="ml-2 text-sm text-gray-300">Loading scenarios...</span>
                </div>
              ) : scenarios.length > 0 ? (
                <>
                  {/* Section header for saved scenarios (only show if no active scenario) */}
                  {!sessionId || !getActiveScenarioProgress(sessionId)?.scenario ? (
                    <div className="text-xs font-medium text-gray-400 mb-2 px-3">
                      Your Saved Scenarios
                    </div>
                  ) : null}
                  
                  {scenarios.map(scenario => (
                    <div 
                      key={scenario.id}
                      className="cursor-pointer transition-all duration-200 p-3 hover:bg-[#3C3C3C] rounded-lg border border-gray-600 hover:border-gray-500"
                      onClick={() => handleScenarioSelect(scenario)}
                    >
                      <div className="flex flex-col w-full">
                        <h3 className="font-semibold text-white mb-1 text-sm">{scenario.title}</h3>
                        <p className="text-xs text-gray-300 mb-2 line-clamp-2">{scenario.description}</p>
                        
                        {/* Scenario metadata */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <span>{scenario.steps?.length || 0} steps</span>
                            {scenario.category && (
                              <>
                                <span>•</span>
                                <span>{scenario.category}</span>
                              </>
                            )}
                          </div>
                          
                          {/* Save/Share buttons */}
                          <div className="flex items-center gap-2">
                            {scenario.id?.startsWith('temp-') ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSaveScenario(scenario);
                                }}
                                disabled={isSavingScenario}
                                className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-colors bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-600"
                              >
                                <Save className="h-3 w-3" />
                                <span>{isSavingScenario ? 'Saving...' : 'Save'}</span>
                              </button>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleShareScenario(scenario);
                                }}
                                className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-colors bg-gray-600 text-white hover:bg-gray-700"
                              >
                                <Share2 className="h-3 w-3" />
                                <span>Share</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="px-3 py-4 text-sm text-gray-300 text-center">
                  <p className="mb-2">No saved scenarios yet</p>
                  <p className="text-xs text-gray-400">Create your first scenario to get started</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Scenarios Toggle Button */}
      <div
        className="relative flex items-center select-none cursor-pointer"
        onClick={() => !disabled && setShowDropdown(!showDropdown)}
        aria-haspopup="true"
        aria-expanded={showDropdown}
        aria-label="Select scenario"
        tabIndex={0}
        role="button"
        style={{
          display: 'flex',
          padding: isVerySmall ? '8px' : '8px 12px',
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
        <div className="flex items-center gap-2">
          <span style={{
            fontSize: '14px',
            fontWeight: 500,
            color: 'var(--Monochrome-Black, #232323)',
            whiteSpace: 'nowrap',
          }}>
            {isVerySmall 
              ? (currentScenario ? currentScenario.title.charAt(0).toUpperCase() : 'S')
              : (currentScenario ? getFirstWordTitle(currentScenario.title) : 'Scenarios')
            }
          </span>
          <ChevronDown 
            className={`h-4 w-4 text-gray-500 ml-1 transition-transform duration-200 ${showDropdown ? 'transform rotate-180' : ''}`} 
          />
        </div>
      </div>

      {/* Modals */}
      <ScenariosModal 
        isOpen={showScenariosModal}
        onOpenChange={setShowScenariosModal}
        onSelectScenario={handleScenarioSelect}
      />
    </div>
  );
} 
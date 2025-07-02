'use client';

import React from 'react';
import { Sparkles, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getAgentIcon, getAgentCircleColor, getAgentTextColor, getDisplayAgentName, getAgentShortDescription } from '@/lib/agents';
import type { ScenarioData } from '@/types/scenarios';

interface ScenarioDisplayProps {
  scenario: ScenarioData | null;
  isLoading: boolean;
  error?: Error | null;
  onRunScenario: () => void;
  onStartAgain: () => void;
}

export function ScenarioDisplay({ 
  scenario, 
  isLoading, 
  error, 
  onRunScenario, 
  onStartAgain 
}: ScenarioDisplayProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <span className="text-lg text-gray-600">Generating your scenario...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200 mb-6">
        <p className="font-semibold mb-1">Error occurred</p>
        <p>{error.message}</p>
      </div>
    );
  }

  if (!scenario) {
    return null;
  }

  const steps = scenario.steps && Array.isArray(scenario.steps)
    ? scenario.steps
    : [];
    
  const hasMultipleSteps = steps.length > 1;
  const firstStepIsDifferent = steps.length === 1 && 
    (steps[0].title !== scenario.title || steps[0].description !== scenario.description);
  const showScenarioHeader = hasMultipleSteps || firstStepIsDifferent;

  // Get all mentioned agents
  const mentionedAgents = new Set<string>();
  steps.forEach((step: any) => {
    if (step.actions && Array.isArray(step.actions)) {
      step.actions.forEach((action: any) => {
        if (action.agentName) {
          mentionedAgents.add(action.agentName);
        }
      });
    }
  });

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-4">
      {/* Scenario Content */}
      <div className="space-y-6">
        {showScenarioHeader && (
          <div className="mb-4">
            <h2 className="text-xl font-semibold mb-2">{scenario.title}</h2>
            <p className="text-sm text-gray-600 mb-3">{scenario.description}</p>
            
            {/* Goal, Metrics, and Outcome */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
              {scenario.goal && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <h3 className="text-sm font-medium text-[#232323] mb-1">Goal</h3>
                  <p className="text-xs text-gray-600">{scenario.goal}</p>
                </div>
              )}
              
              {scenario.metricsOfSuccess && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <h3 className="text-sm font-medium text-[#232323] mb-1">Metrics of Success</h3>
                  <p className="text-xs text-gray-600">{scenario.metricsOfSuccess}</p>
                </div>
              )}
              
              {scenario.outcome && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <h3 className="text-sm font-medium text-[#232323] mb-1">Expected Outcome</h3>
                  <p className="text-xs text-gray-600">{scenario.outcome}</p>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Steps */}
        {steps.length > 0 && (
          <div className="space-y-4">
            {steps.map((step: any, stepIdx: number) => (
              <div 
                key={stepIdx}
                className="p-4 border-t border-b border-gray-200"
              >
                <div className="flex items-start">
                  <div 
                    className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center mr-3 text-sm font-medium text-blue-700"
                  >
                    {stepIdx + 1}
                  </div>
                  <div className="flex-grow">
                    <h4 className="font-medium text-gray-900">{step.title || `Step ${stepIdx + 1}`}</h4>
                    <p className="text-sm text-gray-600 mb-3">{step.description || ''}</p>
                    
                    {step.actions && Array.isArray(step.actions) && (
                      <div className="space-y-2 mt-3">
                        {step.actions.map((action: any, actionIdx: number) => (
                          <div 
                            key={actionIdx}
                            className="p-4 bg-gray-50 rounded-lg"
                          >
                            <div className="flex items-center gap-2">
                              {action.agentName && (
                                <div 
                                  className={`w-6 h-6 rounded-full flex items-center justify-center p-1 flex-shrink-0 ${getAgentCircleColor(action.agentName)} ${getAgentTextColor(action.agentName)}`}
                                >
                                  {React.createElement(getAgentIcon(action.agentName), { className: "h-5 w-5" })}
                                </div>
                              )}
                              <div className="text-sm text-gray-700">{action.prompt || action.description}</div>
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

      {/* AI Agents Summary */}
      {mentionedAgents.size > 0 && (
        <div className="mt-6 p-4 bg-purple-50 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            AI Agents at your service ({mentionedAgents.size})
          </h3>
          <div className="space-y-2">
            {Array.from(mentionedAgents).map((agentName, index) => {
              const description = getAgentShortDescription(agentName);
              
              return (
                <div key={index} className="flex items-start">
                  <div 
                    className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 flex-shrink-0 mt-0.5 p-1 ${getAgentCircleColor(agentName)} ${getAgentTextColor(agentName)}`}
                  >
                    {React.createElement(getAgentIcon(agentName), { className: "h-5 w-5" })}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900">{getDisplayAgentName(agentName)}</span>
                    <span className="text-xs text-gray-600">{description}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-6 flex gap-3">
        <Button
          onClick={onStartAgain}
          variant="outline"
          className="flex-1"
        >
          Start Again
        </Button>
        
        <Button
          onClick={onRunScenario}
          className="flex-1"
          style={{
            background: 'var(--Monochrome-Black, #232323)',
            color: 'white',
            border: '1px solid var(--Monochrome-Light, #E8E8E5)'
          }}
        >
          Run Scenario
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
} 
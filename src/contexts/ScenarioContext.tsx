"use client";

import React, { createContext, useContext, useState, useEffect, Suspense } from "react";
import type { ScenarioData } from "@/types/scenarios";
import { useSearchParams } from "next/navigation";

interface ScenarioContextType {
  selectedScenario: ScenarioData | null;
  setSelectedScenario: (scenario: ScenarioData | null) => void;
  scenarios: ScenarioData[];
  isLoading: boolean;
  expandedScenario: string | null;
  setExpandedScenario: (id: string | null) => void;
  currentStep: number;
  setCurrentStep: (step: number) => void;
  completedSteps: number[];
  setCompletedSteps: (steps: number[]) => void;
  scenarioIdFromUrl: string | null;
}

const ScenarioContext = createContext<ScenarioContextType>({
  selectedScenario: null,
  setSelectedScenario: () => {},
  scenarios: [],
  isLoading: false,
  expandedScenario: null,
  setExpandedScenario: () => {},
  currentStep: 0,
  setCurrentStep: () => {},
  completedSteps: [],
  setCompletedSteps: () => {},
  scenarioIdFromUrl: null,
});

export const useScenarioContext = () => useContext(ScenarioContext);

// Create a component that uses useSearchParams inside Suspense
function ScenarioProviderContent({ children }: { children: React.ReactNode }) {
  const [scenarios, setScenarios] = useState<ScenarioData[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<ScenarioData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedScenario, setExpandedScenario] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const searchParams = useSearchParams();
  const [scenarioIdFromUrl, setScenarioIdFromUrl] = useState<string | null>(null);
  
  // First, immediately check for the scenario ID in the URL
  // This runs synchronously on first render
  useEffect(() => {
    const scenarioId = searchParams.get("scenario");
    if (scenarioId) {
      console.log("[ScenarioContext] Found scenario ID in URL:", scenarioId);
      setScenarioIdFromUrl(scenarioId);
    }
  }, [searchParams]);
  
  // Load scenarios from DB
  useEffect(() => {
    async function fetchScenarios() {
      setIsLoading(true);
      try {
        // First, fetch public scenarios
        const response = await fetch('/api/scenarios');
        const publicScenarios = await response.json();
        
        // If there's a scenario ID in the URL, also fetch that specific scenario
        let allScenarios = publicScenarios;
        
        if (scenarioIdFromUrl) {
          console.log("[ScenarioContext] Fetching specific scenario from URL:", scenarioIdFromUrl);
          
          // Fetch the specific scenario (including private ones)
          const specificResponse = await fetch(`/api/scenarios?scenario_id=${encodeURIComponent(scenarioIdFromUrl)}`);
          
          if (specificResponse.ok) {
            const specificScenarioArray = await specificResponse.json();
            if (Array.isArray(specificScenarioArray) && specificScenarioArray.length > 0) {
              const specificScenario = specificScenarioArray[0];
              
              // Check if this scenario is already in the public list
              const existsInPublic = publicScenarios.some((s: ScenarioData) => 
                String(s.id) === String(specificScenario.id)
              );
              
              if (!existsInPublic) {
                // Add the private scenario to the beginning of the list
                allScenarios = [specificScenario, ...publicScenarios];
                console.log("[ScenarioContext] Added private scenario to list:", specificScenario.title);
              }
              
              // Set as selected scenario
              setSelectedScenario(specificScenario);
              console.log("[ScenarioContext] Set selected scenario:", specificScenario.title);
            } else {
              console.log("[ScenarioContext] Scenario not found in database:", scenarioIdFromUrl);
            }
          } else {
            console.log("[ScenarioContext] Failed to fetch specific scenario:", specificResponse.status);
          }
        }
        
        setScenarios(allScenarios);
      } catch (err) {
        console.error("[ScenarioContext] Error fetching scenarios:", err);
        setScenarios([]);
      } finally {
        setIsLoading(false);
      }
    }
    fetchScenarios();
  }, [scenarioIdFromUrl]);

  return (
    <ScenarioContext.Provider
      value={{
        selectedScenario,
        setSelectedScenario,
        scenarios,
        isLoading,
        expandedScenario,
        setExpandedScenario,
        currentStep,
        setCurrentStep,
        completedSteps,
        setCompletedSteps,
        scenarioIdFromUrl,
      }}
    >
      {children}
    </ScenarioContext.Provider>
  );
}

// Export the provider with Suspense
export const ScenarioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <Suspense fallback={<div>Loading scenarios...</div>}>
      <ScenarioProviderContent>{children}</ScenarioProviderContent>
    </Suspense>
  );
}; 
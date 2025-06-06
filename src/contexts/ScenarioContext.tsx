"use client";

import React, { createContext, useContext, useState, useEffect, Suspense } from "react";
import type { ScenarioData } from "@/types/scenarios";
import { useSearchParams } from "next/navigation";
import { getScenariosFromDB } from "@/data/scenarios";

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

  useEffect(() => {
    async function fetchScenarios() {
      setIsLoading(true);
      try {
        const dbScenarios = await getScenariosFromDB();
        setScenarios(dbScenarios);
      } catch (err) {
        setScenarios([]);
      } finally {
        setIsLoading(false);
      }
    }
    fetchScenarios();
  }, []);

  // Automatically select scenario from URL param if present
  useEffect(() => {
    if (!isLoading && scenarios.length > 0) {
      const scenarioId = searchParams.get("scenario");
      if (scenarioId) {
        const found = scenarios.find((s) => String(s.id) === String(scenarioId));
        if (found) setSelectedScenario(found);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, scenarios, searchParams]);

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
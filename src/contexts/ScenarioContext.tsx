"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import type { ScenarioData } from "@/types/scenarios";
import { useSearchParams } from "next/navigation";
import { getScenariosFromDB } from "@/data/scenarios";

interface ScenarioContextType {
  selectedScenario: ScenarioData | null;
  setSelectedScenario: (scenario: ScenarioData | null) => void;
  scenarios: ScenarioData[];
  isLoading: boolean;
}

const ScenarioContext = createContext<ScenarioContextType>({
  selectedScenario: null,
  setSelectedScenario: () => {},
  scenarios: [],
  isLoading: false,
});

export const useScenarioContext = () => useContext(ScenarioContext);

export const ScenarioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [scenarios, setScenarios] = useState<ScenarioData[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<ScenarioData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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
      value={{ selectedScenario, setSelectedScenario, scenarios, isLoading }}
    >
      {children}
    </ScenarioContext.Provider>
  );
}; 
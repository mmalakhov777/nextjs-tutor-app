import { LucideIcon } from "lucide-react";

export interface ScenarioAction {
  label: string;
  prompt: string;
  type?: 'research' | 'chat';
}

export interface ScenarioStep {
  title: string;
  description: string;
  actions?: ScenarioAction[];
}

export interface ScenarioData {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
  category?: string;
  steps: ScenarioStep[];
} 
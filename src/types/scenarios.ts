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
  icon?: LucideIcon | string;
  color: string;
  category?: string;
  discord?: string;
  social_link?: string;
  steps: ScenarioStep[];
} 
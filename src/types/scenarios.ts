import { LucideIcon } from "lucide-react";

export interface ScenarioAction {
  label: string;
  prompt: string;
  type?: 'research' | 'chat';
  agentName?: string;
  agent_name?: string; // For database compatibility
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
  goal?: string;
  metricsOfSuccess?: string;
  outcome?: string;
  icon?: LucideIcon | string;
  color: string;
  category?: string;
  discord?: string;
  social_link?: string;
  private?: string | boolean;
  steps: ScenarioStep[];
} 
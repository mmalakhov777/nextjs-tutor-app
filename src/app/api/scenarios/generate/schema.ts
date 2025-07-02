import { z } from 'zod';

// Define the schema for scenario actions
export const ActionSchema = z.object({
  label: z.string().describe("A short label for the action (what the user wants to do)"),
  prompt: z.string().describe("A detailed prompt/question the user would ask to accomplish this action"),
  agentName: z.string().describe("The name of the AI agent best suited for this action based on their specialization. Choose from: General Assistant, Grok X, Mistral Europe, Claude Creative, Deep Seek, Perplexity, Deep Thinker")
});

// Define the schema for individual steps within a scenario
export const StepSchema = z.object({
  title: z.string().describe("A clear, action-oriented title for this step (e.g., 'Research Key European Events in WWII')"),
  description: z.string().describe("A brief description of what will be accomplished in this step"),
  actions: z.array(ActionSchema).length(1).describe("An array with exactly 1 specific action/command to complete this step")
});

// Define the schema for individual scenarios
export const ScenarioSchema = z.object({
  title: z.string().describe("A short, clear name for the scenario"),
  description: z.string().describe("A concise explanation of the scenario's purpose"),
  goal: z.string().describe("The primary objective or learning goal of this scenario"),
  metricsOfSuccess: z.string().describe("How to measure if this scenario was successful"),
  outcome: z.string().describe("The expected result or benefit after completing this scenario"),
  steps: z.array(StepSchema).min(1).max(10).describe("An array of 1-10 sequential steps that break down the scenario into manageable phases. Each step should be a distinct phase of work (e.g., Research, Analysis, Creation, Review). For text generation scenarios, include additional steps for writing each section/chapter. The final step should be a completion/delivery step.")
});

// Define the overall schema as an object with a scenarios array property
export const ResponseSchema = z.object({
  scenarios: z.array(ScenarioSchema).length(1)
    .describe("An array containing exactly 1 actionable scenario workflow")
}); 
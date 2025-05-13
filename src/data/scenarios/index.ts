import { neon } from '@neondatabase/serverless';
import { ScenarioData, ScenarioStep, ScenarioAction } from '@/types/scenarios';

// Use a connection string that can be overridden by environment variables
const connectionString = process.env.DATABASE_URL || 'postgres://neondb_owner:npg_S0YKqMtpUVR5@ep-hidden-resonance-a2ztn4wm-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require';

// Create the SQL client
let sql: any;

try {
  sql = neon(connectionString);
} catch (error) {
  console.error('Failed to create database connection:', error);
  // Create a dummy SQL function that returns empty arrays
  sql = () => Promise.resolve([]);
}

export async function getScenariosFromDB(): Promise<ScenarioData[]> {
  try {
    // Get all scenarios
    const scenarios = await sql`SELECT * FROM scenarios`;
    // Get all steps
    const steps = await sql`SELECT * FROM scenario_steps`;
    // Get all actions
    const actions = await sql`SELECT * FROM scenario_actions`;

    // Group actions by step_id
    const actionsByStep: Record<number, ScenarioAction[]> = {};
    for (const action of actions) {
      if (!actionsByStep[action.step_id]) actionsByStep[action.step_id] = [];
      actionsByStep[action.step_id].push({
        label: action.label,
        prompt: action.prompt,
        type: action.type as 'research' | 'chat' | undefined
      });
    }

    // Group steps by scenario_id
    const stepsByScenario: Record<string, ScenarioStep[]> = {};
    for (const step of steps) {
      if (!stepsByScenario[step.scenario_id]) stepsByScenario[step.scenario_id] = [];
      stepsByScenario[step.scenario_id].push({
        title: step.title,
        description: step.description,
        actions: actionsByStep[step.id] || [],
      });
    }

    // Build scenarios array
    return scenarios.map((scenario: any) => ({
      id: scenario.id,
      title: scenario.title,
      description: scenario.description,
      icon: scenario.icon,
      color: scenario.color,
      category: scenario.category,
      steps: stepsByScenario[scenario.id] || [],
    }));
  } catch (error) {
    console.error('Error fetching scenarios from database:', error);
    return []; // Return empty array on error
  }
}

import { neon } from '@neondatabase/serverless';
import { ScenarioData, ScenarioStep, ScenarioAction } from '@/types/scenarios';

// Use a connection string that can be overridden by environment variables
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL not set');
}

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
        type: action.type as 'research' | 'chat' | undefined,
        agentName: action.agent_name,
        agent_name: action.agent_name
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
    const allScenarios = scenarios.map((scenario: any) => ({
      id: scenario.id,
      title: scenario.title,
      description: scenario.description,
      goal: scenario.goal,
      metricsOfSuccess: scenario.metrics_of_success,
      outcome: scenario.outcome,
      // We're not using icons anymore, but keep the field for backward compatibility
      icon: undefined, 
      color: scenario.color,
      category: scenario.category,
      discord: scenario.discord,
      social_link: scenario.social_link,
      private: scenario.private,
      steps: stepsByScenario[scenario.id] || [],
    }));
    
    // Filter out private scenarios
    const publicScenarios = allScenarios.filter((scenario: ScenarioData & { private?: string }) => !scenario.private);
    
    console.log(`Scenarios: Showing ${publicScenarios.length} public scenarios out of ${allScenarios.length} total`);
    
    return publicScenarios;
  } catch (error) {
    console.error('Error fetching scenarios from database:', error);
    return []; // Return empty array on error
  }
}

export async function getScenarioById(scenarioId: string): Promise<ScenarioData | null> {
  try {
    // Get the specific scenario
    const scenarios = await sql`SELECT * FROM scenarios WHERE id = ${scenarioId}`;
    
    if (scenarios.length === 0) {
      return null;
    }
    
    const scenario = scenarios[0];
    
    // Get steps for this scenario
    const steps = await sql`SELECT * FROM scenario_steps WHERE scenario_id = ${scenarioId} ORDER BY id`;
    
    // Get all actions for these steps
    const stepIds = steps.map((s: any) => s.id);
    const actions = stepIds.length > 0 
      ? await sql`SELECT * FROM scenario_actions WHERE step_id = ANY(${stepIds}) ORDER BY id`
      : [];

    // Group actions by step_id
    const actionsByStep: Record<number, ScenarioAction[]> = {};
    for (const action of actions) {
      if (!actionsByStep[action.step_id]) actionsByStep[action.step_id] = [];
      actionsByStep[action.step_id].push({
        label: action.label,
        prompt: action.prompt,
        type: action.type as 'research' | 'chat' | undefined,
        agentName: action.agent_name,
        agent_name: action.agent_name
      });
    }

    // Build steps with actions
    const scenarioSteps: ScenarioStep[] = steps.map((step: any) => ({
      title: step.title,
      description: step.description,
      actions: actionsByStep[step.id] || [],
    }));

    // Build and return the scenario
    return {
      id: scenario.id,
      title: scenario.title,
      description: scenario.description,
      goal: scenario.goal,
      metricsOfSuccess: scenario.metrics_of_success,
      outcome: scenario.outcome,
      icon: undefined,
      color: scenario.color,
      category: scenario.category,
      discord: scenario.discord,
      social_link: scenario.social_link,
      private: scenario.private,
      steps: scenarioSteps,
    };
  } catch (error) {
    console.error('Error fetching scenario by ID from database:', error);
    return null;
  }
}

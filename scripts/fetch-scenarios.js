// scripts/fetch-scenarios.js
import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';

// Initialize environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

// Load environment variables from the appropriate .env file
const envFile = process.env.NODE_ENV === 'production' 
  ? '.env.production'
  : process.env.NODE_ENV === 'development'
    ? '.env.development.local'
    : '.env.local';

dotenv.config({ path: resolve(rootDir, envFile) });

// Use the connection string from environment variables
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('Error: DATABASE_URL not set in environment variables');
  process.exit(1);
}

// Create the SQL client
let sql;
try {
  sql = neon(connectionString);
} catch (error) {
  console.error('Failed to create database connection:', error);
  process.exit(1);
}

async function fetchScenarios() {
  try {
    // Process command line arguments
    const args = process.argv.slice(2); // Remove node and script name
    const showPrivate = args.includes('--show-private');
    console.log('Command arguments:', args);
    console.log('Show private scenarios:', showPrivate);
    
    // Get all scenarios
    const scenarios = await sql`SELECT * FROM scenarios`;
    
    // Get all steps
    const steps = await sql`SELECT * FROM scenario_steps`;
    
    // Get all actions
    const actions = await sql`SELECT * FROM scenario_actions`;

    // Group actions by step_id
    const actionsByStep = {};
    for (const action of actions) {
      if (!actionsByStep[action.step_id]) actionsByStep[action.step_id] = [];
      actionsByStep[action.step_id].push({
        label: action.label,
        prompt: action.prompt,
        type: action.type
      });
    }

    // Group steps by scenario_id
    const stepsByScenario = {};
    for (const step of steps) {
      if (!stepsByScenario[step.scenario_id]) stepsByScenario[step.scenario_id] = [];
      stepsByScenario[step.scenario_id].push({
        title: step.title,
        description: step.description,
        actions: actionsByStep[step.id] || [],
      });
    }

    // Build scenarios array
    let result = scenarios.map((scenario) => ({
      id: scenario.id,
      title: scenario.title,
      description: scenario.description,
      color: scenario.color,
      category: scenario.category,
      discord: scenario.discord,
      social_link: scenario.social_link,
      private: scenario.private,
      steps: stepsByScenario[scenario.id] || [],
    }));
    
    // Filter out private scenarios if showPrivate flag is not set
    if (!showPrivate) {
      const totalCount = result.length;
      result = result.filter(scenario => !scenario.private);
      console.log(`Filtered: Showing only public scenarios (${result.length} of ${totalCount} total)`);
    } else {
      console.log(`Showing all scenarios (${result.length} total)`);
    }
    
    // Determine output format and file path
    let outputFormat = 'json';
    let outputFilePath = null;
    
    for (const arg of args) {
      if (arg === 'pretty') {
        outputFormat = 'pretty';
      } else if (arg.endsWith('.json')) {
        outputFilePath = arg;
      }
    }
    
    const formattedOutput = 
      outputFormat === 'pretty' 
        ? JSON.stringify(result, null, 2) 
        : JSON.stringify(result);
    
    if (outputFilePath) {
      fs.writeFileSync(outputFilePath, formattedOutput);
      console.log(`Scenarios successfully written to ${outputFilePath}`);
    } else {
      console.log(formattedOutput);
    }
    
    return result;
  } catch (error) {
    console.error('Error fetching scenarios from database:', error);
    process.exit(1);
  }
}

// Execute the fetch function
fetchScenarios(); 
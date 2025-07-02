# Scenario Fetching Process

This document explains how scenarios are fetched from the database in the application.

## Database Connection

The application connects to a PostgreSQL database (likely hosted on Neon) using the `@neondatabase/serverless` package:

```typescript
import { neon } from '@neondatabase/serverless';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL not set');
}

let sql: any;
try {
  sql = neon(connectionString);
} catch (error) {
  console.error('Failed to create database connection:', error);
  // Fallback to a dummy function that returns empty arrays
  sql = () => Promise.resolve([]);
}
```

## Data Model

The database has three main tables for scenarios:

1. `scenarios` - Stores basic scenario information (id, title, description, etc.)
2. `scenario_steps` - Stores steps associated with scenarios (linked by scenario_id)
3. `scenario_actions` - Stores actions associated with steps (linked by step_id)

The relationship is hierarchical:
- Scenarios have many Steps
- Steps have many Actions

## Fetching Process

The `getScenariosFromDB()` function fetches and assembles complete scenario data:

1. Fetch all records from all three tables:
   ```typescript
   const scenarios = await sql`SELECT * FROM scenarios`;
   const steps = await sql`SELECT * FROM scenario_steps`;
   const actions = await sql`SELECT * FROM scenario_actions`;
   ```

2. Group actions by their associated step_id:
   ```typescript
   const actionsByStep: Record<number, ScenarioAction[]> = {};
   for (const action of actions) {
     if (!actionsByStep[action.step_id]) actionsByStep[action.step_id] = [];
     actionsByStep[action.step_id].push({
       label: action.label,
       prompt: action.prompt,
       type: action.type as 'research' | 'chat' | undefined
     });
   }
   ```

3. Group steps by their associated scenario_id:
   ```typescript
   const stepsByScenario: Record<string, ScenarioStep[]> = {};
   for (const step of steps) {
     if (!stepsByScenario[step.scenario_id]) stepsByScenario[step.scenario_id] = [];
     stepsByScenario[step.scenario_id].push({
       title: step.title,
       description: step.description,
       actions: actionsByStep[step.id] || [],
     });
   }
   ```

4. Assemble the final scenario objects with their associated steps and actions:
   ```typescript
   const result = scenarios.map((scenario: any) => ({
     id: scenario.id,
     title: scenario.title,
     description: scenario.description,
     icon: undefined, // No longer used but kept for backward compatibility
     color: scenario.color,
     category: scenario.category,
     discord: scenario.discord,
     social_link: scenario.social_link,
     steps: stepsByScenario[scenario.id] || [],
   }));
   ```

## Error Handling

If any error occurs during the fetching process, it's caught, logged, and an empty array is returned:

```typescript
try {
  // Fetching logic...
} catch (error) {
  console.error('Error fetching scenarios from database:', error);
  return []; // Return empty array on error
}
```

## Return Value

The function returns an array of `ScenarioData` objects, each containing complete information about a scenario including all its steps and actions.

## Fetching Scenarios via Terminal

You can fetch scenarios directly from the terminal using a provided script. This is useful for debugging, data export, or other administrative tasks.

### Usage

Run the following command from the project root:

```bash
npm run fetch-scenarios [format] [output-file]
```

Parameters:
- `format` (optional): Output format. Use "pretty" for formatted JSON. Default is compact JSON.
- `output-file` (optional): Path to save output. If not provided, output is printed to console.

### Examples

1. Print scenarios to console in compact JSON format:
   ```bash
   npm run fetch-scenarios
   ```

2. Print scenarios to console in pretty-printed JSON format:
   ```bash
   npm run fetch-scenarios pretty
   ```

3. Save scenarios to a file in pretty-printed format:
   ```bash
   npm run fetch-scenarios pretty ./data/scenarios.json
   ```

The script uses the same database connection and fetching logic as the application, ensuring consistency across different methods of accessing the data. 
import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { z } from 'zod';

// Database connection
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL not set');
}
const sql = neon(connectionString);

// Function to generate random color
function generateRandomColor(): string {
  const colors = [
    '#4F46E5', // Indigo
    '#7C3AED', // Violet
    '#DC2626', // Red
    '#EA580C', // Orange
    '#D97706', // Amber
    '#65A30D', // Lime
    '#059669', // Emerald
    '#0891B2', // Cyan
    '#0284C7', // Sky
    '#2563EB', // Blue
    '#7C2D12', // Rose
    '#BE185D', // Pink
    '#A21CAF', // Fuchsia
    '#86198F', // Purple
    '#1E40AF', // Blue
    '#166534', // Green
    '#92400E', // Yellow
    '#B91C1C', // Red
    '#1F2937', // Gray
    '#374151', // Gray
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Schema validation for incoming request
const ScenarioActionSchema = z.object({
  label: z.string(),
  prompt: z.string(),
  agent_name: z.string().optional(),
  type: z.enum(['research', 'chat']).optional(),
});

const ScenarioStepSchema = z.object({
  title: z.string(),
  description: z.string(),
  actions: z.array(ScenarioActionSchema),
});

const ScenarioSchema = z.object({
  title: z.string(),
  description: z.string(),
  goal: z.string(),
  metricsOfSuccess: z.string(),
  outcome: z.string(),
  color: z.string().optional(),
  category: z.string().optional().default('General'),
  discord: z.string().optional(),
  social_link: z.string().optional(),
  steps: z.array(ScenarioStepSchema).min(1),
});

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    
    // Validate against our schema
    const validationResult = ScenarioSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid scenario data', 
          details: validationResult.error.format() 
        },
        { status: 400 }
      );
    }
    
    const scenario = validationResult.data;
    
    // Generate random color if not provided
    const color = scenario.color || generateRandomColor();
    
    // Generate a unique ID for the scenario
    const scenarioId = `${scenario.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`;

    // Begin transaction
    await sql`BEGIN`;
    
    try {
      // Insert scenario with new fields
      await sql`
        INSERT INTO scenarios (
          id, title, description, goal, metrics_of_success, outcome, 
          color, category, discord, social_link, private
        )
        VALUES (
          ${scenarioId}, ${scenario.title}, ${scenario.description}, 
          ${scenario.goal}, ${scenario.metricsOfSuccess}, ${scenario.outcome},
          ${color}, ${scenario.category}, ${scenario.discord}, ${scenario.social_link}, 'true'
        )
      `;
      
      // Insert steps and actions
      for (let i = 0; i < scenario.steps.length; i++) {
        const step = scenario.steps[i];
        
        // Insert step
        const stepResult = await sql`
          INSERT INTO scenario_steps (scenario_id, step_order, title, description)
          VALUES (${scenarioId}, ${i + 1}, ${step.title}, ${step.description})
          RETURNING id
        `;
        
        const stepId = stepResult[0].id;
        
        // Insert actions for this step
        if (step.actions && step.actions.length > 0) {
          for (let j = 0; j < step.actions.length; j++) {
            const action = step.actions[j];
            
            await sql`
              INSERT INTO scenario_actions (
                step_id, action_order, label, prompt, agent_name
              )
              VALUES (
                ${stepId}, ${j + 1}, ${action.label}, ${action.prompt}, ${action.agent_name}
              )
            `;
          }
        }
      }
      
      // Commit transaction
      await sql`COMMIT`;
      
      return NextResponse.json(
        { 
          success: true, 
          message: 'Scenario saved successfully', 
          id: scenarioId 
        },
        { status: 201 }
      );
    } catch (dbError) {
      // Rollback on error
      await sql`ROLLBACK`;
      console.error('Database error:', dbError);
      
      return NextResponse.json(
        { error: 'Database error', details: String(dbError) },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error processing request:', error);
    
    return NextResponse.json(
      { error: 'Error processing request', details: String(error) },
      { status: 500 }
    );
  }
} 
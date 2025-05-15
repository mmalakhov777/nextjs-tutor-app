import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { z } from 'zod';
import { ScenarioData } from '@/types/scenarios';

// Database connection
const connectionString = process.env.DATABASE_URL || 'postgres://neondb_owner:npg_S0YKqMtpUVR5@ep-hidden-resonance-a2ztn4wm-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require';
const sql = neon(connectionString);

// Schema validation for incoming request
const ScenarioActionSchema = z.object({
  label: z.string(),
  prompt: z.string(),
  type: z.enum(['research', 'chat']).optional(),
});

const ScenarioStepSchema = z.object({
  title: z.string(),
  description: z.string(),
  actions: z.array(ScenarioActionSchema).optional(),
});

const ScenarioSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  color: z.string(),
  category: z.string().optional(),
  steps: z.array(ScenarioStepSchema),
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
    
    // Begin transaction
    await sql`BEGIN`;
    
    try {
      // Insert scenario
      await sql`
        INSERT INTO scenarios (id, title, description, color, category)
        VALUES (${scenario.id}, ${scenario.title}, ${scenario.description}, ${scenario.color}, ${scenario.category})
        ON CONFLICT (id) DO UPDATE SET
          title = ${scenario.title},
          description = ${scenario.description},
          color = ${scenario.color},
          category = ${scenario.category}
      `;
      
      // Delete existing steps and actions to replace them
      const existingSteps = await sql`SELECT id FROM scenario_steps WHERE scenario_id = ${scenario.id}`;
      
      for (const step of existingSteps) {
        await sql`DELETE FROM scenario_actions WHERE step_id = ${step.id}`;
      }
      
      await sql`DELETE FROM scenario_steps WHERE scenario_id = ${scenario.id}`;
      
      // Insert new steps and actions
      for (let i = 0; i < scenario.steps.length; i++) {
        const step = scenario.steps[i];
        
        // Insert step
        const stepResult = await sql`
          INSERT INTO scenario_steps (scenario_id, step_order, title, description)
          VALUES (${scenario.id}, ${i + 1}, ${step.title}, ${step.description})
          RETURNING id
        `;
        
        const stepId = stepResult[0].id;
        
        // Insert actions for this step
        if (step.actions && step.actions.length > 0) {
          for (let j = 0; j < step.actions.length; j++) {
            const action = step.actions[j];
            
            await sql`
              INSERT INTO scenario_actions (step_id, action_order, label, prompt, type)
              VALUES (${stepId}, ${j + 1}, ${action.label}, ${action.prompt}, ${action.type || null})
            `;
          }
        }
      }
      
      // Commit transaction
      await sql`COMMIT`;
      
      return NextResponse.json(
        { success: true, message: 'Scenario created successfully', id: scenario.id },
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
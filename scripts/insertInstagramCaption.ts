// This script is preserved for historical reference but is no longer used
// It was used to initially migrate data to the database
/*
import { neon } from '@neondatabase/serverless';
import { instagramCaption } from '../src/data/scenarios/instagramCaption';

const sql = neon('postgres://neondb_owner:npg_S0YKqMtpUVR5@ep-hidden-resonance-a2ztn4wm-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require');

async function insertScenario() {
  // Insert scenario
  await sql`
    INSERT INTO scenarios (id, title, description, icon, color)
    VALUES (${instagramCaption.id}, ${instagramCaption.title}, ${instagramCaption.description}, ${'Image'}, ${instagramCaption.color})
    ON CONFLICT (id) DO NOTHING
  `;

  // Insert steps and actions
  for (let i = 0; i < instagramCaption.steps.length; i++) {
    const step = instagramCaption.steps[i];
    const stepResult = await sql`
      INSERT INTO scenario_steps (scenario_id, step_order, title, description)
      VALUES (${instagramCaption.id}, ${i + 1}, ${step.title}, ${step.description})
      RETURNING id
    `;
    const stepId = stepResult[0].id;

    for (let j = 0; j < (step.actions?.length || 0); j++) {
      const action = step.actions![j];
      await sql`
        INSERT INTO scenario_actions (step_id, action_order, label, prompt)
        VALUES (${stepId}, ${j + 1}, ${action.label}, ${action.prompt})
      `;
    }
  }
}

insertScenario()
  .then(() => {
    console.log('Scenario inserted!');
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  }); 
*/

// This script is now disabled as we've moved to database-based scenarios 
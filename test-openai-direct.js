// Simple script to test OpenAI API directly
const { openai } = require('@ai-sdk/openai');
const { generateObject } = require('ai');
const { z } = require('zod');
require('dotenv').config({ path: '.env.local' });

// Define the schema for scenario actions
const ActionSchema = z.object({
  label: z.string().describe("A short label for the action (what the user wants to do)"),
  prompt: z.string().describe("A detailed prompt/question the user would ask to accomplish this action")
});

// Define the schema for individual scenarios
const ScenarioSchema = z.object({
  title: z.string().describe("A short, clear name for the scenario"),
  description: z.string().describe("A concise explanation of the scenario's purpose"),
  actions: z.array(ActionSchema).min(2).max(4).describe("An array of 2-4 actions for this scenario")
});

// Define the overall schema as an object with a scenarios array property
const ResponseSchema = z.object({
  scenarios: z.array(ScenarioSchema).min(1).max(2)
    .describe("An array of actionable business, marketing, or productivity scenario workflows")
});

async function testOpenAI() {
  try {
    console.log('Testing OpenAI API directly...');
    console.log('Using API key:', process.env.OPENAI_API_KEY?.substring(0, 10) + '...');

    const result = await generateObject({
      model: openai('gpt-4.1', {
        structuredOutputs: true,
      }),
      schema: ResponseSchema,
      schemaName: 'scenario_response',
      schemaDescription: 'A response containing an array of actionable scenarios',
      prompt: `Create structured, actionable scenarios based on this request: Create a marketing campaign for a new product launch

Each scenario should have a title, description, and 2-4 actions. Each action should have a label and prompt.
Make the scenarios practical, helpful, and directly related to the user's request.`,
      temperature: 0.7,
      maxTokens: 2000,
    });

    console.log('\nGenerated result:');
    console.log(JSON.stringify(result.object, null, 2));
  } catch (error) {
    console.error('Error testing OpenAI API:', error);
  }
}

testOpenAI(); 
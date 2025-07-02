import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';
import { AGENT_REGISTRY, getAgentShortDescription, getAgentHandoffCriteria, isAgent } from '@/lib/agents';

// Allow up to 30 seconds for agent selection
export const maxDuration = 30;

// Response schema for structured output
const AgentSelectionSchema = z.object({
  selectedAgent: z.string().describe('The name of the most appropriate agent to handle this request'),
  confidence: z.number().min(0).max(1).describe('Confidence score between 0 and 1 for the agent selection'),
  reasoning: z.string().describe('Brief explanation of why this agent was selected'),
  alternatives: z.array(z.string()).optional().describe('Alternative agents that could also handle this request')
});

// Request body schema
const RequestSchema = z.object({
  message: z.string().describe('The user message to analyze'),
  chatHistory: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string(),
    agentName: z.string().optional()
  })).optional().describe('Recent chat history for context'),
  currentAgent: z.string().optional().describe('Currently selected agent'),
  userId: z.string().optional(),
  conversationId: z.string().optional()
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message, chatHistory = [], currentAgent } = RequestSchema.parse(body);

    // Get all available agents (excluding models) with their descriptions and handoff criteria
    const availableAgents = Object.keys(AGENT_REGISTRY)
      .filter(agentName => isAgent(agentName)) // Only include agents, not models
      .map(agentName => {
        const handoffCriteria = getAgentHandoffCriteria(agentName);
        return {
          name: agentName,
          description: getAgentShortDescription(agentName),
          capabilities: AGENT_REGISTRY[agentName as keyof typeof AGENT_REGISTRY].systemPrompt.slice(0, 200) + '...',
          keywords: handoffCriteria.keywords.join(', '),
          contexts: handoffCriteria.contexts.join(', '),
          taskTypes: handoffCriteria.taskTypes.join(', '),
          shouldHandoffWhen: handoffCriteria.shouldHandoffWhen.join(', '),
          shouldNotHandoffWhen: handoffCriteria.shouldNotHandoffWhen.join(', ')
        };
      });

    // Build context from chat history
    const historyContext = chatHistory.length > 0 
      ? `\n\nRecent conversation context:\n${chatHistory.slice(-5).map(msg => 
          `${msg.role}: ${msg.content.slice(0, 100)}${msg.content.length > 100 ? '...' : ''}`
        ).join('\n')}`
      : '';

    // Create system prompt for agent selection
    const systemPrompt = `You are an intelligent agent router. Your job is to analyze user messages and select the most appropriate AI agent to handle the request.

Available agents with handoff criteria:
${availableAgents.map(agent => `
- ${agent.name}: ${agent.description}
  • Keywords: ${agent.keywords}
  • Contexts: ${agent.contexts}
  • Task Types: ${agent.taskTypes}
  • Should handoff when: ${agent.shouldHandoffWhen}
  • Should NOT handoff when: ${agent.shouldNotHandoffWhen}
`).join('\n')}

Current agent: ${currentAgent || 'None'}

Guidelines:
1. **Use handoff criteria**: Match user message keywords, context, and task type to agent criteria
2. **Check handoff conditions**: Use "should handoff when" and "should NOT handoff when" criteria
3. **Consider conversation context**: If user is continuing a specific task, prefer the same agent unless criteria clearly indicate a switch
4. **Do NOT change the agent for short, affirmative, negative, or numeric answers**: If the user message is something like 'yes', 'no', 'maybe', 'ok', 'sure', or is just a number (e.g., '42', '3', '100%'), you should almost never change the agent. Only switch if there is an extremely clear and strong reason.
5. **Keyword matching**: Look for specific keywords that match agent specializations
6. **Context awareness**: Consider the overall conversation context and task flow
7. **Default to General Assistant**: For unclear or general requests that don't match specific criteria
8. **Confidence scoring**: High confidence (0.8+) for clear keyword/criteria matches, lower for ambiguous requests

User message: "${message}"${historyContext}

Analyze the message against each agent's handoff criteria and select the best match.`;

    // Generate structured response
    const result = await generateObject({
      model: openai('gpt-4.1'),
      schema: AgentSelectionSchema,
      system: systemPrompt,
      prompt: `Analyze this user message and select the most appropriate agent: "${message}"`,
      temperature: 0.1, // Low temperature for consistent selections
    });

    // Validate that the selected agent exists and is an agent (not a model)
    if (!AGENT_REGISTRY[result.object.selectedAgent as keyof typeof AGENT_REGISTRY] || 
        !isAgent(result.object.selectedAgent)) {
      // Fallback to General Assistant if selected agent doesn't exist or is a model
      result.object.selectedAgent = 'General Assistant';
      result.object.reasoning = 'Selected agent not found or is a model (not available for auto-selection), defaulting to General Assistant';
      result.object.confidence = 0.5;
    }

    return Response.json({
      success: true,
      ...result.object,
      availableAgents: availableAgents.map(a => a.name),
      currentAgent,
      messageAnalyzed: message.slice(0, 100) + (message.length > 100 ? '...' : '')
    });

  } catch (error) {
    console.error('Agent selection error:', error);
    
    return Response.json({
      success: false,
      error: 'Failed to select agent',
      details: error instanceof Error ? error.message : String(error),
      // Fallback to General Assistant
      selectedAgent: 'General Assistant',
      confidence: 0.3,
      reasoning: 'Error occurred during agent selection, defaulting to General Assistant'
    }, { status: 500 });
  }
} 
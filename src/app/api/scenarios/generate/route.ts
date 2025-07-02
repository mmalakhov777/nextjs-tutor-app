import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { ResponseSchema } from './schema';
import { AGENT_REGISTRY } from '@/lib/agents';
// Import tools from tools index
import { 
  weatherTool, 
  mathTool, 
  writeTextTool,
  SEO_AGENT_TOOLS,
  FLASHCARD_TOOLS,
  generalAssistantTools,
  contentWriterTools
} from '@/lib/tools';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

// Create comprehensive agent information including tools
const createAgentInformation = () => {
  const agentInfo: Record<string, {
    description: string;
    capabilities: string[];
    tools: string[];
  }> = {};

  Object.entries(AGENT_REGISTRY).forEach(([name, config]) => {
    // Extract tool names from the agent configuration
    const toolNames: string[] = [];
    if (config.tools) {
      if (typeof config.tools === 'object') {
        toolNames.push(...Object.keys(config.tools));
      }
    }

    agentInfo[name] = {
      description: config.description || 'No description available',
      capabilities: config.capabilities || [],
      tools: toolNames
    };
  });

  return agentInfo;
};

// Generate comprehensive agent information
const AVAILABLE_AGENTS = createAgentInformation();

// Create agent specializations text for the prompt
const createAgentSpecializationsText = () => {
  return Object.entries(AVAILABLE_AGENTS)
    .map(([name, info]) => {
      const toolsList = info.tools.length > 0 ? `\n  Available Tools: ${info.tools.join(', ')}` : '';
      const capabilitiesList = info.capabilities.length > 0 ? `\n  Capabilities: ${info.capabilities.join(', ')}` : '';
      return `- ${name}: ${info.description}${toolsList}${capabilitiesList}`;
    })
    .join('\n\n');
};

// Remove local schema definitions as they are now imported
// const ActionSchema = z.object({ ... });
// const ScenarioSchema = z.object({ ... });
// const LocalResponseSchema = z.object({ ... }); // Renamed to avoid conflict if any local use was intended

// This endpoint will process the scenario creation prompt and return the AI response
export async function POST(req: Request) {
  console.log('POST request received to /api/scenarios/generate');
  try {
    const body = await req.json();
    const { prompt } = body;
    
    console.log('Request body:', body);
    
    if (!prompt) {
      console.error('Error: Prompt is required');
      return new Response(JSON.stringify({ error: 'Prompt is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('Generating object with prompt:', prompt);
    
    // Check for OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      console.error('Error: OPENAI_API_KEY environment variable is not set');
      return new Response(
        JSON.stringify({ error: 'OpenAI API key is not configured' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Generate the object with structured output
    try {
      const result = await generateObject({
        model: openai('gpt-4o', {
          structuredOutputs: true,
        }),
        schema: ResponseSchema,
        schemaName: 'scenario_response',
        schemaDescription: 'A response containing exactly 1 actionable scenario with at least 4 steps',
        prompt: `Create a structured, actionable scenario based on this request: ${prompt}

IMPORTANT: Generate EXACTLY 1 SCENARIO ONLY - Do not create multiple scenarios.

AVAILABLE AI AGENTS WITH THEIR SPECIALIZATIONS, CAPABILITIES, AND TOOLS:
${createAgentSpecializationsText()}

CRITICAL RULE - ADAPT USER REQUESTS TO AGENT CAPABILITIES:
You MUST analyze what the user wants and adapt it to what agents can ACTUALLY do. Never create commands that exceed agent capabilities.

AGENT CAPABILITY BOUNDARIES:
1. General Assistant: Can do general tasks, weather info, and basic math - CANNOT do specialized research or creative writing
2. SEO Agent: Can ONLY do SEO analysis, keyword research, and web content analysis - CANNOT write content (use Content Writer for that)
3. Content Writer Agent: Can ONLY write final text content - CANNOT do research, planning, or analysis
4. Flash Card Maker: Can ONLY create/edit/delete flashcards - CANNOT do general education planning or content creation
5. Perplexity: Can do web research and find current information - CANNOT create content or do specialized analysis
6. YouTube Agent: Can search videos and get transcripts - CANNOT create videos or do general web research
7. Deep Thinker: Can do complex analysis and philosophy - CANNOT do current events research without using web tools
8. Claude Creative: Can do creative writing and coding - CANNOT do web research or SEO analysis
9. Grok X: Can analyze social media trends - CANNOT do general web research or content creation
10. Mistral Europe: Can handle European languages/culture - CANNOT do general research outside European context
11. Deep Seek: Can handle Chinese culture/business - CANNOT do general research outside Chinese context
12. Web Researcher: Can do deep web research - CANNOT create content or do specialized analysis

ADAPTATION EXAMPLES:
- User wants "Write an SEO article" → Break into: SEO research (SEO Agent) + Content writing (Content Writer)
- User wants "Research and summarize AI trends" → Use Perplexity for research, Deep Thinker for analysis
- User wants "Create educational content" → Research (Perplexity) + Analysis (Deep Thinker) + Writing (Content Writer)
- User wants "Analyze YouTube videos" → YouTube Agent for transcripts + Deep Thinker for analysis
- User wants "Create flashcards from research" → Research (Perplexity) + Flashcard creation (Flash Card Maker)

NEVER CREATE COMMANDS LIKE:
❌ "SEO Agent: Write an article about..." (SEO Agent cannot write)
❌ "Content Writer: Research and write..." (Content Writer cannot research)
❌ "Flash Card Maker: Create educational course..." (Can only make flashcards)
❌ "General Assistant: Do deep research on..." (Cannot do specialized research)
❌ "YouTube Agent: Search the web for..." (Can only search YouTube)

ALWAYS CREATE COMMANDS LIKE:
✅ "SEO Agent: Use keywordSeoAnalysisTool to research keywords for..."
✅ "Content Writer: Use writeText tool to write the introduction section..."
✅ "Flash Card Maker: Use createFlashCardTool to create 10 flashcards about..."
✅ "Perplexity: Search for current information about..."
✅ "YouTube Agent: Search for videos about... and get transcripts"

CRITICAL CONTENT WRITER AGENT REQUIREMENTS:
The Content Writer Agent MUST be called MULTIPLE TIMES for content generation:
- Each call should generate a MAXIMUM of 1000 words
- For articles/blogs: Call once per section (introduction, main points, conclusion)
- For long-form content: Call once per chapter or major section
- For books/novels: Call multiple times per chapter (beginning, middle, end)
- NEVER ask Content Writer to generate more than 1000 words in a single command

MANDATORY TABLE REQUIREMENT FOR CONTENT WRITER AGENT:
In ANY scenario that involves the Content Writer Agent creating substantial content (articles, reports, guides, etc.), AT LEAST ONE Content Writer step MUST include creating a table in the generated text. Examples:
- "Use writeText tool to write 800-1000 words about [topic] and include a comparison table showing [specific data]"
- "Use writeText tool to write 600-800 words with a summary table of key findings"
- "Use writeText tool to write 700-900 words including a data table with statistics and metrics"
- "Use writeText tool to write 800-1000 words with a feature comparison table"

The table should be relevant to the content and add value by organizing information clearly. Tables can include:
- Comparison tables (features, options, alternatives)
- Data tables (statistics, metrics, results)
- Summary tables (key points, findings, recommendations)
- Timeline tables (events, milestones, phases)
- Reference tables (resources, tools, contacts)

CONTENT GENERATION EXAMPLES:
- 2000-word article → 3 calls: Introduction (500 words), Main Body (1000 words + table), Conclusion (500 words)
- 5000-word guide → 5-6 calls: One per major section (at least one with table)
- Novel chapter → 3-4 calls: Opening scene, development, climax, resolution
- 10,000-word report → 10+ calls: One per section/subsection (at least one with table)

ALWAYS structure content generation like:
STEP 5: "Write Introduction" - Action: "Use writeText tool to write a 500-word introduction covering [specific points]"
STEP 6: "Write Section 1 with Data Table" - Action: "Use writeText tool to write 800-1000 words about [specific topic] and include a comparison table showing [specific data/features]"
STEP 7: "Write Section 2" - Action: "Use writeText tool to write 800-1000 words about [specific topic]"
STEP 8: "Write Conclusion" - Action: "Use writeText tool to write a 500-word conclusion summarizing [key points]"

The scenario should have:
1. A title and description
2. A clear goal defining the primary objective or learning goal
3. Metrics of success that indicate how to measure if the scenario was successful
4. An expected outcome that describes the result or benefit after completion
5. A sequence of AT LEAST 4 DEDICATED STEPS (minimum 4, maximum 10) that break down the work into distinct phases (more steps for text generation scenarios)

CRITICAL: CREATE DEDICATED STEPS WITH EXACTLY ONE COMMAND EACH
Each STEP must:
- Have its own clear, action-oriented title (e.g., "Research Key European Events in WWII")
- Have its own description of what will be accomplished
- Contain EXACTLY 1 specific action/command to complete that step
- Represent a distinct phase of work (Research, Analysis, Creation, Review, etc.)
- RESPECT AGENT CAPABILITIES - Never ask an agent to do something outside their abilities

STEP STRUCTURE GUIDELINES:

MANDATORY MINIMUM 4-STEP STRUCTURE:
Every scenario MUST have at least these 4 core steps:

STEP 1: RESEARCH & INFORMATION GATHERING
- Title: Something like "Research [Topic/Requirements]"
- Description: What research or information gathering will be done
- Action: 1 specific research task using appropriate agent

STEP 2: ANALYSIS & PLANNING
- Title: Something like "Analyze [Findings] and Plan [Approach]" 
- Description: How the research will be analyzed and planned
- Action: 1 analysis and planning task

STEP 3: CREATION & DEVELOPMENT
- Title: Something like "Create [Deliverable]" or "Develop [Solution]"
- Description: The main creation/development work
- Action: 1 creation task using creative agents

STEP 4: REFINEMENT & FINALIZATION
- Title: Something like "Refine and Finalize [Deliverable]"
- Description: Polishing and completing the work
- Action: 1 refinement and delivery task

STEP 5-10: ADDITIONAL PHASES (expand as needed)
- Title: Domain-specific phases like "Testing", "Implementation", "Distribution", "Review", "Optimization"
- Description: Additional specialized work phases
- Action: 1 phase-specific task each

IMPORTANT: NEVER create scenarios with fewer than 4 steps. Always expand simple requests into at least 4 meaningful phases.

AGENT ASSIGNMENT GUIDELINES:
Match agents to tasks based on their specific capabilities and available tools:

IMPORTANT: Each agent has STRICT limitations. NEVER assign tasks outside their capabilities:

- Use "General Assistant" (Tools: getWeather, calculateMath) ONLY for coordination, general planning, weather info, and basic calculations - NOT for research or content creation
- Use "Grok X" ONLY for social media, trends, or current events research - NOT for general web search
- Use "Mistral Europe" ONLY for European languages, literature, or cultural tasks - NOT for general topics
- Use "Claude Creative" ONLY for creative writing, storytelling, or coding tasks - NOT for research
- Use "Deep Seek" ONLY for Chinese culture, language, or business insights - NOT for general topics
- Use "Perplexity" ONLY for research requiring current information or citations - NOT for content creation
- Use "Deep Thinker" ONLY for complex analysis, philosophy, or advanced concepts - NOT for current events without web tools
- Use "SEO Agent" (Tools: keywordSeoAnalysisTool, fetchPageContentTool, searchWebTool, keywordsFinderTool, searchVideosTool, youtubeTranscriptTool) ONLY for keyword research, SEO analysis, content optimization - NOT for writing content
- Use "Content Writer Agent" (Tools: writeText) EXCLUSIVELY for final text generation - NEVER for planning, brainstorming, research, analysis, or content planning
- Use "Flash Card Maker" (Tools: createFlashCardTool, editFlashCardTool, deleteFlashCardTool) ONLY for creating, editing, and managing flashcards - NOT for general educational content
- Use "YouTube Agent" ONLY for YouTube video search and transcript retrieval - NOT for general web search
- Use "Web Researcher" ONLY for deep web research - NOT for content creation or specialized analysis

CRITICAL: AGENTS MUST USE THEIR SPECIALIZED TOOLS
- SEO Agent: MUST use available SEO tools (keywordSeoAnalysisTool, fetchPageContentTool, searchWebTool, etc.) when specified
- Content Writer Agent: MUST use writeText tool for all content generation (never write directly) - USE ONLY FOR FINAL TEXT GENERATION, NOT PLANNING
- Flash Card Maker: MUST use flashcard tools (createFlashCardTool, editFlashCardTool, deleteFlashCardTool) for flashcard creation and management
- General Assistant: Can use weather and math tools when relevant
- Perplexity: Automatically searches the web for current information
- Deep Thinker: Should use web search tools for research when needed

CREATIVE AGENT AND TOOL USAGE:
Analyze the user's request and creatively assign agents based on their specific capabilities and available tools:

FOR CODING/DEVELOPMENT TASKS:
- Use Claude Creative for code creation, debugging, and technical implementation
- Use Deep Thinker for complex algorithm analysis or architecture decisions
- Use Perplexity for researching current best practices or new technologies

FOR CREATIVE WRITING TASKS:
- Use Claude Creative for story development, character creation, plot planning
- Use Mistral Europe for European literature styles or cultural contexts
- Use Content Writer Agent ONLY for final text generation using writeText tool

FOR RESEARCH TASKS:
- Use Perplexity for current information and citations
- Use Deep Thinker for complex analysis and synthesis
- Use specialized agents (Deep Seek for Chinese topics, Mistral Europe for European topics)

FOR BUSINESS/MARKETING TASKS:
- Use SEO Agent for SEO-related content and optimization (with SEO tools)
- Use Grok X for social media and trending content
- Use Deep Thinker for strategic analysis

FOR EDUCATIONAL CONTENT:
- Use Flash Card Maker for creating flashcards and study materials
- Use appropriate subject matter agents (Deep Thinker for complex topics, Mistral Europe for European subjects)
- Use Perplexity for current information and research
- Use Content Writer Agent for final educational content generation

EXAMPLE WORKFLOWS FOR DIFFERENT TASK TYPES:

FOR CREATIVE WRITING (e.g., "Write a fantasy novel"):
STEP 1: "Develop World-Building Concepts" - Action: "Create detailed fantasy world with unique magic system, geography, and cultures" (Claude Creative)
STEP 2: "Design Main Characters" - Action: "Develop 5 main characters with detailed backgrounds, motivations, and character arcs" (Claude Creative)
STEP 3: "Create Plot Outline" - Action: "Design comprehensive plot structure with major story beats and conflicts" (Claude Creative)
STEP 4: "Write Chapter 1 Opening" - Action: "Use writeText tool to write 800-1000 words introducing the world and protagonist" (Content Writer Agent)
STEP 5: "Write Chapter 1 Development with Character Table" - Action: "Use writeText tool to write 800-1000 words developing the initial conflict and include a character reference table showing main characters, their roles, and key traits" (Content Writer Agent)
STEP 6: "Write Chapter 1 Conclusion" - Action: "Use writeText tool to write 500-800 words concluding chapter with cliffhanger" (Content Writer Agent)

FOR CODING PROJECT (e.g., "Build a React app"):
STEP 1: "Plan Application Architecture" - Action: "Design component structure and data flow for the React application" (Claude Creative)
STEP 2: "Research Best Practices" - Action: "Find current React best practices and recommended libraries for the project" (Perplexity)
STEP 3: "Create Core Components" - Action: "Build main React components with proper TypeScript types" (Claude Creative)
STEP 4: "Implement State Management" - Action: "Set up state management and data handling logic" (Claude Creative)

FOR RESEARCH PROJECT (e.g., "Analyze climate change impacts"):
STEP 1: "Gather Current Data" - Action: "Research latest climate change data and scientific findings" (Perplexity)
STEP 2: "Analyze Regional Impacts" - Action: "Examine climate impacts across different geographical regions" (Deep Thinker)
STEP 3: "Synthesize Findings" - Action: "Create comprehensive analysis connecting data points and trends" (Deep Thinker)
STEP 4: "Write Research Report with Data Table" - Action: "Use writeText tool to generate detailed research report with findings and conclusions, including a data table showing regional climate impact statistics" (Content Writer Agent - MUST use writeText tool)

FOR SEO CONTENT (e.g., "Create SEO article about AI in education"):
STEP 1: "Conduct SEO Keyword Research" - Action: "Use keywordSeoAnalysisTool to research 'ai in education' keyword and identify 10-15 high-potential related keywords with search volume data" (SEO Agent - MUST use keywordSeoAnalysisTool)
STEP 2: "Find Competitor Content" - Action: "Use searchWebTool to find 8-10 blog/article links about AI in education using the researched keywords" (SEO Agent - MUST use searchWebTool)
STEP 3: "Analyze Competitor Content" - Action: "Use fetchPageContentTool to retrieve content from all found links and summarize main valuable points and facts" (SEO Agent - MUST use fetchPageContentTool)
STEP 4: "Create Content Plan" - Action: "Develop comprehensive content plan synthesizing research and identifying unique value opportunities" (General Assistant)
STEP 5: "Write Introduction Section" - Action: "Use writeText tool to write a 300-500 word engaging introduction incorporating primary SEO keywords" (Content Writer Agent)
STEP 6: "Write Benefits Section with Comparison Table" - Action: "Use writeText tool to write 800-1000 words about benefits of AI in education with keyword optimization, including a comparison table showing traditional vs AI-enhanced learning methods" (Content Writer Agent)
STEP 7: "Write Implementation Section" - Action: "Use writeText tool to write 800-1000 words about implementing AI in educational settings" (Content Writer Agent)
STEP 8: "Write Challenges Section" - Action: "Use writeText tool to write 600-800 words about challenges and solutions" (Content Writer Agent)
STEP 9: "Write Conclusion" - Action: "Use writeText tool to write a 400-500 word conclusion with call-to-action" (Content Writer Agent)

FOR EDUCATIONAL FLASHCARDS (e.g., "Create flashcards for Spanish vocabulary"):
STEP 1: "Research Vocabulary Topics" - Action: "Research essential Spanish vocabulary categories and common words for beginners" (Perplexity)
STEP 2: "Create Basic Vocabulary Cards" - Action: "Create 20 flashcards for basic Spanish greetings and common phrases" (Flash Card Maker - use createFlashCardTool)
STEP 3: "Create Thematic Card Sets" - Action: "Create flashcard sets for food, family, and travel vocabulary" (Flash Card Maker - use createFlashCardTool)
STEP 4: "Review and Edit Cards" - Action: "Review all created flashcards and edit for accuracy and clarity" (Flash Card Maker - use editFlashCardTool)

IMPORTANT GUIDELINES:
- Adapt the workflow to match the specific user request
- Use agents that best match the task requirements and available tools
- Ensure agents use their specialized tools when specified
- For text generation, always use Content Writer Agent with writeText tool
- For flashcard creation, always use Flash Card Maker with appropriate flashcard tools
- For SEO tasks, always use SEO Agent with its specialized SEO tools
- Create logical step progression that builds toward the final deliverable
- Be creative with agent combinations based on task complexity and tool availability

SPECIAL REQUIREMENT FOR TEXT GENERATION SCENARIOS:
If the scenario involves creating substantial written content, ALWAYS break it into multiple Content Writer Agent steps:
- Each Content Writer step MUST specify a word count (maximum 1000 words per step)
- Create separate steps for each section/chapter/part
- Be specific about what each section should cover
- Example: A 3000-word article needs at least 3-4 Content Writer steps
- Example: A novel chapter (2500-3000 words) needs 3-4 Content Writer steps
- NEVER combine multiple sections into one Content Writer command
- ALWAYS include at least one step where Content Writer creates content with a table

FINAL CRITICAL REMINDER - ADAPT TO CAPABILITIES:
Before finalizing the scenario, review EVERY command to ensure:
1. The agent CAN actually perform the requested task
2. The command uses the agent's available tools correctly
3. Complex user requests are broken down into steps that match agent capabilities
4. No agent is asked to do something outside their specialization
5. At least one Content Writer step includes table creation when generating substantial content

If a user request doesn't perfectly match agent capabilities, ADAPT IT:
- Break complex tasks into multiple steps with different agents
- Use agent combinations to achieve the desired outcome
- Focus on what CAN be done rather than trying to force inappropriate matches

Make the scenarios practical and ensure each step represents a meaningful phase of work that builds toward the final deliverable. Each command should be specific, actionable, and focused on a single objective that leverages the most appropriate agent and their available tools for that particular task.

CRITICAL JSON STRUCTURE REQUIREMENT:
Your response MUST include ALL required fields in this exact structure:
{
  "scenarios": [
    {
      "title": "...",
      "description": "...",
      "goal": "...",
      "metricsOfSuccess": "...",
      "outcome": "...",
      "steps": [
        {
          "title": "...",
          "description": "...",
          "actions": [
            {
              "label": "...",
              "prompt": "...",
              "agent_name": "...",
              "type": "research" or "chat"
            }
          ]
        }
      ]
    }
  ]
}

NEVER omit the "steps" array - it is REQUIRED and must contain at least 4 step objects as outlined above.`,
        temperature: 0.7,
        maxTokens: 2000,
      });

      console.log('Object generated successfully:', result.object);
      
      return new Response(JSON.stringify(result.object), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
      
    } catch (openaiError) {
      console.error('OpenAI Error:', openaiError);
      return new Response(
        JSON.stringify({ 
          error: 'OpenAI API error', 
          details: openaiError instanceof Error ? openaiError.message : String(openaiError) 
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error) {
    console.error('General Error in API route:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to Generate Flow',
        details: error instanceof Error ? error.message : String(error)
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
} 
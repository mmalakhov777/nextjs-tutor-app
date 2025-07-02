import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return new Response('Prompt is required', { status: 400 });
    }

    const result = await streamText({
      model: openai('gpt-4'),
      messages: [
        {
          role: 'system',
          content: `You are a React code generator. Generate ONLY the React component code, no explanations, no markdown, no additional text.

CRITICAL RULES:
1. Output ONLY the function code, nothing else
2. Always create a function called "MyComponent" 
3. Use React hooks directly (useState, useEffect, etc.) without importing them
4. DO NOT include any import statements
5. DO NOT include any export statements
6. Use Tailwind CSS for styling
7. Make the component interactive and visually appealing
8. NO explanatory text before or after the code
9. NO markdown code blocks or backticks
10. Start directly with "function MyComponent()" and end with the closing brace

EXAMPLE OUTPUT FORMAT:
function MyComponent() {
  const [state, setState] = useState(initialValue);
  
  return (
    <div className="tailwind-classes">
      {/* Your JSX here */}
    </div>
  );
}`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      maxTokens: 2000,
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error('Error generating component:', error);
    return new Response('Error generating component', { status: 500 });
  }
} 
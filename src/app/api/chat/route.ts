import { openai } from '@ai-sdk/openai';
import { xai } from '@ai-sdk/xai';
import { anthropic } from '@ai-sdk/anthropic';
import { groq } from '@ai-sdk/groq';
import { streamText, generateText, convertToCoreMessages, ToolInvocation, wrapLanguageModel, extractReasoningMiddleware } from 'ai';
import { z } from 'zod';
import { 
  saveMessageIfUnique, 
  saveStreamingResponse,
  cleanUserMessage,
  saveToolMessage 
} from '@/lib/db/messages';
import { AGENT_REGISTRY, getAgentConfig } from '@/lib/agents';

// Allow streaming responses up to 60 seconds
export const maxDuration = 60;

// Request body schema
const RequestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string(),
    id: z.string().optional(),
    toolInvocations: z.array(z.any()).optional(),
  })),
  userId: z.string(),
  conversationId: z.string(),
  agentName: z.string().optional().default('General Assistant'),
  useTools: z.boolean().optional().default(false),
  mode: z.enum(['chat', 'research']).optional().default('chat'),
});

export async function POST(req: Request) {
  let accumulatedContent = '';
  let accumulatedReasoning = '';
  let messageId: string | undefined;
  let parsedBody: any = null;
  
  try {
    const body = await req.json();
    parsedBody = body; // Store for error handling
    const { messages, userId, conversationId, agentName, useTools, mode } = RequestSchema.parse(body);
    
    // ALWAYS SAVE USER MESSAGES - NO CONDITIONS
    const lastMessage = messages[messages.length - 1];
    
    // ALWAYS save user messages - remove all conditions
    if (lastMessage && lastMessage.role === 'user') {
      console.log('User message:', lastMessage.content);
      
      const cleanContent = cleanUserMessage(lastMessage.content);
      
      const saveResult = await saveMessageIfUnique({
        chat_session_id: conversationId,
        role: 'user',
        content: cleanContent,
        user_id: userId,
        metadata: {
          agent_name: agentName,
          raw_content: lastMessage.content, // Keep original content in metadata
          existing_id: lastMessage.id || null, // Track if it had an existing ID
          force_save: true // Mark as force saved
        },
        check_hash: false // Always save user messages - no duplicate checking
      });
      
      if (saveResult.success) {
        messageId = saveResult.message_id;
      }
    }
    
    // Get agent configuration
    const agentConfig = AGENT_REGISTRY[agentName as keyof typeof AGENT_REGISTRY] || AGENT_REGISTRY['General Assistant'];
    
    // Add fallback logging and ensure we use General Assistant if agent not found
    let finalAgentName = agentName;
    if (!AGENT_REGISTRY[agentName as keyof typeof AGENT_REGISTRY]) {
      finalAgentName = 'General Assistant'; // Use General Assistant as fallback
    }
    
    // Override model and system prompt for research mode - use OpenAI with web search
    let finalModel = agentConfig.model;
    let finalSystemPrompt = agentConfig.systemPrompt;
    let usePerplexityOptions = false;
    let useReasoningExtraction = false;
    
    if (mode === 'research') {
      // Use OpenAI with web search for research mode
      finalModel = openai.responses('gpt-4.1');
      finalSystemPrompt = AGENT_REGISTRY['Web Researcher'].systemPrompt;
      usePerplexityOptions = true;
      useReasoningExtraction = false; // OpenAI doesn't use reasoning extraction like Perplexity
    }
    
    // Add system prompt as first message if not already present
    const systemMessage = {
      role: 'system' as const,
      content: finalSystemPrompt,
    };
    
    const allMessages = messages[0]?.role === 'system' 
      ? messages 
      : [systemMessage, ...messages];
    
    // Clean messages before converting to core format to avoid Zod validation errors
    const cleanedMessages = allMessages.map(msg => {
      // Remove problematic fields that cause Zod validation errors
      const { toolInvocations, toolCall, toolAction, ...cleanMsg } = msg as any;
      
      // Only keep basic message structure for AI SDK
      return {
        role: cleanMsg.role,
        content: cleanMsg.content,
        ...(cleanMsg.id && { id: cleanMsg.id }),
        ...(cleanMsg.createdAt && { createdAt: cleanMsg.createdAt })
      };
    });

    // Convert messages to core format
    const coreMessages = convertToCoreMessages(cleanedMessages);
    
    // Add conversation length management for Claude to prevent token limit issues
    let finalCoreMessages = coreMessages;
    if (finalAgentName === 'Claude Creative' && coreMessages.length > 20) {
      // Keep system message + last 14 messages
      finalCoreMessages = [
        coreMessages[0], // System message
        ...coreMessages.slice(-14) // Last 14 messages
      ];
    }
    
    // Define tools based on agent type
    let tools: any = undefined;
    let toolChoice: any = undefined;
    
    // Use tools from agent configuration if available
    if (useTools || agentConfig.tools) {
      tools = agentConfig.tools;
      
      // Set toolChoice if specified in agent config (for forced web search)
      if ('toolChoice' in agentConfig && agentConfig.toolChoice) {
        toolChoice = agentConfig.toolChoice;
      }
      
      // Special handling for Content Writer Agent to pass dialogue context
      if (finalAgentName === 'Content Writer Agent' && tools?.writeText) {
        try {
          // Fetch complete conversation history from database using session ID
          const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5002';
          const messagesResponse = await fetch(`${backendUrl}/api/chat-sessions/${conversationId}/messages`);
          
          let dialogue: any[] = [];
          
          if (messagesResponse.ok) {
            const data = await messagesResponse.json();
            
            if (data.messages && Array.isArray(data.messages)) {
              // Convert database messages to dialogue format
              dialogue = data.messages
                .filter((msg: any) => msg.role !== 'system' && msg.role !== 'tool') // Exclude system and tool messages
                .map((msg: any) => ({
                  role: msg.role as 'user' | 'assistant' | 'system',
                  content: msg.content,
                  agentName: msg.agent_name,
                  timestamp: msg.created_at
                }));
            }
          } else {
            // Fallback to current messages if database fetch fails
            dialogue = finalCoreMessages
              .filter(msg => msg.role !== 'system')
              .map((msg: any) => ({
                role: msg.role as 'user' | 'assistant' | 'system',
                content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
                agentName: msg.agentName,
                timestamp: msg.createdAt ? new Date(msg.createdAt).toISOString() : undefined
              }));
          }
          
          // Create a wrapped version of the writeText tool
          const originalWriteTextTool = tools.writeText;
          tools = {
            ...tools,
            writeText: {
              ...originalWriteTextTool,
              execute: async (args: any) => {
                // Call the original tool with dialogue context added
                return originalWriteTextTool.execute({
                  ...args,
                  dialogue: dialogue
                });
              }
            }
          };
        } catch (error) {
          // Continue without dialogue context if fetch fails
        }
      }
    }
    
    // Stream the response with error handling
    let result;
    try {
      console.log('[CHAT_API][AGENT_EXECUTION] Starting agent execution:', {
        agentName: finalAgentName,
        model: typeof finalModel === 'object' && 'modelId' in finalModel ? finalModel.modelId : 'unknown',
        messageCount: finalCoreMessages.length,
        hasTools: !!tools,
        toolNames: tools ? Object.keys(tools) : [],
        toolChoice: toolChoice || 'auto',
        temperature: 0.7,
        maxTokens: 8000,
        maxSteps: 5,
        conversationId,
        userId,
        hasFilesMetadata: finalCoreMessages.some(msg => 
          typeof msg.content === 'string' && msg.content.includes('__FILES_METADATA__')
        ),
        lastMessagePreview: (() => {
          const lastContent = finalCoreMessages[finalCoreMessages.length - 1]?.content;
          if (typeof lastContent === 'string') {
            return lastContent.substring(0, 200) + '...';
          }
          return 'Complex content type';
        })()
      });

      result = streamText({
        model: finalModel,
        messages: finalCoreMessages,
        tools,
        ...(toolChoice && { toolChoice }),
        temperature: 0.7,
        maxTokens: 8000,
        maxSteps: 5, // Increase to allow more tool calls
        experimental_toolCallStreaming: true, // Enable tool call streaming
        onChunk: async ({ chunk }) => {
          // Accumulate content as it streams
          if (chunk.type === 'text-delta' && chunk.textDelta) {
            accumulatedContent += chunk.textDelta;
          }
          
          // Log tool calls
          if (chunk.type === 'tool-call') {
            console.log('[CHAT_API][TOOL_CALL] Tool called:', {
              toolName: chunk.toolName,
              toolCallId: chunk.toolCallId,
              args: chunk.args,
              agentName: finalAgentName
            });
          }
        },
        onStepFinish: async ({ stepType, toolCalls, toolResults, text, usage, finishReason, experimental_providerMetadata }) => {
          // Log step completion
          console.log('[CHAT_API][STEP_FINISH] Step completed:', {
            stepType,
            toolCallsCount: toolCalls?.length || 0,
            toolResultsCount: toolResults?.length || 0,
            textLength: text?.length || 0,
            finishReason,
            agentName: finalAgentName,
            usage
          });

          // Log tool calls and results
          if (toolCalls && toolCalls.length > 0) {
            toolCalls.forEach((toolCall, index) => {
              console.log(`[CHAT_API][TOOL_CALL_${index}] Tool executed:`, {
                toolName: toolCall.toolName,
                toolCallId: toolCall.toolCallId,
                args: toolCall.args,
                agentName: finalAgentName
              });
            });
          }

          if (toolResults && toolResults.length > 0) {
            toolResults.forEach((toolResult: any, index) => {
              const resultStr = JSON.stringify(toolResult.result || toolResult);
              console.log(`[CHAT_API][TOOL_RESULT_${index}] Tool result:`, {
                toolCallId: toolResult.toolCallId || `call-${index}`,
                toolName: toolResult.toolName || 'unknown',
                resultLength: resultStr.length,
                agentName: finalAgentName,
                resultPreview: resultStr.substring(0, 200) + '...',
                hasInlineFileIds: /\["[^"]*"\]/.test(resultStr),
                inlineFileIdsFound: resultStr.match(/\["[^"]*"\]/g) || []
              });
            });
          }

          // Save tool calls and results
          if (toolCalls && toolCalls.length > 0) {
            // Save all tool calls (they may be executed in parallel)
            const toolCallPromises = toolCalls.map(async (toolCall, i) => {
              const toolResult = toolResults?.[i];
              const resultContent = toolResult && typeof toolResult === 'object' && toolResult !== null && 'result' in toolResult 
                ? (toolResult as any).result 
                : toolResult;
              
              // Save tool call information
              return saveToolMessage({
                chat_session_id: conversationId,
                content: JSON.stringify({
                  tool: toolCall.toolName,
                  args: toolCall.args,
                  result: resultContent,
                }),
                agent_name: finalAgentName,
                user_id: userId,
                tool_action: 'call',
                metadata: {
                  tool_name: toolCall.toolName,
                  tool_args: toolCall.args,
                  tool_result: resultContent,
                  step_type: stepType,
                  parallel_execution: toolCalls.length > 1,
                  call_index: i,
                  total_calls: toolCalls.length,
                }
              });
            });
            
            // Wait for all tool calls to be saved
            await Promise.all(toolCallPromises);
          }
        },
        onFinish: async ({ text, usage, finishReason, experimental_providerMetadata }) => {
          // Save the message
            const saveResult = await saveStreamingResponse({
              chat_session_id: conversationId,
            content: text || accumulatedContent,
              agent_name: finalAgentName,
              user_id: userId,
              metadata: {
                usage,
                finish_reason: finishReason,
                model: typeof finalModel === 'object' && 'modelId' in finalModel ? finalModel.modelId : 'gpt-4.1',
                user_message_id: messageId,
                has_reasoning: !!accumulatedReasoning,
                reasoning_content: accumulatedReasoning || undefined,
              },
              is_final: true
            });
        },
      });
      
      // Return the stream with additional headers
      return result.toDataStreamResponse({
        headers: {
          'X-Agent-Name': mode === 'research' ? 'Research' : finalAgentName,
          'X-Conversation-Id': conversationId,
          'X-User-Message-Id': messageId || '',
        },
        // Send sources for Web Researcher agent or research mode
        sendSources: finalAgentName === 'Web Researcher' || usePerplexityOptions,
        // OpenAI doesn't send reasoning like Perplexity
        sendReasoning: false,
      });
      
    } catch (error) {
      // Check if we can retry with General Assistant
      const canRetryWithGeneralAssistant = finalAgentName !== 'General Assistant' && 
                                          !(error instanceof Error && error.message?.includes('General Assistant'));
      
      if (canRetryWithGeneralAssistant) {
        try {
          // Retry with General Assistant configuration
          const generalAssistantConfig = AGENT_REGISTRY['General Assistant'];
          
          result = streamText({
            model: generalAssistantConfig.model,
            messages: finalCoreMessages,
            tools: generalAssistantConfig.tools,
            temperature: 0.7,
            maxTokens: 8000,
            maxSteps: 5,
            experimental_toolCallStreaming: true,
            onChunk: async ({ chunk }) => {
              if (chunk.type === 'text-delta' && chunk.textDelta) {
                accumulatedContent += chunk.textDelta;
              }
            },
            onFinish: async ({ text, usage, finishReason }) => {
              // Save the message with fallback indicator
              const saveResult = await saveStreamingResponse({
                chat_session_id: conversationId,
                content: text || accumulatedContent,
                agent_name: 'General Assistant',
                user_id: userId,
                metadata: {
                  usage,
                  finish_reason: finishReason,
                  model: 'gpt-4.1',
                  user_message_id: messageId,
                  original_agent: finalAgentName,
                  is_fallback: true,
                },
                is_final: true
              });
            },
          });
          
          // Return the fallback stream
          return result.toDataStreamResponse({
            headers: {
              'X-Agent-Name': 'General Assistant (Fallback)',
              'X-Conversation-Id': conversationId,
              'X-User-Message-Id': messageId || '',
              'X-Original-Agent': finalAgentName,
            },
            sendSources: false,
            sendReasoning: false,
          });
          
        } catch (fallbackError) {
          // Continue to original error handling
        }
      }
      
      // Try to save error as system message
      try {
        const { saveSystemMessage } = await import('@/lib/db/messages');
        await saveSystemMessage({
          chat_session_id: parsedBody?.conversationId || 'unknown',
          content: `Error: ${error instanceof Error ? error.message : String(error)}`,
          agent_name: parsedBody?.agentName || 'System',
          user_id: parsedBody?.userId,
          metadata: {
            error: true,
            error_type: error instanceof Error ? error.name : 'UnknownError',
          }
        });
      } catch (dbError) {
        // Silent error handling
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to process chat request',
          details: error instanceof Error ? error.message : String(error),
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error) {
    // Try to save error as system message
    try {
      const { saveSystemMessage } = await import('@/lib/db/messages');
      await saveSystemMessage({
        chat_session_id: parsedBody?.conversationId || 'unknown',
        content: `Error: ${error instanceof Error ? error.message : String(error)}`,
        agent_name: parsedBody?.agentName || 'System',
        user_id: parsedBody?.userId,
        metadata: {
          error: true,
          error_type: error instanceof Error ? error.name : 'UnknownError',
        }
      });
    } catch (dbError) {
      // Silent error handling
    }
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process chat request',
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
} 
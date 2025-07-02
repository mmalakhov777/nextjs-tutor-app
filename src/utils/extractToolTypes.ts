/**
 * Extract unique tool types from chat messages
 * @param messages - Array of chat messages with tool invocations
 * @returns Array of unique tool type names
 */
export function extractToolTypes(messages: any[]): string[] {
  const toolTypes = new Set<string>();
  
  messages.forEach(message => {
    // Check for toolInvocations in the message
    if (message.toolInvocations && Array.isArray(message.toolInvocations)) {
      message.toolInvocations.forEach((invocation: any) => {
        if (invocation.toolName) {
          toolTypes.add(invocation.toolName);
        }
      });
    }
    
    // Also check for legacy toolCall format
    if (message.toolCall && message.toolCall.toolName) {
      toolTypes.add(message.toolCall.toolName);
    }
    
    // Check for toolName directly on message
    if (message.toolName) {
      toolTypes.add(message.toolName);
    }
  });
  
  // Convert Set to Array and sort alphabetically
  return Array.from(toolTypes).sort();
} 
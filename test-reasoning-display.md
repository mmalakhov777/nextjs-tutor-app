# Testing Reasoning Display for Perplexity sonar-reasoning-pro

## Overview
This implementation adds support for displaying reasoning content from Perplexity's sonar-reasoning-pro model in a collapsible dropdown, similar to how DeepSeek R1 works.

## Changes Made

### 1. Backend (route.ts)
- Added `extractReasoningMiddleware` from AI SDK to wrap the Perplexity model
- Configured middleware to extract reasoning tokens with `<think>` tags
- Added `sendReasoning: true` to the stream response
- Store reasoning content in message metadata

### 2. Frontend (Message.tsx)
- Added `showReasoning` state to control dropdown visibility
- Added reasoning dropdown UI with Brain icon
- Shows reasoning content in a gray box when expanded
- Only displays for messages that have `has_reasoning` and `reasoning_content` in metadata

### 3. Data Flow (home.tsx)
- Updated Message type to include `reasoning` field
- Extract reasoning from message metadata when loading conversations
- Pass reasoning data through to Message component

## How to Test

1. **Switch to Research Mode**
   - Click the mode toggle in the chat input to switch from "Chat" to "Research"

2. **Send a Complex Query**
   - Try queries that require reasoning, such as:
     - "Explain the differences between quantum entanglement and quantum superposition"
     - "What are the pros and cons of different renewable energy sources?"
     - "Compare the economic models of capitalism and socialism"

3. **Check for Reasoning Display**
   - After the response is generated, look for the "Reasoning Process" dropdown
   - Click it to expand and see the model's thinking process
   - The reasoning should show in a gray box with monospace font

4. **Verify Persistence**
   - Refresh the page
   - The reasoning should still be available in the dropdown
   - This confirms it's being saved to the database correctly

## Expected Behavior

- In Research mode, responses from sonar-reasoning-pro should include reasoning
- The reasoning dropdown appears below the agent badge and above the main response
- Reasoning content is displayed in a collapsible section
- The final answer appears in the main message body
- Both reasoning and final answer are saved to the database

## Troubleshooting

If reasoning doesn't appear:
1. Check browser console for errors
2. Verify you're in Research mode (not Chat mode)
3. Check network tab to see if reasoning is in the stream response
4. Ensure the backend is properly configured with the middleware

## Technical Details

The reasoning extraction works by:
1. Wrapping the Perplexity model with `extractReasoningMiddleware`
2. The middleware looks for `<think>` tags in the model output
3. Reasoning content is extracted and sent separately in the stream
4. Frontend receives reasoning via the `reasoning` field on messages
5. UI displays reasoning in a collapsible dropdown 
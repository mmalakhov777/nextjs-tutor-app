# Testing Perplexity Sources

## Overview
This document explains how to test the Perplexity sources feature that has been implemented.

## Prerequisites

1. **Perplexity API Key**: You need to add your Perplexity API key to your environment variables:
   ```bash
   # In .env.local
   PERPLEXITY_API_KEY=your_perplexity_api_key_here
   ```
   
   Get your API key from: https://www.perplexity.ai/settings/api

## What's Been Implemented

1. **Model Update**: The Perplexity agent now uses the `sonar-pro` model as requested.

2. **System Prompt Update**: The Perplexity agent now has an updated system prompt that instructs it to include sources and citations.

3. **Source Capture**: The implementation captures sources in two ways:
   - From the `onChunk` callback when sources stream in
   - From the `onFinish` callback when sources are available in the result

4. **Source Storage**: Sources are:
   - Appended to the message content as a "## Sources" section
   - Stored in the message metadata with type `url_citation` for future reference

5. **UI Support**: 
   - The Message component detects Perplexity responses as research responses
   - URL citations are displayed as clickable badges
   - A "Research" badge is shown for Perplexity responses

## How to Test

1. **Configure API Key**:
   ```bash
   # Add to .env.local
   PERPLEXITY_API_KEY=your_api_key_here
   ```

2. **Start the Application**:
   ```bash
   npm run dev
   ```

3. **Select Perplexity Agent**:
   - In the chat interface, select "Perplexity" from the agent dropdown

4. **Ask Current Events Questions**:
   - Try queries that require real-time information:
     - "What are the latest developments in AI?"
     - "What happened in the news today?"
     - "Tell me about recent tech announcements"
     - "What are the current trends in web development?"

5. **Expected Behavior**:
   - The response should include numbered citations like [1], [2], etc.
   - At the end of the response, there should be a "## Sources" section
   - Each source should be a clickable link with a title
   - URL citation badges should appear below the message
   - A "Research" badge should be visible

## Technical Details

- Sources are captured from Perplexity's API response using the AI SDK
- They are stored in the message metadata with type `url_citation`
- The UI recognizes these as research responses and displays them appropriately
- The `isResearchResponse` function checks for:
  - Agent name "Perplexity"
  - Provider "Perplexity" in metadata
  - URL citations in metadata
  - "## Sources" section in content

## Troubleshooting

If sources aren't appearing:
1. Check the browser console for any errors
2. Look for console logs:
   - "Perplexity source from stream: [url]"
   - "Perplexity sources found: [count]"
3. Ensure you have a valid Perplexity API key configured
4. Verify the API key has access to the `sonar-pro` model
5. Check the network tab to see if the API is returning sources

## Testing the API Directly

You can test the Perplexity API directly:
```bash
node test-perplexity-api.js
```

This will show if the API is working and returning sources correctly. 
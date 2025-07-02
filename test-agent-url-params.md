# Agent and Message URL Parameters

This feature allows you to pre-populate and automatically send a message with a specific agent when the chat loads.

## URL Parameters

- `agent`: The name of the agent to use (URL encoded)
- `message`: The message to send (URL encoded)

## Examples

### Basic Usage
```
http://localhost:3000/?user_id=test-user&agent=SEO%20Agent&message=Help%20me%20optimize%20my%20website%20for%20search%20engines
```

### With Existing Conversation
```
http://localhost:3000/?user_id=test-user&conversation_id=123&agent=Claude%20Creative&message=Write%20a%20creative%20story%20about%20AI
```

### Different Agents
```
# SEO Agent
?user_id=test&agent=SEO%20Agent&message=Analyze%20keywords%20for%20my%20blog

# Perplexity (Research)
?user_id=test&agent=Perplexity&message=What%20are%20the%20latest%20AI%20developments%3F

# Deep Seek (Chinese)
?user_id=test&agent=Deep%20Seek&message=Explain%20Chinese%20business%20culture

# Content Writer
?user_id=test&agent=Content%20Writer%20Agent&message=Write%20a%20blog%20post%20about%20sustainability
```

## JavaScript Example
```javascript
// Construct URL with agent and message
const baseUrl = 'http://localhost:3000/';
const params = new URLSearchParams({
  user_id: 'test-user',
  agent: 'SEO Agent',
  message: 'Help me with SEO optimization'
});

const fullUrl = `${baseUrl}?${params.toString()}`;
window.location.href = fullUrl;
```

## Notes

1. The message will be sent automatically once the chat session is initialized
2. If both a scenario and agent/message are in the URL, the scenario takes precedence
3. The agent and message parameters are cleared from the URL after being triggered to prevent re-triggering
4. Agent names must match exactly (case-sensitive) with the available agents
5. Both parameters should be URL encoded to handle special characters

## Available Agents

- General Assistant
- SEO Agent
- Claude Creative
- Perplexity
- Deep Seek
- Mistral Europe
- Deep Thinker
- Grok X
- Content Writer Agent
- Flash Card Maker
- Web Researcher
- YouTube Agent
- CV Writer Agent 
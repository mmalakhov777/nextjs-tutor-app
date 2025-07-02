# API & Integration Guide

## Overview

This guide provides comprehensive documentation for integrating with the AI Tutoring System's APIs. All endpoints follow RESTful conventions and support JSON data formats.

## Base URLs

```
Development: http://localhost:4200
Production: https://your-domain.com
Backend API: http://localhost:5002 (configurable)
```

## Authentication

Currently, the system uses query parameter-based authentication:

```
?user_id=YOUR_USER_ID
```

Future versions will support:
- JWT tokens
- OAuth 2.0
- API keys

## Core API Endpoints

### Chat API

#### Send Message
```http
POST /api/proxy/chat
Content-Type: application/json

{
  "question": "What is the quadratic formula?",
  "userId": "user123",
  "conversationId": "conv456",
  "history": [
    {"role": "user", "content": "Previous message"},
    {"role": "assistant", "content": "Previous response"}
  ]
}
```

**Response** (Server-Sent Events):
```
data: {"type": "agent_update", "content": "Switched to Math Expert"}
data: {"type": "token", "content": "The quadratic"}
data: {"type": "token", "content": " formula is"}
data: {"type": "message", "content": "The quadratic formula is x = (-b ± √(b² - 4ac)) / 2a"}
```

### Session Management

#### Create Session
```http
POST /api/chat-sessions
Content-Type: application/json

{
  "title": "New Chat",
  "user_id": "user123"
}
```

**Response**:
```json
{
  "id": "session789",
  "title": "New Chat",
  "user_id": "user123",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

#### Get Sessions
```http
GET /api/chat-sessions?user_id=user123&include_message_count=true
```

**Response**:
```json
[
  {
    "id": "session789",
    "title": "Math Help",
    "created_at": "2024-01-01T00:00:00Z",
    "message_count": 15
  }
]
```

### File Management

#### Upload File
```http
POST /api/proxy/vector-store
Content-Type: multipart/form-data

file: [binary data]
userId: user123
conversationId: conv456
```

**Response**:
```json
{
  "id": "file123",
  "name": "document.pdf",
  "size": 1024000,
  "type": "application/pdf",
  "vectorStoreId": "vs789",
  "metadata": {
    "title": "Document Title",
    "authors": ["Author Name"],
    "publication_year": 2024
  }
}
```

#### Get Files
```http
GET /api/proxy/vector-store?vectorStoreId=vs789
```

### Agent Management

#### Get Available Agents
```http
GET /api/agents?user_id=user123
```

**Response**:
```json
[
  {
    "id": "agent1",
    "name": "Math Expert",
    "type": "agent",
    "enabled": true,
    "can_disable": true,
    "instructions": "Specialized in mathematical problems..."
  }
]
```

#### Toggle Agent
```http
POST /api/agents/toggle
Content-Type: application/json

{
  "agent_id": "agent1",
  "enabled": false,
  "user_id": "user123"
}
```

## WebSocket Events (Future)

### Connection
```javascript
const ws = new WebSocket('wss://api.example.com/ws');

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'auth',
    token: 'your-auth-token'
  }));
};
```

### Event Types
- `message`: New chat message
- `agent_change`: Agent switched
- `file_processed`: File analysis complete
- `citation_found`: New citation discovered

## Integration Examples

### JavaScript/TypeScript

```typescript
class TutorClient {
  private baseUrl: string;
  private userId: string;

  constructor(baseUrl: string, userId: string) {
    this.baseUrl = baseUrl;
    this.userId = userId;
  }

  async sendMessage(message: string, conversationId?: string) {
    const response = await fetch(`${this.baseUrl}/api/proxy/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: message,
        userId: this.userId,
        conversationId
      })
    });

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { value, done } = await reader!.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      // Process SSE chunks
      console.log(chunk);
    }
  }
}
```

### Python

```python
import requests
import json

class TutorClient:
    def __init__(self, base_url, user_id):
        self.base_url = base_url
        self.user_id = user_id
    
    def send_message(self, message, conversation_id=None):
        url = f"{self.base_url}/api/proxy/chat"
        payload = {
            "question": message,
            "userId": self.user_id,
            "conversationId": conversation_id
        }
        
        response = requests.post(url, json=payload, stream=True)
        
        for line in response.iter_lines():
            if line:
                data = line.decode('utf-8')
                if data.startswith('data: '):
                    event_data = json.loads(data[6:])
                    yield event_data
```

### cURL Examples

```bash
# Send a message
curl -X POST http://localhost:4200/api/proxy/chat \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Explain photosynthesis",
    "userId": "user123",
    "conversationId": "conv456"
  }'

# Upload a file
curl -X POST http://localhost:4200/api/proxy/vector-store \
  -F "file=@document.pdf" \
  -F "userId=user123" \
  -F "conversationId=conv456"

# Get chat history
curl "http://localhost:4200/api/chat-sessions?user_id=user123"
```

## Error Handling

### Error Response Format
```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "User ID is required",
    "details": {
      "field": "userId",
      "reason": "missing"
    }
  }
}
```

### Common Error Codes
- `400`: Bad Request - Invalid parameters
- `401`: Unauthorized - Missing or invalid authentication
- `404`: Not Found - Resource doesn't exist
- `429`: Too Many Requests - Rate limit exceeded
- `500`: Internal Server Error

## Rate Limiting

Default limits:
- 60 requests per minute per user
- 1000 requests per hour per user
- 10 concurrent connections per user

Headers:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1640995200
```

## Webhooks (Coming Soon)

### Configuration
```json
{
  "url": "https://your-server.com/webhook",
  "events": ["message.created", "file.processed"],
  "secret": "your-webhook-secret"
}
```

### Event Payload
```json
{
  "event": "message.created",
  "timestamp": "2024-01-01T00:00:00Z",
  "data": {
    "message_id": "msg123",
    "conversation_id": "conv456",
    "user_id": "user123",
    "content": "Message content",
    "agent": "Math Expert"
  }
}
```

## Best Practices

### 1. Connection Management
- Reuse connections when possible
- Implement exponential backoff for retries
- Handle connection drops gracefully

### 2. Error Handling
- Always check response status
- Parse error messages for user feedback
- Log errors for debugging

### 3. Performance
- Use streaming for real-time updates
- Implement client-side caching
- Batch requests when appropriate

### 4. Security
- Never expose credentials in client code
- Validate all inputs
- Use HTTPS in production

## SDK Development

### Required Features
1. Authentication management
2. Automatic retry logic
3. Event stream parsing
4. Type-safe interfaces
5. Error handling
6. Logging capabilities

### Example SDK Structure
```
tutor-sdk/
├── src/
│   ├── client.ts
│   ├── types.ts
│   ├── errors.ts
│   ├── utils.ts
│   └── index.ts
├── tests/
├── examples/
└── package.json
```

## Migration Guide

### From v1 to v2 (Future)
1. Update authentication method
2. Change endpoint URLs
3. Update response parsing
4. Implement new error handling

## Support

- GitHub Issues: [your-repo/issues]
- Documentation: [your-docs-site]
- Email: support@your-domain.com
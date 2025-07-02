# System Architecture

## Overview

The AI Tutoring System is built on a modern web stack with clear separation between frontend and backend concerns. The architecture emphasizes real-time communication, scalability, and maintainability.

## Technology Stack

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI primitives
- **State Management**: React Hooks + Context API
- **Rich Text**: TipTap editor
- **Markdown**: react-markdown with plugins
- **Math Rendering**: KaTeX

### Backend Communication
- **API Style**: RESTful with streaming support
- **Real-time**: Server-Sent Events (SSE)
- **Data Format**: JSON
- **Error Handling**: Structured error responses

## Application Structure

### Entry Points

#### home.tsx (Main Application)
The central component that orchestrates the entire application:
```typescript
export default function Home({
  vectorStoreInfoFromUrl,
  onInitializationComplete
})
```

Key responsibilities:
1. User session management
2. Chat message flow
3. File management
4. Agent coordination
5. UI state management

### Core Hooks

#### useChat
Manages all chat-related functionality:
- Message sending/receiving
- Streaming response handling
- Conversation persistence
- Agent switching

#### useFiles  
Handles document management:
- File uploads
- Vector store integration
- Metadata extraction
- Citation tracking

#### useHistory
Manages chat sessions:
- Session creation/loading
- History navigation
- Session persistence

#### useAgents
Controls AI agents:
- Agent discovery
- Enable/disable functionality
- Agent metadata

### Component Architecture

```
<Home>
  ├── <ChatLayout>
  │   ├── <ChatHeader>
  │   ├── <ChatContent>
  │   │   ├── <ChatMessages>
  │   │   │   └── <Message>
  │   │   └── <ChatInput>
  │   ├── <FileSidebar>
  │   └── <AgentsSidebar>
  └── <Modals>
      ├── <AnalysisModal>
      ├── <FileDetailModal>
      └── <ScenariosModal>
```

## Data Flow

### Message Flow
1. User types message in ChatInput
2. Message sent to backend via `/api/proxy/chat`
3. Backend streams response using SSE
4. useChat hook processes stream chunks
5. Messages update in real-time
6. UI reflects changes immediately

### File Processing
1. User uploads file via FileSidebar
2. File sent to backend for processing
3. Vector store created/updated
4. Metadata extracted and stored
5. File becomes searchable in conversations

## API Architecture

### Proxy Pattern
All backend communication goes through Next.js API routes that proxy to the actual backend:

```
Client → Next.js API Route → Backend Service
```

Benefits:
- CORS handling
- Request transformation
- Error standardization
- Security layer

### Key Endpoints

#### Chat API
```
POST /api/proxy/chat
- Handles message sending
- Supports streaming responses
- Manages conversation context
```

#### Vector Store API
```
GET/POST /api/proxy/vector-store
- File upload and management
- Metadata operations
- Search functionality
```

#### Notes API
```
GET/POST /api/proxy/notes
- User note management
- Session-specific notes
```

## State Management

### Local State
- Component-specific state using useState
- Complex state logic with useReducer

### Global State
- User context via ScenarioContext
- File context via FileContext
- No Redux - relies on React's built-in solutions

### Server State
- Managed through custom hooks
- Optimistic updates for better UX
- Cache invalidation strategies

## Streaming Architecture

### SSE Implementation
```typescript
// Backend sends data as:
data: {"type": "token", "content": "Hello"}
data: {"type": "message", "content": "Complete message"}
data: {"type": "agent_change", "agent_name": "Math Expert"}
```

### Stream Processing
1. Establish SSE connection
2. Process chunks as they arrive
3. Update UI progressively
4. Handle connection errors gracefully
5. Clean up on completion

## Security Considerations

### Authentication
- User ID passed via query parameters
- Session-based access control
- Backend validates all requests

### Data Protection
- Input sanitization
- XSS prevention via React
- CORS configuration

## Performance Optimizations

### Code Splitting
- Dynamic imports for heavy components
- Route-based code splitting
- Lazy loading of modals

### Caching
- File metadata caching
- Message history caching
- Vector store information caching

### Rendering
- Memo optimization for expensive components
- Virtual scrolling for long chat histories
- Debounced search inputs

## Deployment Architecture

### Build Process
1. TypeScript compilation
2. Next.js optimization
3. Asset bundling
4. Static generation where possible

### Runtime
- Node.js server for SSR
- API routes for backend communication
- Static assets served via CDN

### Scaling Considerations
- Horizontal scaling of Next.js instances
- Backend service scaling independent
- CDN for static assets
- Database connection pooling

## Error Handling

### Frontend Errors
- Try-catch blocks in async operations
- Error boundaries for component crashes
- User-friendly error messages

### Network Errors
- Retry logic for failed requests
- Timeout handling
- Offline state management

### Validation
- TypeScript for compile-time checks
- Runtime validation with Zod
- API response validation

## Future Considerations

### Potential Improvements
1. WebSocket for bidirectional communication
2. Service Worker for offline support
3. GraphQL for more efficient data fetching
4. Micro-frontend architecture for scaling

### Scalability Path
1. Move to microservices architecture
2. Implement message queue for async operations
3. Add caching layer (Redis)
4. Database sharding for user data
# Developer Guide

## Development Environment Setup

### Prerequisites

1. **Node.js**: Version 18.0.0 or higher
2. **npm**: Version 8.0.0 or higher (comes with Node.js)
3. **Git**: For version control
4. **Backend Server**: The AI backend service running locally
5. **IDE**: VS Code recommended with extensions

### Recommended VS Code Extensions

- ESLint
- Prettier - Code formatter
- TypeScript Vue Plugin (Volar)
- Tailwind CSS IntelliSense
- PostCSS Language Support
- GitLens

### Initial Setup

1. **Clone the Repository**
   ```bash
   git clone https://github.com/your-org/ai-tutor-app.git
   cd ai-tutor-app
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   # Copy the example environment file
   cp .env.example .env.local
   
   # Edit .env.local with your configuration
   NEXT_PUBLIC_BACKEND_URL=http://localhost:5002
   NEXT_PUBLIC_USE_REAL_BACKEND=true
   ```

4. **Start Development Server**
   ```bash
   # Standard development mode
   npm run dev
   
   # Low memory mode (for resource-constrained environments)
   npm run dev:low-memory
   ```

5. **Access the Application**
   ```
   http://localhost:4200?user_id=dev_user
   ```

## Project Structure Deep Dive

### `/src/app` - Next.js App Directory

- **`home.tsx`**: Main application component
  - Manages global state
  - Coordinates between different features
  - Handles URL parameters and routing

- **`layout.tsx`**: Root layout wrapper
  - Sets up providers
  - Configures global styles
  - Manages metadata

- **`page.tsx`**: Landing page
  - Entry point for users
  - Renders Home component
  - Handles initial setup

### `/src/components` - UI Components

#### `/chat` - Chat-specific components
- **`Message.tsx`**: Individual message rendering
- **`ChatInput.tsx`**: User input handling
- **`ChatMessages.tsx`**: Message list container
- **`AgentsSidebar.tsx`**: Agent management UI
- **`FileSidebar.tsx`**: File management UI

#### `/ui` - Reusable UI primitives
- Based on Radix UI
- Styled with Tailwind CSS
- Fully accessible components

### `/src/hooks` - Custom React Hooks

- **`useChat.ts`**: Chat functionality
  ```typescript
  const {
    messages,
    sendMessage,
    isProcessing,
    currentAgent
  } = useChat(userId);
  ```

- **`useFiles.ts`**: File management
  ```typescript
  const {
    uploadedFiles,
    uploadFile,
    deleteFile,
    isUploading
  } = useFiles(userId, conversationId);
  ```

### `/src/types` - TypeScript Definitions

Central location for all type definitions:
```typescript
// Example from chat.ts
export type Message = {
  id?: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  agentName?: string;
  // ... more fields
};
```

## Key Development Concepts

### 1. State Management Pattern

The application uses a hook-based state management pattern:

```typescript
// Custom hook pattern
export function useFeature(dependency: string) {
  const [state, setState] = useState(initialState);
  
  const action = useCallback(() => {
    // Perform action
    setState(newState);
  }, [dependency]);
  
  return { state, action };
}
```

### 2. Streaming Response Handling

```typescript
// Pattern for handling SSE streams
const reader = response.body?.getReader();
const decoder = new TextDecoder();

while (true) {
  const { value, done } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  // Process chunk
}
```

### 3. Component Composition

```typescript
// Compound component pattern
<ChatLayout>
  <ChatLayout.Header />
  <ChatLayout.Content>
    <ChatMessages />
    <ChatInput />
  </ChatLayout.Content>
  <ChatLayout.Sidebar />
</ChatLayout>
```

## Common Development Tasks

### Adding a New Feature

1. **Define Types**
   ```typescript
   // In src/types/feature.ts
   export interface Feature {
     id: string;
     name: string;
     // ... properties
   }
   ```

2. **Create Hook**
   ```typescript
   // In src/hooks/useFeature.ts
   export function useFeature() {
     // Implementation
   }
   ```

3. **Build Component**
   ```typescript
   // In src/components/feature/Feature.tsx
   export function Feature() {
     const feature = useFeature();
     // Component logic
   }
   ```

4. **Add API Route** (if needed)
   ```typescript
   // In src/app/api/feature/route.ts
   export async function POST(request: NextRequest) {
     // Handle request
   }
   ```

### Working with the Backend

1. **Proxy Pattern**
   - All backend calls go through `/api/proxy/*`
   - Handles CORS and authentication
   - Transforms requests/responses

2. **Environment Variables**
   ```typescript
   const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5002';
   ```

3. **Error Handling**
   ```typescript
   try {
     const response = await fetch(url);
     if (!response.ok) {
       throw new Error(`HTTP error! status: ${response.status}`);
     }
     // Process response
   } catch (error) {
     console.error('Request failed:', error);
     // Handle error
   }
   ```

## Testing Strategy

### Unit Tests
```typescript
// Example test file: __tests__/useChat.test.ts
import { renderHook, act } from '@testing-library/react-hooks';
import { useChat } from '@/hooks/useChat';

describe('useChat', () => {
  it('should send message', async () => {
    const { result } = renderHook(() => useChat('user123'));
    
    await act(async () => {
      await result.current.sendMessage('Hello');
    });
    
    expect(result.current.messages).toHaveLength(1);
  });
});
```

### Integration Tests
- Test API routes
- Test component interactions
- Test data flow

### E2E Tests (Planned)
- User journey tests
- Cross-browser testing
- Performance testing

## Performance Optimization

### 1. Code Splitting
```typescript
// Dynamic imports for heavy components
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <LoadingSpinner />,
});
```

### 2. Memoization
```typescript
// Memoize expensive computations
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);

// Memoize components
const MemoizedComponent = memo(Component);
```

### 3. Debouncing
```typescript
// Debounce user input
const debouncedSearch = useMemo(
  () => debounce(handleSearch, 300),
  [handleSearch]
);
```

## Debugging Tips

### 1. React DevTools
- Install React Developer Tools extension
- Inspect component props and state
- Profile performance

### 2. Network Tab
- Monitor API calls
- Check request/response payloads
- Verify streaming responses

### 3. Console Logging
```typescript
// Conditional logging for development
if (process.env.NODE_ENV === 'development') {
  console.log('Debug info:', data);
}
```

### 4. Error Boundaries
```typescript
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    console.error('Error caught:', error, errorInfo);
  }
}
```

## Contributing Guidelines

### 1. Branch Strategy
```bash
# Feature branches
git checkout -b feature/your-feature-name

# Bug fixes
git checkout -b fix/bug-description

# Hotfixes
git checkout -b hotfix/critical-issue
```

### 2. Commit Messages
Follow conventional commits:
```
feat: add new chat feature
fix: resolve streaming issue
docs: update API documentation
style: format code with prettier
refactor: optimize message handling
test: add unit tests for useChat
chore: update dependencies
```

### 3. Pull Request Process

1. **Create PR with description**
   - What changes were made
   - Why were they necessary
   - How to test

2. **Ensure checks pass**
   - Linting (ESLint)
   - Type checking (TypeScript)
   - Build succeeds
   - Tests pass

3. **Code Review**
   - Address feedback
   - Update as needed
   - Get approval

### 4. Code Style

- Use TypeScript for all new code
- Follow ESLint rules
- Format with Prettier
- Write self-documenting code
- Add comments for complex logic

## Deployment Process

### 1. Local Build
```bash
# Build for production
npm run build

# Test production build
npm start
```

### 2. Vercel Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### 3. Environment Variables
Set in Vercel dashboard:
- `NEXT_PUBLIC_BACKEND_URL`
- `NEXT_PUBLIC_USE_REAL_BACKEND`
- Other secrets

## Troubleshooting

### Common Issues

1. **"Cannot find module"**
   ```bash
   # Clear cache and reinstall
   rm -rf node_modules .next
   npm install
   ```

2. **"Out of memory"**
   ```bash
   # Use low memory mode
   npm run dev:low-memory
   ```

3. **CORS errors**
   - Check backend URL configuration
   - Verify proxy routes
   - Check backend CORS settings

4. **Type errors**
   ```bash
   # Regenerate types
   npm run type-check
   ```

### Getting Help

1. Check existing documentation
2. Search closed issues on GitHub
3. Ask in development chat
4. Create detailed issue with:
   - Steps to reproduce
   - Expected behavior
   - Actual behavior
   - Environment details

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Radix UI Docs](https://www.radix-ui.com/docs)

## License

This project is licensed under [LICENSE_TYPE]. See LICENSE file for details.
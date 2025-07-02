# AI Tutoring System

## Overview

This is a Next.js-based AI tutoring system that provides personalized educational support through an intelligent chat interface. The system features multiple specialized AI agents, file analysis capabilities, and scenario-based learning experiences.

## System Architecture

The application follows a modern web architecture with:
- **Frontend**: Next.js 14+ with React, TypeScript, and Tailwind CSS
- **Backend**: Node.js API with streaming support
- **State Management**: React hooks and context providers
- **UI Components**: Custom components with Radix UI primitives
- **Real-time Communication**: Server-Sent Events (SSE) for streaming responses

## Key Features

### 1. Multi-Agent System
- **Triage Agent**: Routes questions to appropriate subject experts
- **Subject Experts**: Specialized agents for Math, Science, Writing, History, etc.
- **Dynamic Agent Switching**: Seamless handoffs between agents based on context

### 2. File Management
- Upload and analyze educational documents (PDFs, text files, etc.)
- Automatic metadata extraction (authors, publication year, summary)
- Vector store integration for intelligent document search
- Citation support with inline references

### 3. Chat Interface
- Real-time streaming responses
- Markdown support with LaTeX math rendering
- Code syntax highlighting
- Message history and session management
- Mobile-responsive design

### 4. Scenario-Based Learning
- Pre-configured learning scenarios
- Custom instructions for different educational contexts
- Adaptive responses based on selected scenarios

## Project Structure

```
/workspace/
├── src/
│   ├── app/                    # Next.js app directory
│   │   ├── api/               # API routes
│   │   ├── home.tsx          # Main application component
│   │   ├── layout.tsx        # Root layout
│   │   └── page.tsx          # Landing page
│   ├── components/           # React components
│   │   ├── chat/            # Chat-related components
│   │   └── ui/              # UI primitives
│   ├── contexts/            # React contexts
│   ├── hooks/              # Custom React hooks
│   ├── lib/               # Utility libraries
│   ├── services/          # External service integrations
│   ├── types/            # TypeScript type definitions
│   └── utils/           # Helper functions
├── public/              # Static assets
├── scripts/            # Build and utility scripts
└── docs/              # Documentation
```

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Backend server running (default: http://localhost:5002)

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration
```

### Environment Variables

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:5002
NEXT_PUBLIC_USE_REAL_BACKEND=true
```

### Development

```bash
# Run development server
npm run dev

# Run with increased memory (for large projects)
npm run dev:low-memory
```

### Building for Production

```bash
# Build the application
npm run build

# Start production server
npm start
```

## Core Components

### home.tsx
The main application component that orchestrates the entire chat experience. It manages:
- User authentication and session management
- Message flow between user and AI agents
- File uploads and document analysis
- UI state and interactions

### Chat System
- **useChat**: Hook for managing chat state and API communication
- **useFiles**: Hook for file upload and management
- **useHistory**: Hook for chat history and session persistence
- **useAgents**: Hook for agent management and switching

### API Routes
- `/api/proxy/chat`: Main chat endpoint with streaming support
- `/api/proxy/vector-store`: File storage and retrieval
- `/api/proxy/notes`: User notes management
- `/api/scenarios`: Learning scenario management

## Advanced Features

### Streaming Architecture
The system uses Server-Sent Events for real-time streaming of AI responses, providing a smooth user experience with progressive content updates.

### Citation System
Intelligent citation extraction and rendering from uploaded documents, with interactive badges showing source information.

### Mobile Optimization
Responsive design with mobile-specific components and touch-friendly interactions.

## Development Guidelines

### Code Style
- TypeScript for type safety
- ESLint for code quality
- Prettier for consistent formatting

### Component Structure
- Functional components with hooks
- Separation of concerns (UI, logic, state)
- Reusable UI primitives

### State Management
- Local state with useState
- Complex state with useReducer
- Global state with Context API

## Deployment

The application is configured for deployment on Vercel with:
- Automatic builds on push
- Environment variable management
- Edge function support

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

[License information]

## Documentation

### Core Documentation
- **[System Architecture](docs/architecture.md)** - Technical architecture, data flow, and system design
- **[Features Guide](docs/features.md)** - Detailed explanation of all system features
- **[API Reference](docs/api-guide.md)** - API endpoints, integration examples, and SDK development
- **[Developer Guide](docs/developer-guide.md)** - Setup instructions, development workflow, and contribution guidelines

## Support

For issues and questions, please refer to the documentation in the `/docs` folder or open an issue on GitHub.
# AI Tutoring Platform

A Next.js application for AI-powered tutoring with a clean, standalone implementation.

## Features

- Simple chat interface with AI tutoring capabilities
- Markdown and LaTeX rendering for mathematical content
- Syntax highlighting for code examples
- Optimized for performance with increased memory allocation

## Prerequisites

- Node.js 18.x or higher
- npm or yarn

## Quick Start

1. Clone the repository 
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   ./run-app.sh
   ```
   Or manually:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:4200](http://localhost:4200) in your browser

## Deployment to Vercel

This application is configured for seamless deployment to Vercel:

1. Install Vercel CLI (optional):
   ```bash
   npm install -g vercel
   ```

2. Deploy to Vercel:
   ```bash
   vercel
   ```
   
   Or connect your GitHub repository to Vercel dashboard for automatic deployments.

3. Environment Variables to set in Vercel:
   - `NEXT_PUBLIC_BACKEND_URL` - The URL of your backend API
   - `NEXT_PUBLIC_USE_REAL_BACKEND` - Set to 'true' to connect to real backend

## Connecting to Backend

The application is configured to connect to a backend API:

1. In development: Update `.env.local` with your backend URL
2. In production: Set environment variables in Vercel dashboard
3. API requests are automatically proxied through `/api/proxy` routes

## Development

This project uses:
- Next.js (latest)
- React (latest)
- TypeScript
- Tailwind CSS

## Available Scripts

- `npm run dev` - Start the development server on port 4200
- `npm run build` - Build the application for production
- `npm run start` - Start the production server
- `npm run lint` - Run ESLint for code quality
- `npm run clean` - Remove build artifacts and dependencies
- `npm run vercel-build` - Special build command for Vercel deployments

## Memory Optimization

This application is configured with 8GB memory allocation to prevent memory-related crashes during development. The memory settings are configured in:
- package.json scripts
- .env.local
- next.config.mjs

## Project Structure

- `/src/app` - Next.js application pages
- `/src/components` - Reusable React components
- `/src/lib` - Utility functions and helpers
- `/src/types` - TypeScript type definitions
- `/public` - Static assets

## License

[MIT License](LICENSE) 
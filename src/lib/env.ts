// Client-side environment variables
export const env = {
  NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5002',
  NEXT_PUBLIC_USE_REAL_BACKEND: process.env.NEXT_PUBLIC_USE_REAL_BACKEND === 'true'
}; 
/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  // Core configuration
  output: 'standalone',
  reactStrictMode: true,
  
  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  
  // Image optimization
  images: {
    unoptimized: process.env.NODE_ENV !== 'production',
  },
  
  // API routing
  async rewrites() {
    // Get backend URL from environment or use default
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5002';
    console.log(`Setting up rewrites to backend: ${backendUrl}`);
    
    return [
      // Primary API proxy route
      {
        source: '/api/proxy/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
      // Direct API route access
      {
        source: '/api/:path*',
        has: [
          {
            type: 'header',
            key: 'x-proxy-to-backend',
            value: 'true',
          },
        ],
        destination: `${backendUrl}/api/:path*`,
      }
    ];
  },
  
  // Experimental features
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      '@radix-ui/react-icons',
    ],
  },
  
  // Build-time optimizations
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig; 
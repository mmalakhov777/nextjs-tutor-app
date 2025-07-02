import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';

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
    formats: ['image/avif', 'image/webp'],
  },
  
  // API routing
  async rewrites() {
    // Only set up rewrites in development
    if (process.env.NODE_ENV === 'development') {
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
    }
    
    // In production, return empty rewrites
    return [];
  },
  
  // Experimental features
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      '@radix-ui/react-icons',
      'react-icons',
      '@heroicons/react',
      '@tiptap/react',
      '@tiptap/starter-kit',
      '@tiptap/extension-bold',
      '@tiptap/extension-italic',
      '@tiptap/extension-underline',
      '@tiptap/extension-heading',
      '@tiptap/extension-bullet-list',
      '@tiptap/extension-ordered-list',
      '@tiptap/extension-link',
      '@tiptap/extension-placeholder',
      '@tiptap/extension-image',
      '@tiptap/extension-table',
      '@tiptap/extension-table-row',
      '@tiptap/extension-table-cell',
      '@tiptap/extension-table-header',
      'react-markdown',
      'rehype-katex',
      'katex',
      'react-syntax-highlighter',
    ],
  },
  
  // Build-time optimizations
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Webpack configuration for bundle analysis and optimizations
  webpack: (config, { isServer, dev }) => {
    // Bundle analyzer in development
    if (!isServer && process.env.ANALYZE === 'true') {
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          reportFilename: './analyze.html',
          openAnalyzer: true,
        })
      );
    }
    
    // Optimize chunks
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Vendor chunks
            framework: {
              name: 'framework',
              chunks: 'all',
              test: /[\\/]node_modules[\\/](react|react-dom|next)[\\/]/,
              priority: 40,
              enforce: true,
            },
            commons: {
              name: 'commons',
              chunks: 'all',
              minChunks: 2,
              priority: 20,
            },
            // Separate heavy libraries
            tiptap: {
              name: 'tiptap',
              test: /[\\/]node_modules[\\/]@tiptap[\\/]/,
              chunks: 'all',
              priority: 30,
              reuseExistingChunk: true,
            },
            icons: {
              name: 'icons',
              test: /[\\/]node_modules[\\/](react-icons|lucide-react|@heroicons)[\\/]/,
              chunks: 'all',
              priority: 25,
              reuseExistingChunk: true,
            },
            markdown: {
              name: 'markdown',
              test: /[\\/]node_modules[\\/](react-markdown|remark-.*|rehype-.*)[\\/]/,
              chunks: 'all',
              priority: 25,
              reuseExistingChunk: true,
            },
            ui: {
              name: 'ui',
              test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
              chunks: 'all',
              priority: 25,
              reuseExistingChunk: true,
            },
          },
        },
        runtimeChunk: {
          name: 'runtime',
        },
      };
    }
    
    return config;
  },
};

export default nextConfig; 
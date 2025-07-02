# Next.js Backend Connection Debugging

## Original Issue

The NextJS frontend application was experiencing multiple issues:

1. CORS errors when trying to connect to the backend
2. JavaScript loading errors in the browser
3. Client components stuck in "Loading..." state

## Root Causes

### 1. CORS Configuration

The backend server was correctly configured to accept cross-origin requests, but was initially set up to accept requests from `http://localhost:3001`, while our frontend was running on `http://localhost:4200`.

The backend was properly responding with:
```
Access-Control-Allow-Origin: http://localhost:4200
Access-Control-Expose-Headers: Content-Type
Access-Control-Allow-Credentials: true
Vary: Origin
```

This meant direct browser-to-backend requests were working properly once the Origin header was recognized.

### 2. JavaScript Loading Errors

The browser console showed multiple JavaScript loading failures:
```
GET http://localhost:4200/_next/webpack.3806e869fdd5e294.js?v=1743284652089 net::ERR_ABORTED 404 (Not Found)
GET http://localhost:4200/_next/app-pages-internals.6e14b20ece6e484f.js net::ERR_ABORTED 404 (Not Found)
GET http://localhost:4200/_next/app/backend-test/page.0c13f0f963ea04b5.js net::ERR_ABORTED 404 (Not Found)
GET http://localhost:4200/_next/main-app.348ebcef59143f88.js?v=1743284652089 net::ERR_ABORTED 404 (Not Found)
```

These errors were caused by a custom webpack configuration in the `next.config.mjs` file that was adding cache busting to the JavaScript filenames:

```javascript
// Webpack configuration
webpack: (config, { dev, isServer }) => {
  // Only apply in development and for client-side bundles
  if (dev && !isServer) {
    // Add cache busting
    config.output.filename = '[name].[contenthash].js';
    config.output.chunkFilename = '[name].[contenthash].js';
  }
  return config;
},
```

This custom configuration was interfering with Next.js's built-in file serving mechanisms.

### 3. Build and Cache Issues

There were corrupted build artifacts and caches in:
- The `.next` directory
- The `node_modules/.cache` directory

## Solutions Applied

### 1. Fix CORS Configuration

The frontend was correctly set up with a proxy in `next.config.mjs`:

```javascript
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
}
```

This allowed server-side requests to work even without CORS.

We also created a static server-side rendering page that performed the backend tests without relying on client-side JavaScript, confirming the backend connection was functioning properly.

### 2. Remove Problematic Webpack Configuration

The custom webpack configuration was removed from `next.config.mjs`:

```diff
- // Webpack configuration
- webpack: (config, { dev, isServer }) => {
-   // Only apply in development and for client-side bundles
-   if (dev && !isServer) {
-     // Add cache busting
-     config.output.filename = '[name].[contenthash].js';
-     config.output.chunkFilename = '[name].[contenthash].js';
-   }
-   return config;
- },
```

This allowed Next.js to handle JavaScript file naming and serving with its default configuration, which is more reliable.

### 3. Complete Rebuild

We performed a complete rebuild with these steps:

1. Kill any running processes on port 4200:
   ```
   lsof -i :4200 | grep LISTEN | awk '{print $2}' | xargs kill -9
   ```

2. Clean build artifacts and dependencies:
   ```
   rm -rf .next node_modules
   ```

3. Reinstall dependencies:
   ```
   npm install
   ```

4. Build the application:
   ```
   npm run build
   ```

5. Start a fresh development server:
   ```
   npm run dev
   ```

## Results

After applying these fixes:

1. JavaScript files are loading correctly
2. Client-side React components are rendering properly
3. Backend connection tests are passing with proper CORS headers
4. Server-side rendered pages are working correctly

## Key Lessons

1. **Avoid Custom Webpack Configurations**: Next.js has optimized defaults for file naming and caching. Custom configurations can interfere with these defaults.

2. **Test Different Approaches**: Creating a server-side rendered version of the page helped isolate client-side JavaScript issues from backend connection issues.

3. **Check Build Artifacts**: Corrupted `.next` directories and node module caches can cause unexpected behavior.

4. **CORS Verification**: Always verify CORS headers are correctly applied using tools like `curl` with explicit `Origin` headers.

5. **Proxying API Requests**: Next.js rewrites provide a reliable way to proxy requests to backend services without CORS issues.

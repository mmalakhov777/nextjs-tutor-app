import { NextRequest, NextResponse } from 'next/server';

// In-memory cache for server-side caching
const serverCache = new Map<string, { description: string | null; timestamp: number }>();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes server cache

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
  }

  // Check server cache first
  const cached = serverCache.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return NextResponse.json({ 
      description: cached.description,
      url,
      cached: true
    });
  }

  try {
    // Create abort controller with longer timeout for YouTube
    const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
    const timeout = isYouTube ? 8000 : 3000; // 8 seconds for YouTube, 3 for others
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // Use better user agent for YouTube
    const userAgent = isYouTube 
      ? 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      : 'Mozilla/5.0 (compatible; MetaBot/1.0)';

    // Fetch with optimized headers
    const response = await fetch(url, {
      headers: {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Upgrade-Insecure-Requests': '1',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Read more content for YouTube as meta tags might be further down
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Unable to read response body');
    }

    let html = '';
    let totalBytes = 0;
    const maxBytes = isYouTube ? 200 * 1024 : 50 * 1024; // 200KB for YouTube, 50KB for others

    while (totalBytes < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      
      totalBytes += value.length;
      html += new TextDecoder().decode(value);
      
      // Early exit if we found closing head tag (but not for YouTube as they load content dynamically)
      if (!isYouTube && html.includes('</head>')) {
        break;
      }
    }

    reader.releaseLock();

    // Improved regex patterns with better handling of quotes and attributes
    const patterns = [
      // OG description (highest priority)
      /<meta\s+property\s*=\s*["']og:description["']\s+content\s*=\s*["']([^"']*?)["']/i,
      /<meta\s+content\s*=\s*["']([^"']*?)["']\s+property\s*=\s*["']og:description["']/i,
      
      // Standard meta description
      /<meta\s+name\s*=\s*["']description["']\s+content\s*=\s*["']([^"']*?)["']/i,
      /<meta\s+content\s*=\s*["']([^"']*?)["']\s+name\s*=\s*["']description["']/i,
      
      // Twitter description
      /<meta\s+name\s*=\s*["']twitter:description["']\s+content\s*=\s*["']([^"']*?)["']/i,
      /<meta\s+content\s*=\s*["']([^"']*?)["']\s+name\s*=\s*["']twitter:description["']/i,
    ];

    let description = null;

    // Try each pattern until we find a match
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match && match[1] && match[1].trim()) {
        description = match[1].trim();
        break;
      }
    }

    // Clean up HTML entities and extra whitespace
    if (description) {
      description = description
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    // Cache the result
    serverCache.set(url, {
      description,
      timestamp: Date.now()
    });

    // Clean up old cache entries periodically
    if (serverCache.size > 1000) {
      const now = Date.now();
      for (const [key, value] of serverCache.entries()) {
        if (now - value.timestamp > CACHE_DURATION) {
          serverCache.delete(key);
        }
      }
    }

    return NextResponse.json({ 
      description,
      url,
      cached: false
    });

  } catch (error: unknown) {
    console.error('Error fetching meta description:', error);
    
    // Cache null result to prevent immediate retries
    serverCache.set(url, {
      description: null,
      timestamp: Date.now()
    });

    return NextResponse.json({ 
      error: 'Failed to fetch meta description',
      description: null,
      url 
    }, { status: 500 });
  }
} 
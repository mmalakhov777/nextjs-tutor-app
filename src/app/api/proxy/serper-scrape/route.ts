import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    let screenshotUrl = null;
    let title = '';
    let description = '';
    let favicon = null;
    
    // Try to get screenshot using free services
    try {
      // Option 1: Use screenshot.guru (free tier)
      const screenshotResponse = await fetch(`https://api.screenshotone.com/take?access_key=demo&url=${encodeURIComponent(url)}&viewport_width=1200&viewport_height=800&image_quality=80&format=png`, {
        method: 'GET',
        signal: AbortSignal.timeout(15000)
      });
      
      if (screenshotResponse.ok) {
        screenshotUrl = screenshotResponse.url;
      } else {
        // Fallback to a simple screenshot service
        screenshotUrl = `https://mini.s-shot.ru/1200x800/PNG/1200/Z100/?${encodeURIComponent(url)}`;
      }
    } catch (error) {
      console.log('Screenshot service failed, using fallback:', error);
      // Use a simple screenshot service as fallback
      screenshotUrl = `https://mini.s-shot.ru/1200x800/PNG/1200/Z100/?${encodeURIComponent(url)}`;
    }

    // Try to get page metadata
    try {
      const metadataResponse = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(10000)
      });
      
      if (metadataResponse.ok) {
        const html = await metadataResponse.text();
        
        // Extract title
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch) {
          title = titleMatch[1].trim().replace(/\s+/g, ' ');
        }
        
        // Extract description from meta tags
        const descriptionMatch = html.match(/<meta[^>]*name=["\']description["\'][^>]*content=["\']([^"']+)["\'][^>]*>/i) ||
                                html.match(/<meta[^>]*content=["\']([^"']+)["\'][^>]*name=["\']description["\'][^>]*>/i) ||
                                html.match(/<meta[^>]*property=["\']og:description["\'][^>]*content=["\']([^"']+)["\'][^>]*>/i);
        if (descriptionMatch) {
          description = descriptionMatch[1].trim().replace(/\s+/g, ' ');
        }
        
        // Extract favicon
        const faviconMatch = html.match(/<link[^>]*rel=["\'](?:icon|shortcut icon|apple-touch-icon)["\'][^>]*href=["\']([^"']+)["\'][^>]*>/i) ||
                           html.match(/<link[^>]*href=["\']([^"']+)["\'][^>]*rel=["\'](?:icon|shortcut icon)["\'][^>]*>/i);
        if (faviconMatch) {
          let faviconPath = faviconMatch[1];
          if (faviconPath.startsWith('//')) {
            faviconPath = 'https:' + faviconPath;
          } else if (faviconPath.startsWith('/')) {
            const urlObj = new URL(url);
            faviconPath = urlObj.origin + faviconPath;
          } else if (!faviconPath.startsWith('http')) {
            const urlObj = new URL(url);
            faviconPath = urlObj.origin + '/' + faviconPath;
          }
          favicon = faviconPath;
        } else {
          // Try default favicon location
          const urlObj = new URL(url);
          favicon = urlObj.origin + '/favicon.ico';
        }
      }
    } catch (metadataError) {
      console.log('Failed to fetch metadata:', metadataError);
    }

    // If no title was found, use domain name
    if (!title) {
      const urlObj = new URL(url);
      title = urlObj.hostname.replace('www.', '');
    }

    // Truncate description if too long
    if (description && description.length > 200) {
      description = description.substring(0, 197) + '...';
    }

    return NextResponse.json({
      title,
      description,
      screenshot: screenshotUrl,
      favicon,
      url
    });

  } catch (error) {
    console.error('Error in serper-scrape:', error);
    return NextResponse.json(
      { error: 'Failed to scrape URL' },
      { status: 500 }
    );
  }
} 
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const TARGET_URL = 'http://172.18.3.10:8088';
const BASE_PATH = '/data/perspective/client/ProjectBTG/pltu-ab';

export async function GET(request: NextRequest) {
  try {
    // Get the path from query parameters
    const searchParams = request.nextUrl.searchParams;
    const path = searchParams.get('path') || '';
    
    if (!path) {
      // If no path, serve the main page
      const targetPath = BASE_PATH;
      const url = `${TARGET_URL}${targetPath}`;
      
      const response = await fetch(url, {
        method: request.method,
        headers: {
          'Accept': 'text/html, application/xhtml+xml, application/xml, */*',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      if (!response.ok) {
        return NextResponse.json(
          { 
            error: `Failed to fetch from internal server: ${response.status} ${response.statusText}`,
            message: 'Tidak dapat mengakses server internal. Pastikan Anda terhubung ke jaringan kantor (wifi).'
          },
          { status: response.status }
        );
      }

      // Get the content type
      const contentType = response.headers.get('content-type') || '';
      
      // If it's HTML, rewrite URLs
      if (contentType.includes('text/html')) {
        let html = await response.text();
        
        // Rewrite all relative URLs to point to our proxy
        html = rewriteHtmlUrls(html, targetPath);
        
        // Remove X-Frame-Options and CSP headers that block iframes
        const headers = new Headers(response.headers);
        headers.delete('X-Frame-Options');
        headers.delete('Content-Security-Policy');
        
        return new NextResponse(html, {
          status: response.status,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'X-Content-Type-Options': 'nosniff',
            'Cache-Control': 'no-cache',
          },
        });
      }
      
      // For non-HTML, return as-is but with CORS headers
      const data = await response.arrayBuffer();
      return new NextResponse(data, {
        status: response.status,
        headers: {
          'Content-Type': contentType || 'application/octet-stream',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-cache',
        },
      });
    } else {
      // If path is provided, fetch that specific resource
      const url = `${TARGET_URL}/${path}`;
      
      const response = await fetch(url, {
        method: request.method,
        headers: {
          'Accept': '*/*',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      if (!response.ok) {
        return NextResponse.json(
          { 
            error: `Failed to fetch resource: ${response.status} ${response.statusText}`,
            message: 'Resource tidak ditemukan atau tidak dapat diakses.'
          },
          { status: response.status }
        );
      }

      // Get the content type from the response
      const contentType = response.headers.get('content-type') || '';
      
      // For HTML content, rewrite URLs
      if (contentType.includes('text/html')) {
        let html = await response.text();
        
        // Determine the base path for this resource
        const resourcePath = path.substring(0, path.lastIndexOf('/'));
        html = rewriteHtmlUrls(html, resourcePath);
        
        // Remove X-Frame-Options and CSP headers
        const headers = new Headers(response.headers);
        headers.delete('X-Frame-Options');
        headers.delete('Content-Security-Policy');
        
        return new NextResponse(html, {
          status: response.status,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'X-Content-Type-Options': 'nosniff',
            'Cache-Control': 'no-cache',
          },
        });
      }
      
      // For CSS, JS, images, etc., return as-is with proper MIME type
      const data = await response.arrayBuffer();
      return new NextResponse(data, {
        status: response.status,
        headers: {
          'Content-Type': contentType || 'application/octet-stream',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-cache',
        },
      });
    }
    
  } catch (error) {
    const isNetworkError = error instanceof TypeError && error.message.includes('fetch');
    
    return NextResponse.json(
      { 
        error: 'Network error',
        message: isNetworkError 
          ? 'Tidak dapat terhubung ke server internal (172.18.3.10:8088). Pastikan Anda terhubung ke jaringan kantor (wifi).'
          : 'Terjadi kesalahan saat mengakses data.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 503 }
    );
  }
}

function rewriteHtmlUrls(html: string, currentPath: string) {
  // Base URL for our proxy
  const proxyBase = '/api/tonasa-proxy';
  
  // Rewrite relative URLs (src="...", href="...", etc.)
  html = html.replace(
    /(src|href|action|data|poster|srcset)=["']([^"']+?)["']/gi,
    (match, attr, url) => {
      // Skip if it's already an absolute URL with protocol
      if (url.match(/^https?:\/\//i) || url.startsWith('data:') || url.startsWith('javascript:')) {
        return match;
      }
      
      // Skip if it's already a proxy URL
      if (url.startsWith(proxyBase)) {
        return match;
      }
      
      // Handle relative URLs
      let newPath: string;
      if (url.startsWith('/')) {
        // Absolute path from root
        newPath = `${proxyBase}?path=${encodeURIComponent(url.substring(1))}`;
      } else {
        // Relative to current path
        const fullPath = currentPath ? `${currentPath}/${url}` : url;
        newPath = `${proxyBase}?path=${encodeURIComponent(fullPath)}`;
      }
      
      return `${attr}="${newPath}"`;
    }
  );
  
  // Rewrite CSS url() references
  html = html.replace(
    /url\(["']?([^"')]+)["']?\)/gi,
    (match, url) => {
      if (url.match(/^https?:\/\//i) || url.startsWith('data:') || url.startsWith('#')) {
        return match;
      }
      
      if (url.startsWith(proxyBase)) {
        return match;
      }
      
      let newPath: string;
      if (url.startsWith('/')) {
        newPath = `${proxyBase}?path=${encodeURIComponent(url.substring(1))}`;
      } else {
        const fullPath = currentPath ? `${currentPath}/${url}` : url;
        newPath = `${proxyBase}?path=${encodeURIComponent(fullPath)}`;
      }
      
      return `url("${newPath}")`;
    }
  );
  
  // Remove X-Frame-Options meta tags
  html = html.replace(
    /<meta[^>]*http-equiv=["']X-Frame-Options["'][^>]*>/gi,
    ''
  );
  
  // Remove CSP meta tags that might block iframes
  html = html.replace(
    /<meta[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/gi,
    ''
  );
  
  // Add base tag to help with relative URLs
  if (!html.includes('<base')) {
    html = html.replace(
      /<head[^>]*>/i,
      `<head><base href="${proxyBase}?path=${encodeURIComponent(currentPath)}">`
    );
  }
  
  return html;
}

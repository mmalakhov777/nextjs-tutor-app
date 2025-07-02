import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Eye, Printer } from 'lucide-react';

export interface CVContent {
  html: string;
  title?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface CVViewerProps {
  cvContent?: CVContent | null;
  onCreateCV?: () => void;
  onSendMessage?: (message: string, agent?: string) => void;
  isLoading?: boolean;
}

// Utility function to parse and clean CV content from unpredictable LLM output
const parseAndCleanCVContent = (rawContent: any): CVContent | null => {
  if (!rawContent) return null;

  console.log('[CVViewer] Raw content received:', rawContent);

  // If it's already a proper CVContent object, return it
  if (typeof rawContent === 'object' && rawContent.html && typeof rawContent.html === 'string') {
    return {
      html: cleanHTML(rawContent.html),
      title: rawContent.title || 'CV/Resume',
      createdAt: rawContent.createdAt ? new Date(rawContent.createdAt) : new Date(),
      updatedAt: rawContent.updatedAt ? new Date(rawContent.updatedAt) : new Date(),
    };
  }

  // If it's a string, try multiple parsing strategies
  if (typeof rawContent === 'string') {
    let contentToParse = rawContent.trim();
    
    // Remove markdown code block markers if present
    if (contentToParse.startsWith('```json') || contentToParse.startsWith('```')) {
      contentToParse = contentToParse.replace(/^```(?:json)?\s*/, '').replace(/```\s*$/, '').trim();
    }
    
    // Try direct JSON parsing first
    try {
      const parsed = JSON.parse(contentToParse);
      if (parsed.html) {
        return {
          html: cleanHTML(parsed.html),
          title: parsed.title || 'CV/Resume',
          createdAt: parsed.createdAt ? new Date(parsed.createdAt) : new Date(),
          updatedAt: parsed.updatedAt ? new Date(parsed.updatedAt) : new Date(),
        };
      }
    } catch (e) {
      console.log('[CVViewer] Direct JSON parsing failed, trying extraction methods');
    }
    
    // Try to extract JSON from a string that might contain other text
    // Look for the largest JSON object in the string
    const jsonMatches = contentToParse.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);
    if (jsonMatches) {
      // Try parsing each JSON match, starting with the largest
      const sortedMatches = jsonMatches.sort((a, b) => b.length - a.length);
      
      for (const match of sortedMatches) {
        try {
          const parsed = JSON.parse(match);
          if (parsed.html) {
            return {
              html: cleanHTML(parsed.html),
              title: parsed.title || 'CV/Resume',
              createdAt: parsed.createdAt ? new Date(parsed.createdAt) : new Date(),
              updatedAt: parsed.updatedAt ? new Date(parsed.updatedAt) : new Date(),
            };
          }
        } catch (e) {
          continue; // Try next match
        }
      }
    }
    
    // Try a more aggressive JSON extraction with nested braces
    const nestedJsonMatch = contentToParse.match(/\{[\s\S]*\}/);
    if (nestedJsonMatch) {
      try {
        const parsed = JSON.parse(nestedJsonMatch[0]);
        if (parsed.html) {
          return {
            html: cleanHTML(parsed.html),
            title: parsed.title || 'CV/Resume',
            createdAt: parsed.createdAt ? new Date(parsed.createdAt) : new Date(),
            updatedAt: parsed.updatedAt ? new Date(parsed.updatedAt) : new Date(),
          };
        }
      } catch (e) {
        console.log('[CVViewer] Nested JSON extraction failed');
      }
    }
    
    // Look for HTML content directly in the string
    if (contentToParse.includes('<') && contentToParse.includes('>')) {
      console.log('[CVViewer] Found HTML content, extracting...');
      
      // Try to extract HTML between quotes or as standalone content
      let htmlContent = contentToParse;
      
      // If it looks like escaped JSON, try to extract the HTML value
      const htmlMatch = contentToParse.match(/"html"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);
      if (htmlMatch) {
        htmlContent = htmlMatch[1];
      }
      
      return {
        html: cleanHTML(htmlContent),
        title: 'CV/Resume',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
    
    // If all else fails, treat the entire string as HTML content
    console.log('[CVViewer] Treating entire string as HTML content');
    return {
      html: cleanHTML(contentToParse),
      title: 'CV/Resume',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  console.warn('[CVViewer] Unable to parse CV content:', rawContent);
  return null;
};

// Utility function to clean HTML content
const cleanHTML = (html: string): string => {
  if (!html || typeof html !== 'string') return '';
  
  // Remove escaped characters and clean up the HTML
  let cleaned = html
    .replace(/\\n/g, '\n')           // Replace escaped newlines
    .replace(/\\t/g, '\t')           // Replace escaped tabs
    .replace(/\\"/g, '"')            // Replace escaped quotes
    .replace(/\\'/g, "'")            // Replace escaped single quotes
    .replace(/\\\\/g, '\\')          // Replace escaped backslashes
    .trim();                         // Remove leading/trailing whitespace

  // If the HTML starts and ends with quotes, remove them
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || 
      (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1);
  }

  // Basic HTML validation - ensure we have some HTML content
  if (!cleaned.includes('<') || !cleaned.includes('>')) {
    // If it doesn't look like HTML, wrap it in basic HTML structure
    cleaned = `<div class="cv-content">${cleaned}</div>`;
  }

  return cleaned;
};

const CVViewer: React.FC<CVViewerProps> = ({
  cvContent: rawCvContent,
  onCreateCV,
  onSendMessage,
  isLoading = false
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [notification, setNotification] = useState<string | null>(null);

  // Parse and clean the CV content
  const cvContent = parseAndCleanCVContent(rawCvContent);

  // Update iframe content when cvContent changes
  useEffect(() => {
    if (cvContent && iframeRef.current) {
      const iframe = iframeRef.current;
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      
      if (doc) {
        // Build complete HTML document
        const fullHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${cvContent.title || 'CV/Resume'}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: white;
        }
        
        /* Default CV styling */
        h1, h2, h3, h4, h5, h6 {
            color: #2c3e50;
            margin-top: 1.5em;
            margin-bottom: 0.5em;
        }
        
        h1 {
            border-bottom: 2px solid #3498db;
            padding-bottom: 10px;
        }
        
        h2 {
            border-bottom: 1px solid #bdc3c7;
            padding-bottom: 5px;
        }
        
        ul, ol {
            padding-left: 20px;
        }
        
        li {
            margin-bottom: 5px;
        }
        
        .contact-info {
            text-align: center;
            margin-bottom: 30px;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
        }
        
        .section {
            margin-bottom: 30px;
        }
        
        .job-title {
            font-weight: bold;
            color: #2c3e50;
        }
        
        .company {
            font-style: italic;
            color: #7f8c8d;
        }
        
        .date-range {
            float: right;
            color: #7f8c8d;
            font-size: 0.9em;
        }
        
        .skills-list {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
        }
        
        .skill-tag {
            background: #3498db;
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.9em;
        }
        
        @media print {
            body {
                padding: 0;
                font-size: 12px;
            }
            
            .no-print {
                display: none;
            }
        }
    </style>
</head>
<body>
    ${cvContent.html}
</body>
</html>`;

        doc.open();
        doc.write(fullHTML);
        doc.close();
      }
    }
  }, [cvContent]);

  const handleDownloadHTML = () => {
    if (!cvContent) return;
    
    const fullHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${cvContent.title || 'CV-Resume'}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: white;
        }
        
        /* Default CV styling */
        h1, h2, h3, h4, h5, h6 {
            color: #2c3e50;
            margin-top: 1.5em;
            margin-bottom: 0.5em;
        }
        
        h1 {
            border-bottom: 2px solid #3498db;
            padding-bottom: 10px;
        }
        
        h2 {
            border-bottom: 1px solid #bdc3c7;
            padding-bottom: 5px;
        }
        
        ul, ol {
            padding-left: 20px;
        }
        
        li {
            margin-bottom: 5px;
        }
        
        .contact-info {
            text-align: center;
            margin-bottom: 30px;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
        }
        
        .section {
            margin-bottom: 30px;
        }
        
        .job-title {
            font-weight: bold;
            color: #2c3e50;
        }
        
        .company {
            font-style: italic;
            color: #7f8c8d;
        }
        
        .date-range {
            float: right;
            color: #7f8c8d;
            font-size: 0.9em;
        }
        
        .skills-list {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
        }
        
        .skill-tag {
            background: #3498db;
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.9em;
        }
        
        @media print {
            body {
                padding: 0;
                font-size: 12px;
            }
            
            .no-print {
                display: none;
            }
        }
    </style>
</head>
<body>
    ${cvContent.html}
</body>
</html>`;

    const blob = new Blob([fullHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${cvContent.title || 'CV-Resume'}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setNotification('CV downloaded as HTML file!');
    setTimeout(() => setNotification(null), 3000);
  };

  const handlePrint = () => {
    if (!cvContent) return;
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to enable printing');
      return;
    }
    
    // Build complete HTML document with print styles
    const fullHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${cvContent.title || 'CV/Resume'}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: white;
        }
        
        h1, h2, h3, h4, h5, h6 {
            color: #2c3e50;
            margin-top: 1.5em;
            margin-bottom: 0.5em;
        }
        
        h1 {
            font-size: 2em;
            border-bottom: 2px solid #3498db;
            padding-bottom: 0.3em;
        }
        
        h2 {
            font-size: 1.5em;
            color: #34495e;
        }
        
        h3 {
            font-size: 1.2em;
        }
        
        p {
            margin-bottom: 1em;
        }
        
        ul, ol {
            margin-bottom: 1em;
            padding-left: 2em;
        }
        
        li {
            margin-bottom: 0.5em;
        }
        
        .contact-info {
            text-align: center;
            margin-bottom: 2em;
            padding-bottom: 1em;
            border-bottom: 1px solid #eee;
        }
        
        .section {
            margin-bottom: 2em;
        }
        
        .job-title {
            font-weight: bold;
            color: #2c3e50;
        }
        
        .company {
            font-style: italic;
            color: #7f8c8d;
        }
        
        .date {
            color: #95a5a6;
            font-size: 0.9em;
        }
        
        .skills {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5em;
        }
        
        .skill {
            background: #ecf0f1;
            padding: 0.2em 0.5em;
            border-radius: 3px;
            font-size: 0.9em;
        }
        
        /* Print-specific styles */
        @media print {
            body {
                margin: 0;
                padding: 15px;
                font-size: 12pt;
                line-height: 1.4;
            }
            
            h1 {
                font-size: 18pt;
                page-break-after: avoid;
            }
            
            h2 {
                font-size: 14pt;
                page-break-after: avoid;
            }
            
            h3 {
                font-size: 12pt;
                page-break-after: avoid;
            }
            
            .section {
                page-break-inside: avoid;
                margin-bottom: 1.5em;
            }
            
            .contact-info {
                page-break-after: avoid;
            }
        }
    </style>
</head>
<body>
    ${cvContent.html}
</body>
</html>`;
    
    // Write content to the new window
    printWindow.document.write(fullHTML);
    printWindow.document.close();
    
    // Wait for content to load, then print
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
    
    // Fallback for browsers that don't trigger onload
    setTimeout(() => {
      if (!printWindow.closed) {
        printWindow.print();
        printWindow.close();
      }
    }, 500);
  };

  const handleQuickAction = (action: string) => {
    if (!onSendMessage) {
      console.error('No message handler available for CV quick actions');
      return;
    }
    
    // Send the action as a message to the chat with CV Writer agent
    onSendMessage(action, 'CV Writer Agent');
  };

  // Empty state - no CV content
  if (!cvContent) {
    // Check if we have raw content but failed to parse it
    if (rawCvContent) {
      console.error('[CVViewer] Failed to parse CV content:', rawCvContent);
      return (
        <div className="p-6 h-full flex flex-col items-center justify-center text-center">
                  <div className="mb-6">
                      <div 
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: '#dc2626' }}
            >
              <Eye className="h-8 w-8 text-white" />
            </div>
        </div>
        
        <p className="mb-8 max-w-md" style={{ color: '#3C3C3C', fontSize: '16px' }}>
          The CV content couldn't be parsed properly. This might be due to unexpected formatting from the AI.
        </p>
        
        <Button
          onClick={() => handleQuickAction('There was an issue with the CV format. Please regenerate the CV with proper structure.')}
          className="px-8 py-4 font-medium mb-4"
          style={{
            display: 'flex',
            padding: '16px 40px',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '8px',
            borderRadius: '100px',
            background: '#059669',
            color: '#FFF',
            border: 'none',
            height: '56px',
            minWidth: '280px',
            fontSize: '16px'
          }}
        >
          Regenerate CV
        </Button>
        
        <details className="text-left">
          <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
            Show raw content (for debugging)
          </summary>
          <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-32">
            {JSON.stringify(rawCvContent, null, 2)}
          </pre>
        </details>
        </div>
      );
    }
    
    // Normal empty state
    return (
      <div className="p-6 h-full flex flex-col items-center justify-center text-center">
        <div className="mb-6">
          <div 
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: '#6C6C6C' }}
          >
            <Eye className="h-8 w-8 text-white" />
          </div>
        </div>
        
        <p className="mb-4 max-w-md" style={{ color: '#3C3C3C', fontSize: '16px' }}>
          No CV content yet. Use the overview to create your first CV.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header with controls */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold" style={{ color: '#232323' }}>
              {cvContent.title || 'CV/Resume'}
            </h3>
          </div>
          

        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadHTML}
            style={{
              border: '1px solid #E8E8E5',
              background: '#FFF',
              color: '#232323'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#F8F8F3';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = '#FFF';
            }}
          >
            <Download className="h-4 w-4 mr-1" />
            Download
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            style={{
              border: '1px solid #E8E8E5',
              background: '#FFF',
              color: '#232323'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#F8F8F3';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = '#FFF';
            }}
          >
            <Printer className="h-4 w-4 mr-1" />
            Print
          </Button>
          
          <Button
            size="sm"
            onClick={() => handleQuickAction('Please help me update my CV with new information or create a new version.')}
            style={{
              display: 'flex',
              padding: '12px 24px',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '8px',
              borderRadius: '100px',
              background: '#059669',
              color: '#FFF',
              border: 'none',
              height: '32px',
              fontSize: '14px'
            }}
          >
            Update CV
          </Button>
        </div>
      </div>
      
      {/* Content area */}
      <div className="flex-1 overflow-hidden">
        <iframe
          ref={iframeRef}
          className="w-full h-full border-none"
          title="CV Preview"
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
      
      {/* Notification */}
      {notification && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50">
          {notification}
        </div>
      )}
    </div>
  );
};

export default CVViewer; 
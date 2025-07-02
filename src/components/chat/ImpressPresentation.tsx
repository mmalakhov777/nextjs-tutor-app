import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Plus, Trash2, Eye, Code, Edit3, Download, Maximize, LayoutTemplate } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export interface RevealSlide {
  id: string;
  title: string;
  content: string;
  backgroundColor: string;
  transition: 'slide' | 'fade' | 'zoom' | 'convex' | 'concave';
  createdAt: Date;
  updatedAt: Date;
}

interface RevealPresentationProps {
  userId?: string;
  currentConversationId?: string;
  slides?: RevealSlide[];
  onCreateSlide?: (slide: Omit<RevealSlide, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateSlide?: (slideId: string, updates: Partial<RevealSlide>) => void;
  onDeleteSlide?: (slideId: string) => void;
  onSendMessage?: (message: string, agent?: string) => void;
  // New props for agent integration
  agentSlides?: RevealSlide[];
  onAgentSlideUpdate?: (slideNumber: number, slide: RevealSlide) => void;
  // Size control props
  contentScale?: number; // Scale factor for all content (default: 1)
  headingSize?: string; // Font size for headings (default: '2.2em')
  textSize?: string; // Font size for paragraphs (default: '1.1em')
  listSize?: string; // Font size for lists (default: '1em')
  chartWidth?: number; // Width for charts (default: 1000)
  chartHeight?: number; // Height for charts (default: 600)
}

const RevealPresentation: React.FC<RevealPresentationProps> = ({
  userId,
  currentConversationId,
  slides: propSlides = [],
  onCreateSlide,
  onUpdateSlide,
  onDeleteSlide,
  onSendMessage,
  agentSlides = [],
  onAgentSlideUpdate,
  // Size control props with defaults
  contentScale = 1,
  headingSize = '2.2em',
  textSize = '1.1em',
  listSize = '1em',
  chartWidth = 1000,
  chartHeight = 600
}) => {
  // Start with empty slides array - no default presentation
  const dummySlides: RevealSlide[] = [];

  // Use agent slides if available, otherwise fall back to dummy slides
  const slides = agentSlides.length > 0 ? agentSlides : dummySlides;

  const [activeTab, setActiveTab] = useState<'edit' | 'preview' | 'list'>('preview');
  const [isCreating, setIsCreating] = useState(false);
  const [newSlideTitle, setNewSlideTitle] = useState('');
  const [newSlideContent, setNewSlideContent] = useState('');
  const [editingSlideId, setEditingSlideId] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isPreviewReady, setIsPreviewReady] = useState(false);
  const previewRef = useRef<HTMLIFrameElement>(null);
  const hiddenPreviewRef = useRef<HTMLIFrameElement>(null);

  // Reset component state when conversation changes
  useEffect(() => {
    // Reset editing states when conversation changes
    setEditingSlideId(null);
    setIsCreating(false);
    setNewSlideTitle('');
    setNewSlideContent('');
    setIsPreviewLoading(false);
    setIsPreviewReady(false);
    // Reset to preview tab for new sessions
    setActiveTab('preview');
  }, [currentConversationId]);

  const handleCreateSlide = useCallback(() => {
    if (!newSlideTitle.trim()) return;
    
    const slideData = {
      title: newSlideTitle.trim(),
      content: newSlideContent || '<h2>New Slide</h2><p>Add your content here...</p>',
      backgroundColor: '#2c3e50',
      transition: 'slide' as const
    };
    
    onCreateSlide?.(slideData);
    setNewSlideTitle('');
    setNewSlideContent('');
    setIsCreating(false);
  }, [newSlideTitle, newSlideContent, onCreateSlide]);

  const handleUpdateSlide = useCallback((slideId: string, updates: Partial<RevealSlide>) => {
    onUpdateSlide?.(slideId, { ...updates, updatedAt: new Date() });
  }, [onUpdateSlide]);

  const handleDeleteSlide = useCallback((slideId: string) => {
    if (window.confirm('Are you sure you want to delete this slide?')) {
      onDeleteSlide?.(slideId);
    }
  }, [onDeleteSlide]);

  const generateRevealHTML = useCallback(() => {
    const revealHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reveal.js Presentation</title>
    
         <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5.0.4/dist/reveal.css">
     <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5.0.4/dist/theme/black.css">
     <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5.0.4/plugin/highlight/monokai.css">
     <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js"></script>
    
    <style>
        /* Override default Reveal.js padding to eliminate space above */
        html, body {
            margin: 0 !important;
        }

        .reveal .slides section {
            text-align: center;
            padding: 0 !important;  /* remove default 40px padding */
            transform: scale(${contentScale}) !important;
            transform-origin: center center !important;
        }
        
        .reveal .slides section[data-background-color] {
            color: white;
        }
        
        /* Remove all spacing from headings */
        .reveal h1, .reveal h2, .reveal h3, .reveal h4, .reveal h5, .reveal h6 {
            margin: 0 !important;
            padding: 0 !important;
            font-size: ${headingSize} !important;
        }
        
        /* Apply custom text sizes */
        .reveal p {
            font-size: ${textSize} !important;
        }
        
        .reveal ul, .reveal ol {
            font-size: ${listSize} !important;
        }
        
        .reveal .slides section > *:first-child {
            margin-top: 0 !important;
            padding-top: 0 !important;
        }
        
        /* Remove spacing above charts and canvas elements */
        .reveal .slides section canvas,
        .reveal canvas {
            margin: 0 auto !important;
            padding: 0 !important;
            display: block !important;
            max-width: none !important;
            max-height: none !important;
            width: ${chartWidth}px !important;
            height: ${chartHeight}px !important;
            min-width: ${chartWidth}px !important;
            min-height: ${chartHeight}px !important;
        }
        
        /* Override any Chart.js responsive styles */
        .reveal .slides section canvas[style],
        .reveal canvas[style] {
            width: ${chartWidth}px !important;
            height: ${chartHeight}px !important;
        }
        
        .reveal .slides section canvas:first-child {
            margin-top: 0 !important;
            padding-top: 0 !important;
        }
        
        /* Chart container styling */
        .reveal .chart-container {
            margin: 0 !important;
            padding: 0 !important;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            width: 100%;
            max-width: 90vw;
            max-height: 80vh;
            overflow: hidden;
        }
        
        /* Remove spacing from chart descriptions */
        .reveal .chart-description {
            margin: 0 !important;
            padding: 0 !important;
            font-size: 0.9em;
            margin-bottom: 10px !important;
        }
        
        /* Ensure slides don't overflow */
        .reveal .slides section {
            overflow: hidden !important;
            box-sizing: border-box !important;
        }
        
        .reveal .progress {
            color: #42affa;
        }
        
        .slide-counter {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 1000;
            background: rgba(35, 35, 35, 0.5);
            color: white;
            padding: 5px 10px;
            border-radius: 15px;
            font-size: 12px;
        }
    </style>
</head>

<body>
    <div class="reveal">
        <div class="slides">
            ${slides.map((slide, index) => {
                // Check if content already contains a heading (h1, h2, h3)
                const hasHeading = /<h[1-6][^>]*>/i.test(slide.content);
                
                // If no heading found in content, prepend the title as h2
                const contentWithTitle = hasHeading 
                    ? slide.content 
                    : `<h2>${slide.title}</h2>${slide.content}`;
                
                // Debug logging
                console.log(`Slide ${index + 1}: "${slide.title}" - Has heading: ${hasHeading}`);
                
                return `
            <section data-background-color="${slide.backgroundColor}" data-transition="${slide.transition}">
                ${contentWithTitle}
            </section>
            `;
            }).join('')}
        </div>
    </div>

    <div class="slide-counter">
        <span id="current-slide">1</span> / <span id="total-slides">${slides.length}</span>
    </div>

    

    <script src="https://cdn.jsdelivr.net/npm/reveal.js@5.0.4/dist/reveal.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/reveal.js@5.0.4/plugin/notes/notes.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/reveal.js@5.0.4/plugin/markdown/markdown.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/reveal.js@5.0.4/plugin/highlight/highlight.js"></script>

         <script>
         // Wait for DOM to be ready
         document.addEventListener('DOMContentLoaded', function() {
             // Initialize Reveal.js
             Reveal.initialize({
                 hash: false,
                 controls: true,
                 progress: true,
                 center: false,
                 transition: 'slide',
                 plugins: [ RevealMarkdown, RevealHighlight, RevealNotes ]
             }).then(() => {
                 // Force remove vertical centering after initialization
                 const slides = document.querySelectorAll('.reveal .slides section');
                 slides.forEach(slide => {
                     slide.style.top = '0px';
                     slide.style.transform = 'none';
                     slide.style.webkitTransform = 'none';
                 });
                 console.log('Reveal.js initialized successfully');
                 
                 // Update slide counter
                 Reveal.on('slidechanged', event => {
                     const currentSlideEl = document.getElementById('current-slide');
                     if (currentSlideEl) {
                         currentSlideEl.textContent = event.indexh + 1;
                     }
                     
                     // Initialize charts on any slide change
                     setTimeout(() => {
                         initializeChartsOnCurrentSlide();
                     }, 100);
                 });
                 
                 // Set initial slide counter
                 const currentSlideEl = document.getElementById('current-slide');
                 if (currentSlideEl) {
                     currentSlideEl.textContent = '1';
                 }
                 
                 // Initialize charts on initial load
                 setTimeout(() => {
                     initializeChartsOnCurrentSlide();
                 }, 500);
                 
             }).catch(error => {
                 console.error('Failed to initialize Reveal.js:', error);
             });
         });

         // Dynamic chart initialization function
         function initializeChartsOnCurrentSlide() {
             // Get current slide
             const currentSlide = document.querySelector('.reveal .slides section.present');
             if (!currentSlide) return;
             
             // Find all canvas elements in the current slide
             const canvasElements = currentSlide.querySelectorAll('canvas');
             
                           canvasElements.forEach((canvas, index) => {
                  // Skip if chart already initialized
                  if (canvas.chart) return;
                  
                  // Set canvas dimensions explicitly and aggressively
                  canvas.width = ${chartWidth};
                  canvas.height = ${chartHeight};
                  canvas.style.setProperty('width', '${chartWidth}px', 'important');
                  canvas.style.setProperty('height', '${chartHeight}px', 'important');
                  canvas.style.setProperty('max-width', 'none', 'important');
                  canvas.style.setProperty('max-height', 'none', 'important');
                  canvas.style.setProperty('min-width', '${chartWidth}px', 'important');
                  canvas.style.setProperty('min-height', '${chartHeight}px', 'important');
                  
                  // Create a default chart based on canvas ID or index
                  const chartId = canvas.id || \`chart-\${index}\`;
                  
                  // Determine chart type and data based on ID or create default
                  let chartConfig = getDefaultChartConfig(chartId, index);
                  
                  try {
                      canvas.chart = new Chart(canvas, chartConfig);
                      console.log(\`Initialized chart: \${chartId} with dimensions ${chartWidth}x${chartHeight}\`);
                  } catch (error) {
                      console.error(\`Failed to initialize chart \${chartId}:\`, error);
                  }
              });
         }
         
         // Get default chart configuration
         function getDefaultChartConfig(chartId, index) {
             // Default configurations for different chart types
             const configs = [
                 {
                     type: 'bar',
                     data: {
                         labels: ['Q1', 'Q2', 'Q3', 'Q4'],
                         datasets: [{
                             label: 'Performance',
                             data: [85, 92, 78, 96],
                             backgroundColor: [
                                 'rgba(255, 99, 132, 0.8)',
                                 'rgba(54, 162, 235, 0.8)',
                                 'rgba(255, 205, 86, 0.8)',
                                 'rgba(75, 192, 192, 0.8)'
                             ],
                             borderColor: [
                                 'rgba(255, 99, 132, 1)',
                                 'rgba(54, 162, 235, 1)',
                                 'rgba(255, 205, 86, 1)',
                                 'rgba(75, 192, 192, 1)'
                             ],
                             borderWidth: 2
                         }]
                     }
                 },
                 {
                     type: 'line',
                     data: {
                         labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                         datasets: [{
                             label: 'Growth',
                             data: [65, 75, 80, 85, 90, 95],
                             borderColor: 'rgba(75, 192, 192, 1)',
                             backgroundColor: 'rgba(75, 192, 192, 0.2)',
                             borderWidth: 3,
                             fill: true,
                             tension: 0.4
                         }]
                     }
                 },
                 {
                     type: 'doughnut',
                     data: {
                         labels: ['Category A', 'Category B', 'Category C'],
                         datasets: [{
                             data: [40, 35, 25],
                             backgroundColor: [
                                 'rgba(255, 99, 132, 0.8)',
                                 'rgba(54, 162, 235, 0.8)',
                                 'rgba(255, 205, 86, 0.8)'
                             ]
                         }]
                     }
                 }
             ];
             
             const config = configs[index % configs.length];
             
                           // Add common options
              config.options = {
                  responsive: false,
                  maintainAspectRatio: false,
                  animation: false,
                  devicePixelRatio: 1,
                  plugins: {
                      legend: {
                          labels: {
                              color: 'white',
                              font: {
                                  size: 16
                              }
                          }
                      }
                  },
                  layout: {
                      padding: {
                          top: 20,
                          bottom: 20,
                          left: 40,
                          right: 40
                      }
                  }
              };
             
             // Add scales for bar and line charts
             if (config.type === 'bar' || config.type === 'line') {
                 config.options.scales = {
                     y: {
                         beginAtZero: true,
                         ticks: {
                             color: 'white'
                         },
                         grid: {
                             color: 'rgba(255, 255, 255, 0.1)'
                         }
                     },
                     x: {
                         ticks: {
                             color: 'white'
                         },
                         grid: {
                             color: 'rgba(255, 255, 255, 0.1)'
                         }
                     }
                 };
             }
             
             return config;
         }

         // Fullscreen toggle
         function toggleFullscreen() {
             if (document.fullscreenElement) {
                 document.exitFullscreen();
             } else {
                 document.documentElement.requestFullscreen();
             }
         }

         // Keyboard shortcuts
         document.addEventListener('keydown', function(event) {
             if (event.key === 'f' || event.key === 'F') {
                 toggleFullscreen();
             }
         });
     </script>
</body>
</html>`;
    
    return revealHTML;
  }, [slides, contentScale, headingSize, textSize, listSize, chartWidth, chartHeight]);

  // Preload presentation in hidden iframe, then show when ready
  useEffect(() => {
    if (activeTab === 'preview') {
      setIsPreviewLoading(true);
      setIsPreviewReady(false);
      
      // Use hidden iframe to preload
      const hiddenIframe = hiddenPreviewRef.current;
      if (!hiddenIframe) return;
      
      try {
        const html = generateRevealHTML();
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        
        // Load in hidden iframe first
        hiddenIframe.src = url;
        
        hiddenIframe.onload = () => {
          // Wait a bit more for Reveal.js to fully initialize
          setTimeout(() => {
            // Now copy to visible iframe
            if (previewRef.current) {
              previewRef.current.src = url;
              previewRef.current.onload = () => {
                setIsPreviewLoading(false);
                setIsPreviewReady(true);
                URL.revokeObjectURL(url);
              };
            }
          }, 1500); // Give Reveal.js time to initialize
        };
        
        // Fallback timeout
        setTimeout(() => {
          setIsPreviewLoading(false);
          setIsPreviewReady(true);
          URL.revokeObjectURL(url);
        }, 5000);
        
      } catch (error) {
        console.error('Error rendering preview:', error);
        setIsPreviewLoading(false);
        setIsPreviewReady(false);
      }
    }
  }, [activeTab, slides, generateRevealHTML]);

  const handleExportHTML = useCallback(() => {
    const html = generateRevealHTML();
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reveal-presentation.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [generateRevealHTML]);

  if (slides.length === 0) {
    return (
      <div className="p-6 h-full flex flex-col items-center justify-center text-center">
        <div className="mb-6">
          <div 
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: '#6C6C6C' }}
          >
            <LayoutTemplate className="h-8 w-8 text-white" />
          </div>
        </div>
        
        <p className="mb-4 max-w-md" style={{ color: '#3C3C3C', fontSize: '16px' }}>
          No presentation slides yet. Use the overview to create your first presentation.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tab Header */}
      <div className="flex items-center border-b border-gray-200 bg-white px-4 py-2">
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              activeTab === 'preview' 
                ? 'bg-blue-100 text-blue-700 font-medium' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <Eye className="h-4 w-4 inline mr-1" />
            Slideshow
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              activeTab === 'list' 
                ? 'bg-blue-100 text-blue-700 font-medium' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <LayoutTemplate className="h-4 w-4 inline mr-1" />
            List View
          </button>
          <button
            onClick={() => setActiveTab('edit')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              activeTab === 'edit' 
                ? 'bg-blue-100 text-blue-700 font-medium' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <Edit3 className="h-4 w-4 inline mr-1" />
            Edit
          </button>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'preview' ? (
          <div className="h-full relative">
            {/* Hidden iframe for preloading */}
            <iframe
              ref={hiddenPreviewRef}
              className="absolute -left-[9999px] w-full h-full border-0"
              title="Hidden Preloader"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
              allow="fullscreen"
            />
            
            {/* Loading overlay */}
            {isPreviewLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
                <span className="text-lg">Loading presentation...</span>
              </div>
            )}
            
            {/* Main iframe - only visible when ready */}
            <iframe
              ref={previewRef}
              className={`w-full h-full border-0 transition-opacity duration-300 ${
                isPreviewReady ? 'opacity-100' : 'opacity-0'
              }`}
              title="Reveal.js Presentation Preview"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
              allow="fullscreen"
            />
          </div>
        ) : activeTab === 'list' ? (
          <div className="h-full overflow-auto p-4">
            <div className="max-w-3xl mx-auto space-y-4">
              {slides.map((slide, index) => (
                <div key={slide.id} className="border rounded-lg overflow-hidden bg-white shadow-sm">
                  {/* Slide Header */}
                  <div className="px-4 py-2 border-b bg-gray-50 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">{index + 1}</Badge>
                      <h3 className="font-medium text-gray-900">{slide.title}</h3>
                    </div>
                    <div 
                      className="w-4 h-4 rounded-full border"
                      style={{ backgroundColor: slide.backgroundColor }}
                      title={`Background: ${slide.backgroundColor}`}
                    />
                  </div>
                  
                  {/* Slide Content - Rendered as it would appear in presentation */}
                  <div 
                    className="p-6 min-h-[200px] flex items-center justify-center"
                    style={{ 
                      backgroundColor: slide.backgroundColor,
                      color: 'white',
                      fontSize: `calc(${textSize} * 0.8)` // Slightly smaller for list view
                    }}
                  >
                    <div 
                      className="w-full text-center"
                      style={{
                        transform: `scale(${contentScale * 0.6})`, // Smaller scale for list view
                        transformOrigin: 'center center'
                      }}
                      dangerouslySetInnerHTML={{ 
                        __html: slide.content.includes('<h') ? slide.content : `<h2 style="font-size: ${headingSize}; margin-bottom: 1rem;">${slide.title}</h2>${slide.content}`
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="h-full overflow-auto p-4">
            <div className="max-w-4xl mx-auto space-y-6">
              {slides.map((slide, index) => (
                <Card key={slide.id} className="relative">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">{index + 1}</Badge>
                      <h3 className="font-medium">{slide.title}</h3>
                      <Badge 
                        variant="secondary" 
                        style={{ backgroundColor: slide.backgroundColor, color: 'white' }}
                      >
                        {slide.transition}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingSlideId(editingSlideId === slide.id ? null : slide.id)}
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteSlide(slide.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {editingSlideId === slide.id ? (
                      <div className="space-y-4">
                        <Input
                          value={slide.title}
                          onChange={(e) => handleUpdateSlide(slide.id, { title: e.target.value })}
                          placeholder="Slide title"
                        />
                        <Textarea
                          value={slide.content}
                          onChange={(e) => handleUpdateSlide(slide.id, { content: e.target.value })}
                          placeholder="Slide content (HTML)"
                          rows={8}
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium">Background Color</label>
                            <Input
                              type="color"
                              value={slide.backgroundColor}
                              onChange={(e) => handleUpdateSlide(slide.id, { backgroundColor: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Transition</label>
                            <select
                              value={slide.transition}
                              onChange={(e) => handleUpdateSlide(slide.id, { transition: e.target.value as any })}
                              className="w-full p-2 border rounded"
                            >
                              <option value="slide">Slide</option>
                              <option value="fade">Fade</option>
                              <option value="zoom">Zoom</option>
                              <option value="convex">Convex</option>
                              <option value="concave">Concave</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div 
                          className="p-4 rounded border min-h-[100px] text-center flex items-center justify-center"
                          style={{ 
                            backgroundColor: slide.backgroundColor,
                            color: 'white',
                            fontSize: `calc(${textSize} * 0.9)` // Slightly smaller for edit view
                          }}
                        >
                          <div 
                            className="w-full"
                            style={{
                              transform: `scale(${contentScale * 0.8})`, // Smaller scale for edit view
                              transformOrigin: 'center center'
                            }}
                            dangerouslySetInnerHTML={{ 
                              __html: slide.content.includes('<h') ? slide.content : `<h2 style="font-size: ${headingSize}; margin-bottom: 1rem;">${slide.title}</h2>${slide.content}`
                            }}
                        />
                        </div>
                        <div className="text-xs text-gray-500 flex justify-between">
                          <span>Background: {slide.backgroundColor}</span>
                          <span>Transition: {slide.transition}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create slide modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-[#232323] bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
            <h3 className="text-lg font-semibold mb-4">Create New Slide</h3>
            <div className="space-y-4">
              <Input
                value={newSlideTitle}
                onChange={(e) => setNewSlideTitle(e.target.value)}
                placeholder="Slide title"
              />
              <Textarea
                value={newSlideContent}
                onChange={(e) => setNewSlideContent(e.target.value)}
                placeholder="Slide content (HTML)"
                rows={6}
              />
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <Button variant="outline" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateSlide} disabled={!newSlideTitle.trim()}>
                Create Slide
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RevealPresentation; 
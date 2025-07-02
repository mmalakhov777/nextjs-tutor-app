import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Download, Maximize, Minimize, Grid, List, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';

export interface ImageSlide {
  id: string;
  title: string;
  content: string;
  backgroundColor: string;
  imageUrl?: string;
  imageBase64?: string;
  isGenerating?: boolean;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ImagePresentationProps {
  slides: ImageSlide[];
  onGenerateSlideImage?: (slideId: string) => Promise<void>;
  onSendMessage?: (message: string, agent?: string) => void;
  // Size control props
  scale?: number;
}

const ImagePresentation: React.FC<ImagePresentationProps> = ({
  slides = [],
  onGenerateSlideImage,
  onSendMessage,
  scale = 1
}) => {
  const [viewMode, setViewMode] = useState<'slideshow' | 'grid' | 'list'>('slideshow');
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { addToast } = useToast();

  // Generate missing slide images on mount
  useEffect(() => {
    slides.forEach(slide => {
      if (!slide.imageUrl && !slide.imageBase64 && !slide.isGenerating && onGenerateSlideImage) {
        onGenerateSlideImage(slide.id);
      }
    });
  }, [slides, onGenerateSlideImage]);

  const handlePrevSlide = useCallback(() => {
    setCurrentSlideIndex(prev => Math.max(0, prev - 1));
  }, []);

  const handleNextSlide = useCallback(() => {
    setCurrentSlideIndex(prev => Math.min(slides.length - 1, prev + 1));
  }, [slides.length]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (viewMode === 'slideshow') {
      if (e.key === 'ArrowLeft') handlePrevSlide();
      if (e.key === 'ArrowRight') handleNextSlide();
      if (e.key === 'f' || e.key === 'F') toggleFullscreen();
    }
  }, [viewMode, handlePrevSlide, handleNextSlide]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  const downloadAllSlides = useCallback(() => {
    // Create a zip file or PDF with all slides
    addToast({
      type: 'info',
      message: 'Download feature coming soon!'
    });
  }, [addToast]);

  const getSlideImageSrc = (slide: ImageSlide) => {
    if (slide.imageUrl) {
      return slide.imageUrl;
    }
    if (slide.imageBase64) {
      return `data:image/jpeg;base64,${slide.imageBase64}`;
    }
    return null;
  };

  if (slides.length === 0) {
    return (
      <div className="p-6 h-full flex flex-col items-center justify-center text-center">
        <div className="mb-6">
          <div 
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: '#6C6C6C' }}
          >
            <Grid className="h-8 w-8 text-white" />
          </div>
        </div>
        
        <p className="mb-4 max-w-md" style={{ color: '#3C3C3C', fontSize: '16px' }}>
          No presentation slides yet. Create slides and they'll be automatically converted to images.
        </p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white border-b">
        <div className="flex items-center space-x-2">
          <Button
            variant={viewMode === 'slideshow' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('slideshow')}
          >
            <Maximize className="h-4 w-4 mr-1" />
            Slideshow
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="h-4 w-4 mr-1" />
            Grid
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4 mr-1" />
            List
          </Button>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={downloadAllSlides}
          >
            <Download className="h-4 w-4 mr-1" />
            Download
          </Button>
          {viewMode === 'slideshow' && (
            <Button
              variant="outline"
              size="sm"
              onClick={toggleFullscreen}
            >
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'slideshow' ? (
          <div className="h-full flex flex-col">
            {/* Slide Display */}
            <div className="flex-1 flex items-center justify-center p-8">
              <div 
                className="relative w-full max-w-6xl mx-auto"
                style={{ 
                  aspectRatio: '16/9',
                  transform: `scale(${scale})`,
                  transformOrigin: 'center'
                }}
              >
                {slides[currentSlideIndex] && (
                  <div className="w-full h-full relative rounded-lg overflow-hidden shadow-2xl">
                    {slides[currentSlideIndex].isGenerating ? (
                      <div 
                        className="w-full h-full flex items-center justify-center"
                        style={{ backgroundColor: slides[currentSlideIndex].backgroundColor }}
                      >
                        <div className="text-center text-white">
                          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
                          <p className="text-lg">Generating slide image...</p>
                        </div>
                      </div>
                    ) : slides[currentSlideIndex].error ? (
                      <div 
                        className="w-full h-full flex items-center justify-center p-8"
                        style={{ backgroundColor: slides[currentSlideIndex].backgroundColor }}
                      >
                        <div className="text-center text-white">
                          <p className="text-xl mb-2">Failed to generate image</p>
                          <p className="text-sm opacity-80">{slides[currentSlideIndex].error}</p>
                          {onGenerateSlideImage && (
                            <Button
                              variant="secondary"
                              size="sm"
                              className="mt-4"
                              onClick={() => onGenerateSlideImage(slides[currentSlideIndex].id)}
                            >
                              Retry
                            </Button>
                          )}
                        </div>
                      </div>
                    ) : getSlideImageSrc(slides[currentSlideIndex]) ? (
                      <img 
                        src={getSlideImageSrc(slides[currentSlideIndex])!}
                        alt={slides[currentSlideIndex].title}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div 
                        className="w-full h-full flex items-center justify-center p-8"
                        style={{ backgroundColor: slides[currentSlideIndex].backgroundColor }}
                      >
                        <div className="text-center text-white">
                          <h2 className="text-4xl font-bold mb-4">{slides[currentSlideIndex].title}</h2>
                          <div 
                            className="text-lg"
                            dangerouslySetInnerHTML={{ __html: slides[currentSlideIndex].content }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between p-4 bg-white border-t">
              <Button
                variant="outline"
                onClick={handlePrevSlide}
                disabled={currentSlideIndex === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  {currentSlideIndex + 1} / {slides.length}
                </span>
              </div>
              
              <Button
                variant="outline"
                onClick={handleNextSlide}
                disabled={currentSlideIndex === slides.length - 1}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="p-6 overflow-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {slides.map((slide, index) => (
                <Card 
                  key={slide.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => {
                    setCurrentSlideIndex(index);
                    setViewMode('slideshow');
                  }}
                >
                  <div className="relative" style={{ aspectRatio: '16/9' }}>
                    {slide.isGenerating ? (
                      <div 
                        className="w-full h-full flex items-center justify-center rounded-t-lg"
                        style={{ backgroundColor: slide.backgroundColor }}
                      >
                        <Loader2 className="h-8 w-8 animate-spin text-white" />
                      </div>
                    ) : getSlideImageSrc(slide) ? (
                      <img 
                        src={getSlideImageSrc(slide)!}
                        alt={slide.title}
                        className="w-full h-full object-cover rounded-t-lg"
                      />
                    ) : (
                      <div 
                        className="w-full h-full flex items-center justify-center p-4 rounded-t-lg"
                        style={{ backgroundColor: slide.backgroundColor }}
                      >
                        <div className="text-center text-white">
                          <h3 className="text-lg font-bold">{slide.title}</h3>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-3 flex items-center justify-between">
                    <Badge variant="outline">{index + 1}</Badge>
                    <span className="text-sm font-medium truncate ml-2">{slide.title}</span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-6 overflow-auto">
            <div className="space-y-4 max-w-4xl mx-auto">
              {slides.map((slide, index) => (
                <Card key={slide.id} className="overflow-hidden">
                  <div className="flex">
                    <div className="w-80 flex-shrink-0" style={{ aspectRatio: '16/9' }}>
                      {slide.isGenerating ? (
                        <div 
                          className="w-full h-full flex items-center justify-center"
                          style={{ backgroundColor: slide.backgroundColor }}
                        >
                          <Loader2 className="h-8 w-8 animate-spin text-white" />
                        </div>
                      ) : getSlideImageSrc(slide) ? (
                        <img 
                          src={getSlideImageSrc(slide)!}
                          alt={slide.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div 
                          className="w-full h-full flex items-center justify-center p-4"
                          style={{ backgroundColor: slide.backgroundColor }}
                        >
                          <div className="text-center text-white">
                            <h3 className="text-lg font-bold">{slide.title}</h3>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 p-6">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">{index + 1}</Badge>
                          <h3 className="text-lg font-semibold">{slide.title}</h3>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setCurrentSlideIndex(index);
                            setViewMode('slideshow');
                          }}
                        >
                          View
                        </Button>
                      </div>
                      <div 
                        className="text-sm text-gray-600 line-clamp-3"
                        dangerouslySetInnerHTML={{ __html: slide.content }}
                      />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImagePresentation; 
import { useState, useEffect } from 'react';
import { FiMessageSquare, FiUser, FiClock, FiExternalLink, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { getToolTypeLabel } from '@/utils/toolTypeLabels';

interface PublicSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  public_url: string | null;
  made_public_at: string | null;
  preview: string | null;
  message_count: number;
  tool_call_types: string[] | null;
}

interface PublicSessionsResponse {
  success: boolean;
  sessions: PublicSession[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  error?: string;
}

interface SlideImage {
  id: string;
  slide_id: string;
  slide_number: number;
  title: string;
  image_prompt: string;
  image_data: string;
  image_mime_type: string;
  background_color: string;
  style: string;
  transition: string;
  created_at: string;
  updated_at: string;
  content?: string;
}

interface SessionSlides {
  [sessionId: string]: {
    slides: SlideImage[];
    currentIndex: number;
    isLoading: boolean;
  };
}

interface PublicSessionsShowcaseProps {
  onSessionClick?: (sessionId: string) => void;
}

export function PublicSessionsShowcase({ onSessionClick }: PublicSessionsShowcaseProps) {
  const [sessions, setSessions] = useState<PublicSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionSlides, setSessionSlides] = useState<SessionSlides>({});

  useEffect(() => {
    fetchPublicSessions();
  }, []);

  // Fetch slides for sessions with presentation tools
  useEffect(() => {
    sessions.forEach(session => {
      const hasPresentationTools = session.tool_call_types?.some(tool => 
        tool === 'editSlide' || tool === 'generateSlideImage'
      );
      
      if (hasPresentationTools && !sessionSlides[session.id]) {
        fetchSessionSlides(session.id);
      }
      });
  }, [sessions]);

  const fetchPublicSessions = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/chat-sessions/public?limit=6');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: PublicSessionsResponse = await response.json();
      
      if (data.success) {
        setSessions(data.sessions);
        setError(null);
      } else {
        setError(data.error || 'Failed to load public sessions');
        setSessions([]);
      }
    } catch (err) {
      console.error('Error fetching public sessions:', err);
        setError('Failed to load public sessions. Please check your connection.');
        setSessions([]);
    } finally {
        setIsLoading(false);
    }
  };

  const fetchSessionSlides = async (sessionId: string) => {
    setSessionSlides(prev => ({
      ...prev,
      [sessionId]: {
        slides: [],
        currentIndex: 0,
        isLoading: true
      }
    }));

    try {
      const response = await fetch(`/api/chat-sessions/${sessionId}/slides`);
      const data = await response.json();
      
      if (data.success && data.slides.length > 0) {
        setSessionSlides(prev => ({
          ...prev,
          [sessionId]: {
            slides: data.slides,
            currentIndex: 0,
            isLoading: false
          }
        }));
      } else {
        setSessionSlides(prev => ({
          ...prev,
          [sessionId]: {
            slides: [],
            currentIndex: 0,
            isLoading: false
          }
        }));
      }
    } catch (err) {
      console.error('Error fetching slides:', err);
      setSessionSlides(prev => ({
        ...prev,
        [sessionId]: {
          slides: [],
          currentIndex: 0,
          isLoading: false
        }
      }));
    }
  };

  const handleSessionClick = (session: PublicSession, e?: React.MouseEvent) => {
    if (e && (e.target as HTMLElement).closest('.slide-nav-button')) {
      return;
    }
    
    if (onSessionClick) {
      onSessionClick(session.id);
    } else {
      const url = new URL(window.location.href);
      url.searchParams.set('conversation_id', session.id);
      url.searchParams.set('user_id', 'shared');
      window.location.href = url.toString();
    }
  };

  const navigateSlide = (sessionId: string, direction: 'prev' | 'next', e: React.MouseEvent) => {
    e.stopPropagation();
    
    const session = sessionSlides[sessionId];
    if (!session || session.slides.length === 0) return;
    
    const { slides, currentIndex } = session;
    let newIndex = currentIndex;
    
    if (direction === 'prev') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : slides.length - 1;
    } else {
      newIndex = currentIndex < slides.length - 1 ? currentIndex + 1 : 0;
    }
    
    setSessionSlides(prev => ({
      ...prev,
      [sessionId]: {
        ...prev[sessionId],
        currentIndex: newIndex
      }
    }));
  };

  const renderSessionCover = (session: PublicSession) => {
    const hasPresentationTools = session.tool_call_types?.some(tool => 
      tool === 'editSlide' || tool === 'generateSlideImage'
    );
    const slides = sessionSlides[session.id];
    const hasSlides = slides && slides.slides.length > 0;
    const currentSlide = hasSlides ? slides.slides[slides.currentIndex] : null;

    if (hasPresentationTools && hasSlides && currentSlide) {
      // Presentation slides
      return (
        <div className="relative bg-gray-900 h-50">
          {currentSlide.image_data ? (
            <img
              src={currentSlide.image_data}
              alt={currentSlide.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div 
              className="w-full h-full p-4 overflow-hidden flex items-center justify-center"
              style={{ backgroundColor: currentSlide.background_color || '#2c3e50' }}
            >
              <div 
                className="max-w-full text-center scale-75"
                dangerouslySetInnerHTML={{ 
                  __html: currentSlide.content || `<h2>${currentSlide.title}</h2>` 
                }}
                style={{ color: 'white', fontSize: '0.875rem' }}
              />
            </div>
          )}
          
          {/* Navigation buttons */}
          {slides.slides.length > 1 && (
            <>
              <button
                onClick={(e) => navigateSlide(session.id, 'prev', e)}
                className="slide-nav-button absolute left-2 top-1/2 -translate-y-1/2 p-1 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full transition-all"
              >
                <FiChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={(e) => navigateSlide(session.id, 'next', e)}
                className="slide-nav-button absolute right-2 top-1/2 -translate-y-1/2 p-1 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full transition-all"
              >
                <FiChevronRight className="h-4 w-4" />
              </button>
            </>
          )}
          
          {/* Slide counter */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black bg-opacity-50 text-white px-2 py-0.5 rounded-full text-xs">
            {slides.currentIndex + 1} / {slides.slides.length}
          </div>
          
          {renderTitleOverlay(session)}
          {renderToolTags(session, true)}
        </div>
      );
    }

    if (hasPresentationTools && slides?.isLoading) {
      // Loading state for presentations
      return (
        <div className="bg-gray-200 animate-pulse h-50">
          <div className="flex items-center justify-center h-full text-gray-500">
            Loading slides...
          </div>
        </div>
      );
    }

    // Cover for non-presentation sessions
    const hasWebResearchTools = session.tool_call_types && session.tool_call_types.length > 0;
    
    if (hasWebResearchTools) {
      // Research cover
      return (
        <div className="relative bg-gradient-to-br from-green-500 to-blue-600 h-50">
          <div className="absolute inset-0 bg-black bg-opacity-20"></div>
          <div className="relative h-full flex items-center justify-center">
            <FiMessageSquare className="h-12 w-12 text-white opacity-50" />
          </div>
          {renderTitleOverlay(session)}
          {renderToolTags(session, false)}
        </div>
      );
    }

    // Default gradient cover
    return (
      <div className="relative bg-gradient-to-br from-blue-500 to-purple-600 h-50">
        <div className="absolute inset-0 bg-black bg-opacity-20"></div>
        <div className="relative h-full flex items-center justify-center">
          <FiMessageSquare className="h-12 w-12 text-white opacity-50" />
        </div>
        {renderTitleOverlay(session)}
        {renderToolTags(session, false)}
      </div>
    );
  };

  const renderTitleOverlay = (session: PublicSession) => (
    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-6 pt-24 min-h-[160px] flex items-end">
      <h4 
        className="font-normal text-white text-sm break-words leading-relaxed w-full whitespace-normal overflow-visible" 
        style={{ 
          display: 'block', 
          WebkitLineClamp: 'unset', 
          WebkitBoxOrient: 'unset',
          overflow: 'visible',
          textOverflow: 'unset',
          whiteSpace: 'normal'
        }}
      >
        {session.title}
      </h4>
    </div>
  );

  const renderToolTags = (session: PublicSession, isPresentation: boolean) => {
    if (!session.tool_call_types || session.tool_call_types.length === 0) return null;

    let toolsToShow = session.tool_call_types;
    
    // Filter out presentation tools if this is a presentation
    if (isPresentation) {
      toolsToShow = session.tool_call_types.filter(tool => 
        tool !== 'editSlide' && tool !== 'generateSlideImage'
      );
    }

    const uniqueLabels = Array.from(new Set(
      toolsToShow.map(tool => getToolTypeLabel(tool))
    ));

    if (uniqueLabels.length === 0) return null;

    const tagClass = isPresentation 
      ? "bg-blue-500 bg-opacity-80 text-white"
      : "bg-white bg-opacity-90 text-gray-800";

    return (
      <div className="absolute top-2 left-2 flex flex-wrap gap-1">
        {uniqueLabels.slice(0, 2).map((label, index) => (
          <span
            key={index}
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium backdrop-blur-sm ${tagClass}`}
          >
            {label}
          </span>
        ))}
        {uniqueLabels.length > 2 && (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-800 bg-opacity-80 text-white backdrop-blur-sm">
            +{uniqueLabels.length - 2}
          </span>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, index) => (
            <div
              key={index}
              className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse"
            >
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded mb-3 w-3/4"></div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-5/6"></div>
              </div>
              <div className="flex justify-between items-center mt-4">
                <div className="h-3 bg-gray-200 rounded w-20"></div>
                <div className="h-3 bg-gray-200 rounded w-16"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || sessions.length === 0) {
    return (
      <div className="w-full">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">
          Explore Public Conversations
        </h3>
        <div className="text-center py-8">
          <FiMessageSquare className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-600">
            {error || 'No public conversations available yet.'}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Public conversations will appear here when users share them.
          </p>
          {error && (
            <button
              onClick={() => fetchPublicSessions()}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h3 className="text-lg font-light mb-4 text-gray-800 text-center">
        Showcases of what can be created in myStylus Agent
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sessions.map((session) => (
            <div
              key={session.id}
              onClick={(e) => handleSessionClick(session, e)}
              className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-all duration-200 cursor-pointer hover:border-gray-300 group"
            >
            {renderSessionCover(session)}
                            </div>
        ))}
      </div>
      
      {sessions.length > 0 && (
        <div className="text-center mt-6">
          <p className="text-sm text-gray-500">
            Showing {sessions.length} public conversations
          </p>
        </div>
      )}
    </div>
  );
} 
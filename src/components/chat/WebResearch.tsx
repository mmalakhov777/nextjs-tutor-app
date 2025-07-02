import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { 
  ChevronDown, 
  ChevronUp, 
  ExternalLink, 
  Globe,
  Link2,
  FileText,
  Calendar,
  Trash2
} from 'lucide-react';

export interface WebResearchItem {
  id: string;
  url: string;
  title?: string;
  description?: string;
  screenshot?: string; // Base64 or URL to screenshot
  favicon?: string;
  domain?: string;
  addedAt: Date;
  metadata?: {
    author?: string;
    publishedDate?: string;
    readTime?: string;
  };
}

interface WebResearchProps {
  userId?: string;
  currentConversationId?: string;
  webResearchItems: WebResearchItem[];
  onAddUrl?: (url: string) => void;
  onDeleteItem?: (itemId: string) => void;
  onSendMessage?: (message: string, agent?: string) => void;
}

const WebResearch: React.FC<WebResearchProps> = ({ 
  userId, 
  currentConversationId,
  webResearchItems,
  onAddUrl,
  onDeleteItem,
  onSendMessage
}) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [urlInput, setUrlInput] = useState('');
  const [isAddingUrl, setIsAddingUrl] = useState(false);

  const toggleExpanded = useCallback((itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  }, []);

  const handleAddUrl = useCallback(async () => {
    if (!urlInput.trim() || !onAddUrl) return;
    
    setIsAddingUrl(true);
    try {
      await onAddUrl(urlInput.trim());
      setUrlInput('');
    } finally {
      setIsAddingUrl(false);
    }
  }, [urlInput, onAddUrl]);

  const handleDeleteItem = useCallback((itemId: string) => {
    if (onDeleteItem) {
      onDeleteItem(itemId);
    }
  }, [onDeleteItem]);

  const getDomainFromUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return url;
    }
  };

  // Empty state
  if (webResearchItems.length === 0) {
    return (
      <div className="p-6 h-full flex flex-col items-center justify-center text-center">
        <Globe 
          className="mb-6"
          style={{
            width: '56px',
            height: '56px',
            color: '#3C3C3C'
          }}
        />
        
        <p className="mb-8 max-w-md" style={{ color: '#3C3C3C', fontSize: '16px' }}>
          Save and organize web pages from your research. Add URLs to capture screenshots and quick access.
        </p>
        
        <div className="w-full max-w-md">
          <div className="flex gap-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddUrl()}
              placeholder="Enter a URL to save..."
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{
                background: '#FFF',
                color: '#232323'
              }}
            />
            <Button
              onClick={handleAddUrl}
              disabled={!urlInput.trim() || isAddingUrl}
              style={{
                padding: '8px 24px',
                borderRadius: '8px',
                background: urlInput.trim() && !isAddingUrl ? '#232323' : '#E8E8E5',
                color: urlInput.trim() && !isAddingUrl ? '#FFF' : '#6C6C6C',
                border: 'none',
                cursor: urlInput.trim() && !isAddingUrl ? 'pointer' : 'not-allowed'
              }}
            >
              {isAddingUrl ? 'Adding...' : 'Add'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Add URL input at the top */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddUrl()}
            placeholder="Add another URL..."
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{
              background: '#FFF',
              color: '#232323'
            }}
          />
          <Button
            onClick={handleAddUrl}
            disabled={!urlInput.trim() || isAddingUrl}
            size="sm"
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              background: urlInput.trim() && !isAddingUrl ? '#232323' : '#E8E8E5',
              color: urlInput.trim() && !isAddingUrl ? '#FFF' : '#6C6C6C',
              border: 'none',
              fontSize: '14px'
            }}
          >
            {isAddingUrl ? 'Adding...' : 'Add'}
          </Button>
        </div>
      </div>

      {/* List of web research items */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-3">
          {webResearchItems.map((item) => {
            const isExpanded = expandedItems.has(item.id);
            const domain = item.domain || getDomainFromUrl(item.url);
            
            return (
              <div 
                key={item.id}
                className="transition-all duration-200"
                style={{
                  borderRadius: '16px',
                  border: '1px solid #E8E8E5',
                  background: '#FFF',
                  overflow: 'hidden'
                }}
              >
                {/* Header - Always visible */}
                <div 
                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleExpanded(item.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {/* Favicon or default icon */}
                      <div className="flex-shrink-0 mt-0.5">
                        {item.favicon ? (
                          <>
                            <img 
                              src={item.favicon} 
                              alt={domain}
                              className="w-5 h-5 rounded"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                            <Globe className="w-5 h-5 text-gray-400 hidden" />
                          </>
                        ) : (
                          <Globe className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      
                      {/* URL and title */}
                      <div className="flex-1 min-w-0">
                        {item.title && (
                          <h3 className="font-medium text-sm mb-1 truncate flex items-center" style={{ color: '#232323' }}>
                            {item.title}
                            {item.title === 'Loading...' && (
                              <div className="ml-2 w-3 h-3 border border-gray-300 border-t-transparent rounded-full animate-spin"></div>
                            )}
                          </h3>
                        )}
                        <p className="text-sm truncate" style={{ color: '#6C6C6C' }}>
                          {domain}
                        </p>
                        {item.metadata?.publishedDate && (
                          <div className="flex items-center gap-2 mt-1">
                            <Calendar className="w-3 h-3 text-gray-400" />
                            <span className="text-xs" style={{ color: '#6C6C6C' }}>
                              {new Date(item.metadata.publishedDate).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(item.url, '_blank');
                        }}
                        className="hover:bg-gray-100"
                        style={{ color: '#6C6C6C' }}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteItem(item.id);
                        }}
                        className="hover:bg-red-50"
                        style={{ color: '#6C6C6C' }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.color = '#EF4444';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.color = '#6C6C6C';
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      
                      <div className="ml-2">
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Expanded content - Screenshot and details */}
                {isExpanded && (
                  <div className="border-t border-gray-100">
                    {item.description && (
                      <div className="p-4 border-b border-gray-100">
                        <p className="text-sm" style={{ color: '#3C3C3C' }}>
                          {item.description}
                        </p>
                      </div>
                    )}
                    
                    {item.screenshot && (
                      <div className="p-4 bg-gray-50">
                        <div className="rounded-lg overflow-hidden border border-gray-200">
                          <img 
                            src={item.screenshot}
                            alt={`Screenshot of ${item.title || item.url}`}
                            className="w-full h-auto"
                            style={{ maxHeight: '400px', objectFit: 'cover' }}
                            onError={(e) => {
                              // Hide the image if it fails to load
                              e.currentTarget.style.display = 'none';
                              // Show a placeholder message
                              const placeholder = e.currentTarget.nextElementSibling as HTMLElement;
                              if (placeholder) {
                                placeholder.style.display = 'block';
                              }
                            }}
                          />
                          <div 
                            className="p-4 text-center text-gray-500 text-sm"
                            style={{ display: 'none' }}
                          >
                            Screenshot not available
                          </div>
                        </div>
                        
                        {/* Quick actions */}
                        <div className="mt-3 flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onSendMessage?.(`Summarize this webpage: ${item.url}`, 'Web Researcher')}
                            style={{
                              fontSize: '12px',
                              padding: '6px 12px',
                              borderColor: '#E8E8E5',
                              color: '#232323'
                            }}
                          >
                            Summarize
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onSendMessage?.(`Extract key points from: ${item.url}`, 'Web Researcher')}
                            style={{
                              fontSize: '12px',
                              padding: '6px 12px',
                              borderColor: '#E8E8E5',
                              color: '#232323'
                            }}
                          >
                            Extract Key Points
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onSendMessage?.(`Please use multiple search queries to find the contacts of this website owner: ${item.url}`, 'Web Researcher')}
                            style={{
                              fontSize: '12px',
                              padding: '6px 12px',
                              borderColor: '#E8E8E5',
                              color: '#232323'
                            }}
                          >
                            Find Contacts
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {/* Show placeholder if no screenshot */}
                    {!item.screenshot && (
                      <div className="p-4 bg-gray-50">
                        <div className="rounded-lg border border-gray-200 p-8 text-center">
                          <Globe className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                          <p className="text-sm text-gray-500">
                            {item.title === 'Loading...' ? 'Loading screenshot...' : 'Screenshot not available'}
                          </p>
                        </div>
                        
                        {/* Quick actions still available */}
                        <div className="mt-3 flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onSendMessage?.(`Summarize this webpage: ${item.url}`, 'Web Researcher')}
                            style={{
                              fontSize: '12px',
                              padding: '6px 12px',
                              borderColor: '#E8E8E5',
                              color: '#232323'
                            }}
                          >
                            Summarize
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onSendMessage?.(`Extract key points from: ${item.url}`, 'Web Researcher')}
                            style={{
                              fontSize: '12px',
                              padding: '6px 12px',
                              borderColor: '#E8E8E5',
                              color: '#232323'
                            }}
                          >
                            Extract Key Points
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onSendMessage?.(`Please use multiple search queries to find the contacts of this website owner: ${item.url}`, 'Web Researcher')}
                            style={{
                              fontSize: '12px',
                              padding: '6px 12px',
                              borderColor: '#E8E8E5',
                              color: '#232323'
                            }}
                          >
                            Find Contacts
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {/* Full URL at bottom */}
                    <div className="px-4 py-2 bg-gray-50">
                      <p className="text-xs font-mono truncate" style={{ color: '#6C6C6C' }}>
                        {item.url}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default WebResearch; 
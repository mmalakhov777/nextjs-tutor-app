"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, Copy, Check } from 'lucide-react';
import { AUTO_FLOW_EXAMPLES, type AutoFlowExample } from '@/data/autoflows';

interface AutoFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate?: (template: AutoFlowExample) => void;
  onSelectExample: (prompt: string) => void;
  onStartCustomTask: () => void;
  customTaskOnly?: boolean;
}

// Helper function to generate simple tips for each template
const getTemplateTips = (template: AutoFlowExample) => {
  const tips: Record<string, string[]> = {
    'market-research': [
      'Research [industry] market for [target audience]',
      'Include competitor analysis and market size',
      'Focus on [geographic scope] - local, national, or global',
      'Analyze pricing strategies and trends',
      'Add SWOT analysis and growth opportunities'
    ],
    'seo-article': [
      'Create SEO article about [your topic]',
      'Focus on [target audience]', 
      'Include keywords: [keyword1, keyword2, keyword3]',
      'Make it [word count] with [tone] tone',
      'Target [search intent] search intent'
    ],
    'learning-curriculum': [
      'Design learning curriculum for [subject]',
      'From [current level] to [target level]',
      'Duration: [timeframe]',
      'Include [learning methods]',
      'Focus on [specific goals]'
    ],
    'content-strategy': [
      'Develop content strategy for [business type]',
      'Target audience: [audience]',
      'Channels: [platforms]',
      'Content types: [formats]',
      'Timeline: [duration]'
    ],
    'business-plan': [
      'Create business plan for [business idea]',
      'Industry: [sector]',
      'Target market: [audience]',
      'Business model: [model type]',
      'Funding goal: [amount]'
    ],
    'research-project': [
      'Design research project on [topic]',
      'Research question: [question]',
      'Methodology: [approach]',
      'Target population: [group]',
      'Data collection: [methods]'
    ]
  };
  
  return tips[template.id] || [
    'Describe your task clearly',
    'Include specific requirements',
    'Mention target audience',
    'Set clear objectives',
    'Specify timeline if needed'
  ];
};

export function AutoFlowModal({
  isOpen,
  onClose,
  onSelectTemplate,
  onSelectExample,
  onStartCustomTask,
  customTaskOnly = false
}: AutoFlowModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<AutoFlowExample | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile screen size
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  if (!isOpen) return null;
  
  // Only render portal on client side
  if (typeof window === 'undefined') return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleTemplateSelect = (example: AutoFlowExample) => {
    if (onSelectTemplate) {
      // Use the new callback to close modal and show tips below ChatInput
      onSelectTemplate(example);
    } else {
      // Fallback to old behavior for backwards compatibility
    setSelectedTemplate(example);
    }
  };

  const handleBackToSelection = () => {
    setSelectedTemplate(null);
  };

  const handleUseExample = (prompt: string) => {
    onSelectExample(prompt);
    onClose();
    setSelectedTemplate(null);
  };

  const handleCopyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(text);
      setTimeout(() => setCopiedText(null), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999]"
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? '0' : '20px'
      }}
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-white overflow-hidden md:rounded-2xl md:shadow-2xl"
        style={{
          width: isMobile ? '100vw' : 'min(90vw, 900px)',
          height: isMobile ? '100vh' : 'min(85vh, 700px)',
          border: '1px solid rgba(35, 35, 35, 0.1)',
          margin: '0 auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="flex-shrink-0 flex items-center justify-between p-6 border-b border-gray-200 bg-white">
            {selectedTemplate && !isMobile && (
              <button
                onClick={handleBackToSelection}
                className="flex items-center justify-center w-10 h-10 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
              
              <div className="flex-1 text-left px-4">
              <h2 className="font-semibold text-gray-900" style={{ fontSize: '32px' }}>
                {selectedTemplate ? `${selectedTemplate.title} Tips` : customTaskOnly ? 'Custom Task' : 'Tasks Templates'}
                </h2>
              {selectedTemplate && (
                <p className="text-sm text-gray-600 mt-1">
                  Copy and customize these examples
                </p>
              )}
              </div>
              
              <button
                onClick={onClose}
                className="flex items-center justify-center w-10 h-10 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors"
              >
              <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          
          {/* Content */}
          <div className="flex flex-1 overflow-hidden min-h-0">
            {/* Template Selection */}
            {!selectedTemplate && (
              <div className="w-full p-6 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {!customTaskOnly && AUTO_FLOW_EXAMPLES.map((example) => (
                  <div 
                    key={example.id}
                      className="p-6 border rounded-xl hover:shadow-lg transition-all duration-200 cursor-pointer group bg-white border-gray-200 hover:border-gray-300"
                    onClick={() => handleTemplateSelect(example)}
                  >
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-12 h-12 ${example.color.bg} rounded-xl flex items-center justify-center`}>
                          <span className={`${example.color.icon} text-lg`}>{example.icon}</span>
                        </div>
                        <h3 className="font-semibold text-lg text-gray-900">{example.title}</h3>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {example.description}
                    </p>
                  </div>
                ))}

                  {/* Custom Task Option */}
                <div 
                    className="p-6 rounded-xl cursor-pointer transition-all duration-200 hover:shadow-lg border border-gray-200 hover:border-gray-300"
                  style={{ 
                      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)'
                  }}
                  onClick={onStartCustomTask}
                >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-blue-100 rounded-xl flex items-center justify-center">
                        <Sparkles className="w-6 h-6 text-purple-600" />
                      </div>
                      <h3 className="font-semibold text-lg text-gray-900">Custom Task</h3>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">
                    {customTaskOnly 
                      ? "Since you're in an ongoing conversation, you can describe a custom task that builds on your current discussion. Our AI will help break it down into manageable steps."
                      : "Describe your own complex, multi-step task and our AI will break it down into manageable steps"
                    }
                  </p>
                </div>
              </div>
            </div>
            )}
            
            {/* Template Tips */}
            {selectedTemplate && (
              <div className="w-full flex flex-col">
                <div className="flex-1 p-6 overflow-y-auto">


                  {/* Tips */}
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Tips for {selectedTemplate.title}</h3>
                    <div className="space-y-3">
                      {getTemplateTips(selectedTemplate).map((tip, index) => (
                        <div key={index} className="flex items-start gap-3">
                          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-xs font-medium text-blue-600">{index + 1}</span>
                                </div>
                          <div className="flex-1 flex items-start justify-between gap-3">
                            <p className="text-sm text-gray-700">{tip}</p>
                            <button
                              onClick={() => handleCopyText(tip)}
                              className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                              title="Copy tip"
                            >
                              {copiedText === tip ? (
                                <Check className="w-3 h-3 text-green-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                            </div>
                        </div>
                      ))}
                      </div>
                  </div>
                  

                  </div>

                </div>
              )}
            </div>
        </div>
      </div>
    </div>,
    document.body
  );
} 
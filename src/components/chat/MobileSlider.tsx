import { AlertCircle } from 'lucide-react';
import React from 'react';

interface MobileSliderProps {
  mode: 'chat' | 'research';
  onModeChange: (mode: 'chat' | 'research') => void;
  isResearchDisabled: boolean;
  showResearchTooltip: boolean;
  setShowResearchTooltip: (show: boolean) => void;
}

export function MobileSlider({
  mode,
  onModeChange,
  isResearchDisabled,
  showResearchTooltip,
  setShowResearchTooltip,
}: MobileSliderProps) {
  return (
    <div className="w-full flex items-center justify-center my-2">
      <div className="relative flex h-9 rounded-lg bg-[#F8F8F6] border border-[#E8E8E5] overflow-hidden select-none" style={{ width: 130 }}>
        {/* Sliding background */}
        <div
          className="absolute top-0 left-0 h-full transition-all duration-300 z-0"
          style={{
            width: 65,
            transform: mode === 'chat' ? 'translateX(0)' : 'translateX(65px)',
            background: '#F2F2ED',
            borderRadius: '10px',
            border: '1px solid #E8E8E5',
          }}
        />
        {/* Chat button */}
        <button
          className={`h-full z-10 text-sm font-medium transition-colors duration-200 relative ${mode === 'chat' ? 'text-[#232323] font-semibold' : 'text-gray-500'} flex items-center justify-center`}
          style={{ width: 65 }}
          onClick={() => onModeChange('chat')}
          aria-pressed={mode === 'chat'}
          type="button"
        >
          <span className="flex items-center">
            Chat
            {isResearchDisabled && (
              <span
                className="inline-block align-middle ml-1 cursor-pointer"
                onClick={e => {
                  e.stopPropagation();
                  setShowResearchTooltip(!showResearchTooltip);
                }}
              >
                <AlertCircle className="inline-block relative" style={{ width: 14, height: 14, top: -2 }} />
                {showResearchTooltip && (
                  <div className="absolute z-50 left-1/2 -translate-x-1/2 bottom-10 min-w-[210px]">
                    <div className="relative">
                      <div className="w-2 h-2 bg-[#232323] rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1 z-10" />
                      <div className="bg-[#232323] text-white text-xs rounded-lg shadow-lg p-2 z-20 relative">
                        <div className="font-semibold mb-1">Web Research Disabled</div>
                        <div>Web Research is disabled when referencing files or agents in your message. Remove @ or # to enable.</div>
                      </div>
                    </div>
                  </div>
                )}
              </span>
            )}
          </span>
        </button>
        {/* Web button */}
        <button
          className={`h-full z-10 text-sm font-medium transition-colors duration-200 relative ${mode === 'research' ? 'text-[#232323] font-semibold' : 'text-gray-500'} flex items-center justify-center`}
          style={{ width: 65 }}
          onClick={() => !isResearchDisabled && onModeChange('research')}
          aria-pressed={mode === 'research'}
          aria-disabled={isResearchDisabled}
          type="button"
          disabled={isResearchDisabled}
        >
          Web
        </button>
      </div>
    </div>
  );
} 
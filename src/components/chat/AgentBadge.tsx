import React, { useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { getAgentDescription } from '@/data/agentDescriptions';
import { 
  getAgentIcon, 
  getAgentCircleColor, 
  getAgentTextColor, 
  getDisplayAgentName 
} from '@/lib/agents';

interface AgentBadgeProps {
  agentName: string;
  isStreaming?: boolean;
}

const AgentBadge: React.FC<AgentBadgeProps> = ({ agentName, isStreaming = false }) => {
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  
  const displayName = getDisplayAgentName(agentName);

  return (
    <div className="relative" ref={tooltipRef}>
      <div
        className={`flex items-center justify-center w-6 h-6 rounded-full ${getAgentCircleColor(agentName)} ${getAgentTextColor(agentName)} cursor-pointer`}
        onClick={() => setIsTooltipVisible(!isTooltipVisible)}
      >
        {React.createElement(getAgentIcon(displayName), { className: "h-4 w-4" })}
        {isStreaming && (
          <Loader2 className="h-3 w-3 animate-spin absolute top-0 right-0 -mt-1 -mr-1" />
        )}
      </div>

      {/* Agent Tooltip */}
      {isTooltipVisible && (
        <div className="absolute bottom-full right-[-5px] mb-2 transition-opacity duration-200" style={{ zIndex: 9999 }}>
          <div className="relative">
            {/* Arrow */}
            <div className="w-2 h-2 bg-[#232323] transform rotate-45 absolute -bottom-1 right-3" style={{ zIndex: 10000 }}></div>

            {/* Tooltip content */}
            <div
              style={{
                display: "flex",
                width: "210px",
                padding: "4px",
                flexDirection: "column",
                alignItems: "flex-start",
                borderRadius: "12px",
                background: "var(--Monochrome-Black, #232323)",
                boxShadow: "0px 0px 20px 0px rgba(203, 203, 203, 0.20)",
                position: "relative"
              }}
            >
              <div
                className="font-semibold p-2 w-full"
                style={{
                  color: "var(--Monochrome-White, #FFF)",
                  fontSize: "12px",
                  fontStyle: "normal",
                  fontWeight: "400",
                  lineHeight: "16px"
                }}
              >
                {displayName}
              </div>
              <div
                className="p-2 pt-0 w-full"
                style={{
                  color: "var(--Monochrome-White, #FFF)",
                  opacity: 0.7,
                  fontSize: "12px",
                  fontStyle: "normal",
                  fontWeight: "400",
                  lineHeight: "16px"
                }}
              >
                {getAgentDescription(displayName)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentBadge; 
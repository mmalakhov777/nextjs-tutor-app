import React, { useRef, useState } from 'react';
import { Loader2, UserCircle } from 'lucide-react';
import { GrokXLogo } from '@/components/icons/GrokXLogo';
import { TriageAgentLogo } from '@/components/icons/TriageAgentLogo';
import { ClaudeCreativeLogo } from '@/components/icons/ClaudeCreativeLogo';
import { DeepSeekLogo } from '@/components/icons/DeepSeekLogo';
import { MistralLogo } from '@/components/icons/MistralLogo';
import { PerplexityLogo } from '@/components/icons/PerplexityLogo';
import { getAgentDescription } from '@/data/agentDescriptions';

interface AgentBadgeProps {
  agentName: string;
  isStreaming?: boolean;
}

const AgentBadge: React.FC<AgentBadgeProps> = ({ agentName, isStreaming = false }) => {
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  
  // Helper function to get display name for agents
  const getDisplayAgentName = (agentName: string) => {
    // Always display "General Assistant" instead of "Triage Agent"
    if (agentName === "Triage Agent") {
      return "General Assistant";
    }
    return agentName;
  };

  // Helper function to get agent icon
  const getAgentIcon = (agentName: string) => {
    switch(agentName) {
      case "Triage Agent":
      case "General Assistant":
      case "Deep Thinker":
        return <TriageAgentLogo className="h-4 w-4" />;
      case "Grok X":
        return <GrokXLogo className="h-4 w-4" />;
      case "Mistral Europe":
        return <MistralLogo className="h-4 w-4" />;
      case "Claude Creative":
        return <ClaudeCreativeLogo className="h-4 w-4" />;
      case "Deep Seek":
        return <DeepSeekLogo className="h-4 w-4" />;
      case "Perplexity":
        return <PerplexityLogo className="h-4 w-4" />;
      default:
        return <UserCircle className="h-4 w-4" />;
    }
  };

  // Helper function to get agent background color
  const getAgentCircleColor = (agentName: string) => {
    switch(agentName) {
      case "Triage Agent":
      case "General Assistant":
        return "bg-emerald-500"; // Green color for both Triage and General Assistant
      case "Claude Creative":
        return "rounded-[1000px] border border-[#E8E8E5] bg-[#D77655]"; // Specific Claude Creative styling
      case "Deep Seek":
        return "rounded-[1000px] border border-[#E8E8E5] bg-[#4D6BFE]"; // Specific Deep Seek styling
      case "Mistral Europe":
        return "rounded-[1000px] border border-[#E8E8E5] bg-[#FA5310]"; // Specific Mistral Europe styling
      case "Perplexity":
        return "rounded-[1000px] border border-[#E8E8E5] bg-[#1F1F1F]"; // Specific Perplexity styling
      case "Deep Thinker":
        return "rounded-[1000px] border border-[#E8E8E5] bg-black"; // Deep Thinker styling with pure black
      case "Grok X":
        return "bg-black"; // Black color for the third icon
      default:
        return "bg-white border border-slate-200";
    }
  };

  // Get icon color based on agent background color
  const getIconTextColor = (agentName: string) => {
    switch(agentName) {
      case "Triage Agent":
      case "General Assistant":
      case "Claude Creative":
      case "Grok X":
      case "Deep Seek":
      case "Mistral Europe":
      case "Perplexity":
      case "Deep Thinker":
        return "text-white"; // White text for dark backgrounds
      default:
        return "text-slate-800"; // Dark text for light backgrounds
    }
  };

  const displayName = getDisplayAgentName(agentName);

  return (
    <div className="relative" ref={tooltipRef}>
      <div
        className={`flex items-center justify-center w-6 h-6 rounded-full ${getAgentCircleColor(agentName)} ${getIconTextColor(agentName)} cursor-pointer`}
        onClick={() => setIsTooltipVisible(!isTooltipVisible)}
      >
        {getAgentIcon(displayName)}
        {isStreaming && (
          <Loader2 className="h-3 w-3 animate-spin absolute top-0 right-0 -mt-1 -mr-1" />
        )}
      </div>

      {/* Agent Tooltip */}
      {isTooltipVisible && (
        <div className="absolute bottom-full left-0 mb-2 transition-opacity duration-200" style={{ zIndex: 5 }}>
          <div className="relative">
            {/* Arrow */}
            <div className="w-2 h-2 bg-[#232323] transform rotate-45 absolute -bottom-1 left-3" style={{ zIndex: 6 }}></div>

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
import React from 'react';
import { cn } from "@/lib/utils";
import { Loader2, Check, ChevronDown } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

interface CitationControlsProps {
  citationStyle: string;
  setCitationStyle: (style: string) => void;
  isLoadingEnhancedText: boolean;
  hasCitationsIncluded: boolean;
  handleCopyCitation: (style: string) => void;
}

const CitationControls: React.FC<CitationControlsProps> = ({
  citationStyle,
  setCitationStyle,
  isLoadingEnhancedText,
  hasCitationsIncluded,
  handleCopyCitation
}) => {
  return (
    <div className="inline-flex w-full">
      <Button 
        onClick={isLoadingEnhancedText ? undefined : () => {
          handleCopyCitation(citationStyle);
        }}
        variant="ghost"
        size="sm"
        className={cn(
          "text-slate-500 rounded-none cursor-pointer transition-colors border-none outline-none hover:bg-transparent",
          isLoadingEnhancedText && "opacity-50 cursor-not-allowed"
        )}
        style={{
          display: 'flex',
          padding: '8px',
          paddingRight: '16px',
          alignItems: 'center',
          gap: '4px',
          height: '36px',
          width: '70%',
          justifyContent: 'center'
        }}
        disabled={isLoadingEnhancedText}
        title={hasCitationsIncluded ? "Update citations with selected format" : "Include citations with selected format"}
      >
        {isLoadingEnhancedText ? (
          <div className="flex items-center gap-1">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span className="text-xs">Including...</span>
          </div>
        ) : (
          <span className="text-xs text-black" style={{ color: 'black' }}>
            {hasCitationsIncluded 
              ? "Update Citations" 
              : "Include Citations"}
          </span>
        )}
      </Button>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost"
            size="sm"
            className={cn(
              "text-slate-500 cursor-pointer transition-colors rounded-none border-none outline-none hover:bg-transparent focus:bg-transparent active:bg-transparent p-0 m-0 h-auto flex items-center justify-center",
              isLoadingEnhancedText && "opacity-50 cursor-not-allowed"
            )}
            style={{
              display: 'flex',
              padding: '0',
              margin: '0',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              width: '30%',
              height: '36px',
              fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
              position: 'relative',
              borderLeft: '1px solid #E8E8E5'
            }}
            disabled={isLoadingEnhancedText}
          >
            <div className="flex items-center justify-center w-full h-full">
              <span className="text-xs font-medium uppercase text-black" style={{ color: 'black' }}>{citationStyle}</span>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="start" 
          className="w-48 focus:ring-0 focus:outline-none border-none mt-4 p-0"
          style={{
            display: 'flex',
            width: '180px',
            padding: '8px',
            flexDirection: 'column',
            alignItems: 'flex-start',
            borderRadius: '12px',
            background: 'var(--Monochrome-Black, #232323)',
            boxShadow: '0px 0px 20px 0px rgba(203, 203, 203, 0.20)',
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
            marginTop: '16px'
          }}
          sideOffset={5}
        >
          <DropdownMenuLabel className="text-gray-400 text-xs w-full">
            Select Citation Format
          </DropdownMenuLabel>
          <div className="py-1 w-full">
            <DropdownMenuItem 
              onClick={() => { 
                setCitationStyle("apa"); 
              }}
              className="w-full px-4 py-2 text-left focus:bg-transparent focus:outline-none hover:bg-transparent"
              style={{
                color: 'var(--Monochrome-White, #FFF)',
                borderRadius: '8px',
                fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                fontSize: '14px',
                fontStyle: 'normal',
                fontWeight: 400,
                lineHeight: '20px'
              }}
              title="American Psychological Association style"
            >
              <div className="flex items-center justify-between w-full">
                <span>APA Style</span>
                {citationStyle === "apa" && (
                  <Check className="h-3.5 w-3.5 text-blue-500" />
                )}
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => { 
                setCitationStyle("mla"); 
              }}
              className="w-full px-4 py-2 text-left focus:bg-transparent focus:outline-none hover:bg-transparent"
              style={{
                color: 'var(--Monochrome-White, #FFF)',
                borderRadius: '8px',
                fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                fontSize: '14px',
                fontStyle: 'normal',
                fontWeight: 400,
                lineHeight: '20px'
              }}
              title="Modern Language Association style"
            >
              <div className="flex items-center justify-between w-full">
                <span>MLA Style</span>
                {citationStyle === "mla" && (
                  <Check className="h-3.5 w-3.5 text-blue-500" />
                )}
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => { 
                setCitationStyle("chicago"); 
              }}
              className="w-full px-4 py-2 text-left focus:bg-transparent focus:outline-none hover:bg-transparent"
              style={{
                color: 'var(--Monochrome-White, #FFF)',
                borderRadius: '8px',
                fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                fontSize: '14px',
                fontStyle: 'normal',
                fontWeight: 400,
                lineHeight: '20px'
              }}
              title="Chicago Manual of Style"
            >
              <div className="flex items-center justify-between w-full">
                <span>Chicago Style</span>
                {citationStyle === "chicago" && (
                  <Check className="h-3.5 w-3.5 text-blue-500" />
                )}
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => { 
                setCitationStyle("ieee"); 
              }}
              className="w-full px-4 py-2 text-left focus:bg-transparent focus:outline-none hover:bg-transparent"
              style={{
                color: 'var(--Monochrome-White, #FFF)',
                borderRadius: '8px',
                fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                fontSize: '14px',
                fontStyle: 'normal',
                fontWeight: 400,
                lineHeight: '20px'
              }}
              title="Institute of Electrical and Electronics Engineers style"
            >
              <div className="flex items-center justify-between w-full">
                <span>IEEE Style</span>
                {citationStyle === "ieee" && (
                  <Check className="h-3.5 w-3.5 text-blue-500" />
                )}
              </div>
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default CitationControls; 
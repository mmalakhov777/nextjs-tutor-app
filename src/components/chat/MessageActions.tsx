import React from 'react';
import { Copy, Share2, Volume2, VolumeX } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Message as MessageType } from '@/types/chat';
import { SpinnerIcon } from '@/components/icons/SpinnerIcon';

interface MessageActionsProps {
  message: MessageType;
  enhancedText?: string | null;
  onCopy: (content: string) => void;
  isSpeaking: boolean;
  isLoadingSpeech: boolean;
  handleSpeak: () => void;
}

const MessageActions: React.FC<MessageActionsProps> = ({
  message,
  enhancedText,
  onCopy,
  isSpeaking,
  isLoadingSpeech,
  handleSpeak
}) => {
  return (
    <div className="flex items-center gap-2">
      {/* TTS button (only for assistant messages) */}
      {message.role === 'assistant' && !message.toolAction && (
        <Button
          onClick={handleSpeak}
          disabled={!message.content}
          variant="ghost"
          size="sm"
          className={cn(
            "text-slate-500 hover:bg-gray-100 rounded-md cursor-pointer transition-colors",
            !message.content && "opacity-50 cursor-not-allowed"
          )}
          style={{
            display: 'flex',
            padding: '8px',
            alignItems: 'center',
            gap: '4px',
            height: '36px'
          }}
          title={(isSpeaking || isLoadingSpeech) ? "Stop playing audio" : "Play as speech"}
        >
          {isLoadingSpeech ? (
            <div className="flex items-center gap-1">
              <SpinnerIcon className="h-4 w-4 animate-spin text-[#232323]" />
            </div>
          ) : isSpeaking ? (
            <div className="flex items-center gap-1">
              <VolumeX className="h-4 w-4 text-blue-500" />
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <Volume2 className="h-4 w-4 text-[#232323]" />
            </div>
          )}
        </Button>
      )}
    
      {/* Copy button */}
      <Button 
        onClick={() => onCopy(enhancedText || message.content)}
        variant="ghost"
        size="sm"
        className={cn(
          "text-slate-500 hover:bg-gray-100 rounded-md cursor-pointer transition-colors",
          !message.content && "opacity-50 cursor-not-allowed"
        )}
        style={{
          display: 'flex',
          padding: '8px',
          alignItems: 'center',
          gap: '4px',
          height: '36px'
        }}
        title="Copy to clipboard"
      >
        <Copy className="h-3.5 w-3.5 text-[#232323]" style={{ color: '#232323' }} />
      </Button>
      
      {/* Share button */}
      <Button 
        onClick={() => {
          // Basic share functionality
          if (navigator.share) {
            navigator.share({
              title: 'Shared message',
              text: enhancedText || message.content,
            }).catch(console.error);
          } else {
            // Fallback to copy
            onCopy(enhancedText || message.content);
            alert('Content copied to clipboard!');
          }
        }}
        variant="ghost"
        size="sm"
        className={cn(
          "text-slate-500 hover:bg-gray-100 rounded-md cursor-pointer transition-colors",
          !message.content && "opacity-50 cursor-not-allowed"
        )}
        style={{
          display: 'flex',
          padding: '8px',
          alignItems: 'center',
          gap: '4px',
          height: '36px'
        }}
        title="Share this message"
      >
        <Share2 className="h-3.5 w-3.5 text-[#232323]" style={{ color: '#232323' }} />
      </Button>
    </div>
  );
};

export default MessageActions; 
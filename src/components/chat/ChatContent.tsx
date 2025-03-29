import { ChatMessages } from '@/components/chat/ChatMessages';
import type { Message } from '@/types/chat';

interface ChatContentProps {
  messages: Message[];
  currentMessage: string;
  isProcessing: boolean;
  showWelcome: boolean;
  isLoadingSession: boolean;
  isCreatingSession: boolean;
  currentAgent?: string;
  onMessageChange: (message: string) => void;
  onSendMessage: (message: string) => void;
  onCopy: (content: string) => void;
  onEdit: (message: Message) => Promise<void>;
  onDelete: (message: Message) => Promise<void>;
}

export function ChatContent({
  messages,
  currentMessage,
  isProcessing,
  showWelcome,
  isLoadingSession,
  isCreatingSession,
  currentAgent,
  onMessageChange,
  onSendMessage,
  onCopy,
  onEdit,
  onDelete
}: ChatContentProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto pb-20">
        <ChatMessages
          messages={messages}
          isProcessing={isProcessing}
          showWelcome={showWelcome}
          onCopy={onCopy}
          onEdit={onEdit}
          onDelete={onDelete}
          currentAgent={currentAgent}
        />
      </div>
    </div>
  );
} 
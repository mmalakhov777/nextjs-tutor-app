import { ChatMessages } from '@/components/chat/ChatMessages';
import type { Message, UploadedFile } from '@/types/chat';

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
  onLinkSubmit?: (url: string) => Promise<void>;
  onFileSelect?: (file: UploadedFile) => void;
  cachedMetadata?: Record<string, any>;
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
  onDelete,
  onLinkSubmit,
  onFileSelect,
  cachedMetadata = {}
}: ChatContentProps) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <ChatMessages
        messages={messages}
        isProcessing={isProcessing}
        showWelcome={showWelcome}
        onCopy={onCopy}
        onEdit={onEdit}
        onDelete={onDelete}
        currentAgent={currentAgent}
        onLinkSubmit={onLinkSubmit}
        onFileSelect={onFileSelect}
        cachedMetadata={cachedMetadata}
      />
    </div>
  );
} 
import { ChatMessages } from '@/components/chat/ChatMessages';
import type { Message, UploadedFile } from '@/types/chat';

interface ChatContentProps {
  messages: Message[];
  currentMessage: string;
  isProcessing: boolean;
  showWelcome: boolean;
  isLoadingSession: boolean;
  isCreatingSession: boolean;
  onMessageChange: (value: string) => void;
  onSendMessage: (message: string) => void;
  onCopy: (content: string) => void;
  onEdit?: (message: Message) => void;
  onDelete?: (message: Message) => void;
  onLinkSubmit?: (url: string) => Promise<void>;
  onFileSelect?: (file: UploadedFile) => void;
  cachedMetadata?: Record<string, any>;
  mode: 'chat' | 'research';
  currentScenario?: {
    title: string;
    description: string;
  } | null;
  onWriteTextComplete?: (content: string) => void;
  onFlashCardComplete?: () => void;
  onOpenNotes?: () => void;
  onOpenFlashcards?: () => void;
  onCVComplete?: (cvContent: any) => void;
  onOpenCV?: () => void;
  onOpenPresentations?: () => void;
  inputComponent?: React.ReactNode;
  showLeftSidebar?: boolean;
  showRightSidebar?: boolean;
  onMobileTabChange?: (tab: 'assets') => void;
  autoAddSources?: boolean;
  onPublicSessionClick?: (sessionId: string) => void;
  hasConversation?: boolean;
  onSendMessageFromActions?: (payload: { message: string; type?: 'research' | 'chat'; agent?: string }) => void;
}

export function ChatContent({
  messages,
  currentMessage,
  isProcessing,
  showWelcome,
  isLoadingSession,
  isCreatingSession,
  mode,
  onMessageChange,
  onSendMessage,
  onCopy,
  onEdit,
  onDelete,
  onLinkSubmit,
  onFileSelect,
  cachedMetadata = {},
  currentScenario,
  onWriteTextComplete,
  onFlashCardComplete,
  onOpenNotes,
  onOpenFlashcards,
  onCVComplete,
  onOpenCV,
  onOpenPresentations,
  inputComponent,
  showLeftSidebar,
  showRightSidebar,
  onMobileTabChange,
  autoAddSources,
  onPublicSessionClick,
  hasConversation,
  onSendMessageFromActions,
}: ChatContentProps) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <ChatMessages
        messages={messages}
        isProcessing={isProcessing}
        showWelcome={showWelcome}
        mode={mode}
        onCopy={onCopy}
        onEdit={onEdit}
        onDelete={onDelete}
        onLinkSubmit={onLinkSubmit}
        onFileSelect={onFileSelect}
        cachedMetadata={cachedMetadata}
        currentScenario={currentScenario}
        onWriteTextComplete={onWriteTextComplete}
        onFlashCardComplete={onFlashCardComplete}
        onOpenNotes={onOpenNotes}
        onOpenFlashcards={onOpenFlashcards}
        onCVComplete={onCVComplete}
        onOpenCV={onOpenCV}
        onOpenPresentations={onOpenPresentations}
        inputComponent={inputComponent}
        showLeftSidebar={showLeftSidebar}
        showRightSidebar={showRightSidebar}
        onMobileTabChange={onMobileTabChange}
        autoAddSources={autoAddSources}
        onPublicSessionClick={onPublicSessionClick}
        hasConversation={hasConversation}
        onSendMessage={onSendMessageFromActions}
      />
    </div>
  );
} 
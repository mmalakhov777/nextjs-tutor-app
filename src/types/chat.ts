export type MessageRole = 'system' | 'assistant' | 'user' | 'function' | 'error' | 'tool';

export type Message = {
  id?: string;
  sessionId?: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  agentName?: string;
  hasFile?: boolean;
  fileId?: string;
  fileName?: string;
  toolAction?: 'call' | 'output' | 'annotations';
  toolName?: string;
  metadata?: any;
  reasoning?: string; // Support for reasoning content from models like Claude and Perplexity
};

// Scenario progress type for storing in database
export interface ScenarioProgress {
  scenario: {
    id: string;
    title: string;
    description: string;
    steps: Array<{
      title: string;
      description: string;
      actions: Array<{
        label: string;
        prompt: string;
        agentName?: string;
        type?: 'research' | 'chat';
      }>;
    }>;
  };
  currentStep: number;
  completedSteps: number[];
  triggeredActions: Record<string, boolean>;
  startedAt: string;
  lastUpdatedAt: string;
}

export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  vector_store_id?: string;
  messages?: Message[];
  // New scenario progress fields
  scenario_id?: string | null;
  scenario_progress?: ScenarioProgress | null;
  scenario_started_at?: string | null;
  scenario_completed_at?: string | null;
  // New visibility fields
  visibility?: 'public' | 'private';
  is_public?: boolean;
  public_url?: string | null;
  made_public_at?: string | null;
  // Tool usage tracking
  tool_call_types?: string[] | null;
}

export interface DatabaseMessage {
  id: string;
  session_id: string;
  role: string;
  content: string;
  agent_id?: string;
  agent_name?: string;
  user_id?: string;
  metadata?: string | Record<string, any>;
  tool_action?: string;
  created_at: string;
  timestamp?: string;
}

export interface DocumentMetadata {
  title: string;
  authors: string[];
  publication_year: string;
  type: string;
  summary: string;
  total_pages: number;
}

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadDate: Date;
  format?: string;
  vectorStoreId?: string;
  status?: string;
  source?: 'upload' | 'link';  // Indicates whether this is from a file upload or a link
  url?: string;  // URL if this is a link
  file_content?: string;  // The text content of the file
  
  // Document metadata
  doc_title?: string | null;
  doc_authors?: string[];
  doc_publication_year?: number | null;
  doc_type?: string | null;
  doc_summary?: string | null;
  total_pages?: number;
  processed_at?: string | null;
  
  metadata?: Record<string, any>;
}

export interface AgentOrTool {
  id: string;
  name: string;
  type: 'agent' | 'tool';
  enabled: boolean;
  can_disable: boolean;
  is_triage_agent?: boolean;
  instructions?: string;
  handoff_description?: string;
  model?: string;
}

export interface AnalysisModalState {
  isOpen: boolean;
  fileName: string | null;
  fileType: string | null;
  analysis: {
    summary: string | null;
    key_points: string[] | null;
    entities: Array<{ entity: string; type: string }> | null;
    sentiment: string | null;
    topics: string[] | null;
  } | null;
}

// Component Props
export interface FileSidebarProps {
  uploadedFiles: UploadedFile[];
  isUploadingFile: boolean;
  showFileInfo: boolean;
  defaultVectorStoreId: string | null;
  userId?: string | null;
  currentConversationId?: string | null;
  onFileUpload: (file: File) => void;
  onLinkSubmit?: (url: string) => void;
  onShowAnalysis: (file: UploadedFile) => void;
  onToggleFileInfo: () => void;
  onFileDeleted?: (fileId: string) => void;
  onVectorStoreCreated: (id: string) => void;
  onRefreshFiles?: () => void;
  isRefreshing?: boolean;
  onSendMessage?: (message: string, agent?: string) => void;
  onFileQuickAction?: (fileInfo: UploadedFile, action: string, content: string) => void;
  onFileSelect?: (file: UploadedFile | null) => void;
  isMobile?: boolean;
  autoAddSources?: boolean;
  setAutoAddSources?: (enabled: boolean) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export interface ChatHeaderProps {
  showAgentsSidebar?: boolean;
  onToggleAgentsSidebar?: () => void;
  currentAgent?: string;
  onReset?: () => void;
}

export interface ChatMessagesProps {
  messages: Message[];
  isProcessing: boolean;
  showWelcome: boolean;
  onCopy: (content: string) => void;
  onEdit?: (message: Message) => void;
  onDelete?: (message: Message) => void;
  onLinkSubmit?: (url: string) => Promise<void>;
  currentAgent?: string;
}

export interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (message: string, displayMessage?: string, agent?: string) => void;
  disabled: boolean;
}

export interface AgentsSidebarProps {
  agents: AgentOrTool[];
  isLoadingAgents: boolean;
  showAgentsSidebar?: boolean;
  onToggleAgentsSidebar?: () => void;
  onToggleAgentOrTool?: (agent: AgentOrTool) => void;
  vectorStoreInfo?: {
    id: string;
    fileCount?: number;
    type?: string;
  } | null;
  userId?: string | null;
  onAgentsUpdate?: (agents: AgentOrTool[]) => void;
  onTabChange?: (tab: 'notes' | 'scenarios' | 'flashcards' | 'presentations') => void;
  currentConversationId?: string;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export interface AnalysisModalProps {
  modal: AnalysisModalState;
  onClose: () => void;
}

export interface NotificationProps {
  message: string | null;
  onClose?: () => void;
}

// Add new type for history select handler
export type HandleHistorySelectFn = (session: ChatSession, skipSessionFetch?: boolean) => Promise<void>; 
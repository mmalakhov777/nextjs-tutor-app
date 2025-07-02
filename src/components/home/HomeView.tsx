'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// Import optimized icons
import {
  FiSend, FiRefreshCw, FiCopy, FiInfo, FiX, FiArrowRight,
  FiPaperclip, FiFile, FiUpload, FiToggleLeft, FiToggleRight, FiUsers, FiTool,
  FiSearch, FiMaximize2, FiExternalLink, FiClock, FiEdit2, FiTrash2, FiMoreVertical,
  FiMessageSquare, FiFolder, FiUser
} from '@/utils/optimizedIcons';
import { RefreshCw } from 'lucide-react';

// Import our components (lazy load heavy ones)
import { Message } from '@/components/chat/Message';
import { ChatInput } from '@/components/chat/ChatInput';
import { ChatMessages } from '@/components/chat/ChatMessages';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { ChatContent } from '@/components/chat/ChatContent';
import { ChatHistoryDropdown } from '@/components/chat/ChatHistoryDropdown';
import { MobileTabBar } from '@/components/chat/MobileTabBar';
import { ChatLayout } from '@/components/chat/ChatLayout';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';

// Lazy load heavy components
const FileSidebar = dynamic(
  () => import('@/components/chat/FileSidebar').then(mod => ({ default: mod.FileSidebar })),
  { ssr: false }
);

const AgentsSidebar = dynamic(
  () => import('@/components/chat/AgentsSidebar').then(mod => ({ 
    default: mod.AgentsSidebar
  })),
  { ssr: false }
);

// Import the ref type separately
import type { AgentsSidebarRef } from '@/components/chat/AgentsSidebar';

const AnalysisModal = dynamic(
  () => import('@/components/chat/AnalysisModal').then(mod => ({ default: mod.AnalysisModal })),
  { ssr: false }
);

const FileDetailModal = dynamic(
  () => import('@/components/chat/FileDetailModal').then(mod => ({ default: mod.FileDetailModal })),
  { ssr: false }
);

const ResearchLoadingIndicator = dynamic(
  () => import('@/components/chat/ResearchLoadingIndicator'),
  { ssr: false }
);

// Import our hooks
import { useChat } from '@/hooks/useChat';
import { useFiles } from '@/hooks/useFiles';
import { useHistory } from '@/hooks/useHistory';
import { useAnalysis } from '@/hooks/useAnalysis';
import { useAgents } from '@/hooks/useAgents';
import { useScenarioContext } from '@/contexts/ScenarioContext';

// Import our types
import type {
  Message as BaseMessage,
  MessageRole,
  UploadedFile,
  AgentOrTool,
  AnalysisModalState,
  ChatSession,
  DatabaseMessage as DBMessage,
  HandleHistorySelectFn
} from '@/types/chat';

// Type definitions remain the same...
type FileCitation = {
  file_id: string;
  index: number;
  type: 'file_citation';
  filename: string;
  raw_content: string;
};

type Message = BaseMessage & {
  id?: string;
  agentName?: string;
  hasFile?: boolean;
  fileId?: string;
  fileName?: string;
  toolAction?: 'call' | 'output' | 'annotations';
  toolName?: string;
  citations?: FileCitation[];
  sessionId?: string;
  annotations?: {
    content: string;
    toolName?: string;
    toolAction?: string;
  };
  metadata?: any;
};

interface ExtendedDBMessage {
  role: string;
  content: string;
  created_at: string;
  timestamp?: string;
  id: string;
  session_id: string;
  chat_session_id?: string;
  agent_name?: string;
  metadata?: string | Record<string, any>;
  tool_action?: string;
}

type ExtendedChatSession = ChatSession & {
  message_count?: number;
};

export interface HomeViewProps {
  vectorStoreInfoFromUrl?: {
    id: string;
    fileCount?: number;
    type?: string;
  } | null;
  onInitializationComplete?: () => void;
}

export default function HomeView({
  vectorStoreInfoFromUrl = null,
  onInitializationComplete
}: HomeViewProps) {
  // Component logic will be moved here from home.tsx
  // This is a placeholder structure - the actual implementation
  // would move all the logic from home.tsx here
  
  return (
    <div className="flex h-screen w-full">
      {/* Component JSX will be moved here */}
      <div className="flex-1">
        <p>Home View Component - Implementation to be moved from home.tsx</p>
      </div>
    </div>
  );
}
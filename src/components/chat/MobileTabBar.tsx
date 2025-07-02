import { FiFolder, FiMessageSquare, FiUser, FiLayers } from 'react-icons/fi';

interface MobileTabBarProps {
  activeTab: 'chat' | 'files' | 'assets';
  onTabChange: (tab: 'chat' | 'files' | 'assets') => void;
  // Assets count props
  noteParagraphs?: Array<{ content?: string }>;
  flashCards?: Array<any>;
  cvContent?: any;
  agentSlides?: Array<any>;
}

export function MobileTabBar({ 
  activeTab, 
  onTabChange, 
  noteParagraphs, 
  flashCards, 
  cvContent, 
  agentSlides 
}: MobileTabBarProps) {
  // Calculate assets count similar to AgentsSidebar.tsx
  const availableAssets = [
    {
      exists: noteParagraphs && noteParagraphs.length > 0 && noteParagraphs.some(p => p.content && p.content.trim() !== '' && p.content !== '<p></p>')
    },
    {
      exists: flashCards && flashCards.length > 0
    },
    {
      exists: cvContent !== null && cvContent !== undefined
    },
    {
      exists: agentSlides && agentSlides.length > 0
    }
  ].filter(asset => asset.exists);

  const assetsCount = availableAssets.length;

  return (
    <div className="bg-white p-2">
      <div className="flex p-1 items-center rounded-xl bg-[#F2F2ED]">
        <button
          onClick={() => onTabChange('files')}
          className={`flex items-center justify-center p-1 rounded-lg flex-1 ${activeTab === 'files' ? 'bg-white text-[#232323]' : 'text-[#232323]'}`}
          aria-label="Files tab"
        >
          <span className="text-sm font-medium">Files</span>
        </button>
        <button
          onClick={() => onTabChange('chat')}
          className={`flex items-center justify-center p-1 rounded-lg flex-1 ${activeTab === 'chat' ? 'bg-white text-[#232323]' : 'text-[#232323]'}`}
          aria-label="Chat tab"
        >
          <span className="text-sm font-medium">Chat</span>
        </button>
        {/* Only show Assets tab when there are assets available */}
        {assetsCount > 0 && (
          <button
            onClick={() => onTabChange('assets')}
            className={`flex items-center justify-center gap-1 p-1 rounded-lg flex-1 ${activeTab === 'assets' ? 'bg-white text-[#232323]' : 'text-[#232323]'}`}
            aria-label="Assets tab"
          >
            <span className="text-sm font-medium">Assets</span>
            <span
              className="flex items-center justify-center text-xs font-medium rounded-full h-4 w-4 ml-1"
              style={{
                background: activeTab === 'assets' ? '#232323' : 'rgba(35, 35, 35, 0.8)',
                color: 'white',
                minWidth: '16px',
                fontSize: '10px'
              }}
            >
              {assetsCount}
            </span>
          </button>
        )}
      </div>
    </div>
  );
} 
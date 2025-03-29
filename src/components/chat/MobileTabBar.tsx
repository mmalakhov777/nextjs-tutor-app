import { FiFolder, FiMessageSquare, FiUser } from 'react-icons/fi';

interface MobileTabBarProps {
  activeTab: 'chat' | 'files' | 'agents';
  onTabChange: (tab: 'chat' | 'files' | 'agents') => void;
}

export function MobileTabBar({ activeTab, onTabChange }: MobileTabBarProps) {
  return (
    <div className="bg-white p-2">
      <div className="flex p-1 items-center rounded-xl bg-[#F2F2ED]">
        <button
          onClick={() => onTabChange('files')}
          className={`flex items-center justify-center p-1 rounded-lg flex-1 ${activeTab === 'files' ? 'bg-white text-black' : 'text-black'}`}
          aria-label="Files tab"
        >
          <span className="text-sm font-medium">Files</span>
        </button>
        <button
          onClick={() => onTabChange('chat')}
          className={`flex items-center justify-center p-1 rounded-lg flex-1 ${activeTab === 'chat' ? 'bg-white text-black' : 'text-black'}`}
          aria-label="Chat tab"
        >
          <span className="text-sm font-medium">Chat</span>
        </button>
        <button
          onClick={() => onTabChange('agents')}
          className={`flex items-center justify-center p-1 rounded-lg flex-1 ${activeTab === 'agents' ? 'bg-white text-black' : 'text-black'}`}
          aria-label="Agents tab"
        >
          <span className="text-sm font-medium">Agents</span>
        </button>
      </div>
    </div>
  );
} 
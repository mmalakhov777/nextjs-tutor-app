import dynamic from 'next/dynamic';

// Loading component
const MessageContentLoading = () => (
  <div className="w-full">
    <div className="h-4 w-full mb-2 bg-gray-200 animate-pulse rounded" />
    <div className="h-4 w-5/6 mb-2 bg-gray-200 animate-pulse rounded" />
    <div className="h-4 w-4/6 bg-gray-200 animate-pulse rounded" />
  </div>
);

// Dynamically import MessageContent
const MessageContent = dynamic(
  () => import('./MessageContent').then(mod => ({ default: mod.MessageContent })),
  {
    loading: () => <MessageContentLoading />,
    ssr: false,
  }
);

export default MessageContent;
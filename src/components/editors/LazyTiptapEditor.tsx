import dynamic from 'next/dynamic';

// Loading component for better UX
const TiptapLoading = () => (
  <div className="flex flex-col h-full">
    <div className="border-b border-gray-200 flex items-center gap-1 px-2 py-1 bg-white w-full h-9">
      <div className="h-6 w-6 bg-gray-200 animate-pulse rounded" />
      <div className="h-6 w-6 bg-gray-200 animate-pulse rounded" />
      <div className="h-6 w-6 bg-gray-200 animate-pulse rounded" />
      <div className="w-px h-4 bg-gray-300 mx-1" />
      <div className="h-6 w-6 bg-gray-200 animate-pulse rounded" />
    </div>
    <div className="flex-grow w-full h-full p-4">
      <div className="h-4 w-full mb-2 bg-gray-200 animate-pulse rounded" />
      <div className="h-4 w-3/4 bg-gray-200 animate-pulse rounded" />
    </div>
  </div>
);

// Dynamically import the TiptapEditor with no SSR
const TiptapEditor = dynamic(
  () => import('./TiptapEditor'),
  {
    loading: () => <TiptapLoading />,
    ssr: false,
  }
);

export default TiptapEditor;
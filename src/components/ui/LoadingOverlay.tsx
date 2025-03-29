interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
}

export function LoadingOverlay({ isVisible, message = 'Loading...' }: LoadingOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-20 flex flex-col items-center justify-center">
      <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full mb-4"></div>
      <p className="text-gray-700 font-medium">{message}</p>
    </div>
  );
} 
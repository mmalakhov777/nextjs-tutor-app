import { LoadingSpinner } from '@/components/icons/LoadingSpinner';

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
}

export function LoadingOverlay({ isVisible, message = 'Loading...' }: LoadingOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-20 flex flex-col items-center justify-center">
      <LoadingSpinner className="h-10 w-10 mb-4" color="#3B82F6" />
      <p className="text-gray-700 font-medium">{message}</p>
    </div>
  );
} 
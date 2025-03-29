import { WelcomeIcon } from '@/components/icons/WelcomeIcon';

interface WelcomeMessageProps {
  size?: 'small' | 'large';
}

export function WelcomeMessage({ size = 'large' }: WelcomeMessageProps) {
  if (size === 'small') {
    return (
      <div className="text-center p-2 text-sm text-black mb-2">
        <p>How can I help you today?</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg w-full mx-auto text-center p-8 rounded-lg">
      <div className="flex justify-center mb-4">
        <div style={{ width: '80px', height: '80px', aspectRatio: '1/1' }}>
          <WelcomeIcon width={80} height={80} />
        </div>
      </div>
      <h2 className="text-3xl font-medium mb-2" style={{ fontSize: '32px' }}>Get the best possible answer</h2>
      <p className="text-black">
        Ask anything or chat with your files — we'll pick the best AI for the job
      </p>
    </div>
  );
} 
import { LoadingIndicator } from './LoadingIndicator';

// A research loader component displayed as a chat bubble when in research mode
export default function ResearchLoadingIndicator() {
  return (
    <LoadingIndicator
      message="Researching..."
      spinnerColor="#70D6FF"
    />
  );
} 
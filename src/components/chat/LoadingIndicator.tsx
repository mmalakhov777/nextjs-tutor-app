import { LoadingSpinner } from '@/components/icons/LoadingSpinner';

interface LoadingIndicatorProps {
  message?: string;
  containerClassName?: string;
  customStyles?: React.CSSProperties;
  textStyles?: React.CSSProperties;
  spinnerColor?: string;
}

export function LoadingIndicator({
  message = "AI is thinking...",
  containerClassName = "flex items-start w-full mb-4",
  customStyles,
  textStyles,
  spinnerColor = "#70D6FF"
}: LoadingIndicatorProps) {
  // Default styles matching the requested design
  const defaultStyles: React.CSSProperties = {
    display: "flex",
    padding: "8px 12px",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "8px",
    alignSelf: "stretch",
    borderRadius: "16px",
    border: "1px solid #E8E8E5",
    background: "#FFF",
    width: "100%"
  };

  // Default text styles to match exactly other messages
  const defaultTextStyles: React.CSSProperties = {
    color: "#232323",
    fontSize: "16px",
    fontStyle: "normal",
    fontWeight: 400,
    lineHeight: "24px",
    fontFeatureSettings: "'ss04' on"
  };

  // Combine default styles with any custom styles
  const bubbleStyles = { ...defaultStyles, ...customStyles };
  const finalTextStyles = { ...defaultTextStyles, ...textStyles };

  return (
    <div className={containerClassName}>
      <div style={bubbleStyles}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <LoadingSpinner color={spinnerColor} />
          <div style={finalTextStyles}>{message}</div>
        </div>
      </div>
    </div>
  );
} 
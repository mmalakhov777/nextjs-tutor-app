import { LoadingIndicator } from './LoadingIndicator';

// A research loader component displayed as a chat bubble when in research mode
export default function ResearchLoadingIndicator() {
  return (
    <LoadingIndicator
      message="Researching..."
      spinnerColor="#70D6FF"
      containerClassName="flex items-start w-full mb-4"
      customStyles={{
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
      }}
      textStyles={{
        color: "#232323",
        fontSize: "16px",
        fontStyle: "normal",
        fontWeight: 400,
        lineHeight: "24px",
        fontFeatureSettings: "'ss04' on"
      }}
    />
  );
} 
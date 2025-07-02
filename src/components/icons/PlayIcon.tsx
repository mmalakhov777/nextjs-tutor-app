import React from 'react';

interface PlayIconProps {
  className?: string;
}

export function PlayIcon({ className }: PlayIconProps) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="16" 
      height="17" 
      viewBox="0 0 16 17" 
      fill="none"
      className={className}
    >
      <path 
        d="M3.14014 13.2682C3.14014 13.9128 3.51123 14.2187 3.95394 14.2187C4.14926 14.2187 4.35108 14.1536 4.5529 14.0494L12.1376 9.61588C12.6779 9.30338 12.8602 9.08854 12.8602 8.75C12.8602 8.40495 12.6779 8.19662 12.1376 7.88412L4.5529 3.45052C4.35108 3.33984 4.14926 3.28125 3.95394 3.28125C3.51123 3.28125 3.14014 3.58724 3.14014 4.23177V13.2682Z" 
        fill="white"
      />
    </svg>
  );
} 
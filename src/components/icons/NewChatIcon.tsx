import React from 'react';

interface NewChatIconProps {
  className?: string;
}

export function NewChatIcon({ className }: NewChatIconProps) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="16" 
      height="16" 
      viewBox="0 0 16 16" 
      fill="none" 
      className={className}
    >
      <path 
        d="M2.62891 8C2.62891 8.31901 2.89583 8.57943 3.20833 8.57943H7.42057V12.7916C7.42057 13.1042 7.68099 13.3711 8 13.3711C8.31901 13.3711 8.58594 13.1042 8.58594 12.7916V8.57943H12.7916C13.1042 8.57943 13.3711 8.31901 13.3711 8C13.3711 7.68099 13.1042 7.41406 12.7916 7.41406H8.58594V3.20833C8.58594 2.89583 8.31901 2.62891 8 2.62891C7.68099 2.62891 7.42057 2.89583 7.42057 3.20833V7.41406H3.20833C2.89583 7.41406 2.62891 7.68099 2.62891 8Z" 
        fill="currentColor"
      />
    </svg>
  );
} 
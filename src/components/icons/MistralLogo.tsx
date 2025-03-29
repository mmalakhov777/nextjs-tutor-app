import React from 'react';

interface MistralLogoProps {
  className?: string;
}

export const MistralLogo: React.FC<MistralLogoProps> = ({ className }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="20" 
      height="14" 
      viewBox="0 0 20 14" 
      fill="none"
      className={className}
    >
      <g clipPath="url(#clip0_9258_4837)">
        <mask id="mask0_9258_4837" maskUnits="userSpaceOnUse" x="0" y="0" width="20" height="14">
          <path d="M19.1899 0.5H0.810547V13.5H19.1899V0.5Z" fill="white"/>
        </mask>
        <g mask="url(#mask0_9258_4837)">
          <path d="M6.05768 0.5H3.43359V3.09968H6.05768V0.5Z" fill="currentColor"/>
          <path d="M16.5577 0.5H13.9336V3.09968H16.5577V0.5Z" fill="currentColor"/>
          <path d="M8.68176 3.09961H3.43359V5.69929H8.68176V3.09961Z" fill="currentColor"/>
          <path d="M16.5577 3.09961H11.3096V5.69929H16.5577V3.09961Z" fill="currentColor"/>
          <path d="M16.5557 5.69922H3.43359V8.2989H16.5557V5.69922Z" fill="currentColor"/>
          <path d="M6.05768 8.29883H3.43359V10.8985H6.05768V8.29883Z" fill="currentColor"/>
          <path d="M11.3077 8.29883H8.68359V10.8985H11.3077V8.29883Z" fill="currentColor"/>
          <path d="M16.5577 8.29883H13.9336V10.8985H16.5577V8.29883Z" fill="currentColor"/>
          <path d="M8.68442 10.9004H0.810547V13.5001H8.68442V10.9004Z" fill="currentColor"/>
          <path d="M19.1834 10.9004H11.3096V13.5001H19.1834V10.9004Z" fill="currentColor"/>
        </g>
      </g>
      <defs>
        <clipPath id="clip0_9258_4837">
          <rect width="18.3793" height="13" fill="white" transform="translate(0.810547 0.5)"/>
        </clipPath>
      </defs>
    </svg>
  );
}; 
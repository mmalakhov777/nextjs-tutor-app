import React from 'react';

interface PerplexityLogoProps {
  className?: string;
}

export const PerplexityLogo: React.FC<PerplexityLogoProps> = ({ className }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="14" 
      height="16" 
      viewBox="0 0 14 16" 
      fill="none"
      className={className}
    >
      <g clipPath="url(#clip0_9258_4873)">
        <path d="M11.5153 1.81387L8.1623 4.64896H11.5153V1.81387ZM7.4348 4.1826L12.343 0.0320953V4.64896H13.9108V11.6234H12.0274V16L7.4348 11.7858V15.8682H6.60713V11.7877L1.90955 15.982V11.6234H0.0888672V4.64896H1.97228V0L6.60713 4.13154V0.0875327H7.4348V4.1826ZM6.01434 5.47711C4.31426 5.47809 2.61564 5.47711 0.916537 5.47711V10.7962H1.90955V9.47736L6.01483 5.4776L6.01434 5.47711ZM8.02954 5.47711L12.0274 9.48028V10.7957H13.0831V5.47663C11.3995 5.47663 9.71454 5.4776 8.02954 5.47663V5.47711ZM5.9448 4.64944L2.79995 1.84548V4.64896H5.9448V4.64944ZM6.60713 10.6834V6.05386L2.7377 9.8236V14.1385L6.60713 10.6834ZM7.44599 6.06261V10.6756L11.1997 14.12C11.1997 12.6864 11.1992 11.2538 11.1992 9.82019L7.44599 6.06261Z" fill="currentColor"/>
      </g>
      <defs>
        <clipPath id="clip0_9258_4873">
          <rect width="13.8224" height="16" fill="white" transform="translate(0.0888672)"/>
        </clipPath>
      </defs>
    </svg>
  );
}; 
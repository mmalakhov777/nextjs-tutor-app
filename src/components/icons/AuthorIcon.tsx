import React from 'react';

interface AuthorIconProps {
  className?: string;
  width?: number;
  height?: number;
}

const AuthorIcon: React.FC<AuthorIconProps> = ({ 
  className = "", 
  width = 20, 
  height = 20 
}) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={width} 
      height={height} 
      viewBox="0 0 20 20" 
      fill="none"
      className={className}
    >
      <path 
        d="M4.73405 17.5318H14.9636C16.3145 17.5318 16.9573 17.125 16.9573 16.2297C16.9573 14.0975 14.2637 11.0133 9.85287 11.0133C5.43392 11.0133 2.74023 14.0975 2.74023 16.2297C2.74023 17.125 3.38314 17.5318 4.73405 17.5318ZM4.35156 16.303C4.13998 16.303 4.05046 16.246 4.05046 16.0751C4.05046 14.7324 6.11751 12.2421 9.85287 12.2421C13.5801 12.2421 15.6472 14.7324 15.6472 16.0751C15.6472 16.246 15.5657 16.303 15.3542 16.303H4.35156ZM9.85287 9.99601C11.7897 9.99601 13.3685 8.27889 13.3685 6.17928C13.3685 4.09595 11.7978 2.46021 9.85287 2.46021C7.92415 2.46021 6.33724 4.1285 6.33724 6.19555C6.33724 8.28703 7.91602 9.99601 9.85287 9.99601ZM9.85287 8.76717C8.66472 8.76717 7.64746 7.63599 7.64746 6.19555C7.64746 4.77954 8.64843 3.68905 9.85287 3.68905C11.0654 3.68905 12.0582 4.75513 12.0582 6.17928C12.0582 7.61971 11.0492 8.76717 9.85287 8.76717Z" 
        fill="currentColor"
      />
    </svg>
  );
};

export default AuthorIcon; 
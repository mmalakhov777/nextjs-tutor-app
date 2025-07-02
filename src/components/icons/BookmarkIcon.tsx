import React from 'react';

interface BookmarkIconProps {
  className?: string;
}

export const BookmarkIcon: React.FC<BookmarkIconProps> = ({ className }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="10" 
      height="15" 
      viewBox="0 0 10 15" 
      fill="none"
      className={className}
    >
      <g clipPath="url(#clip0_11452_14474)">
        <path 
          d="M1.18181 14.7193C1.50081 14.7193 1.68962 14.5369 2.27555 13.9705L4.82113 11.4641C4.85368 11.4315 4.91227 11.4315 4.93831 11.4641L7.4839 13.9705C8.06983 14.5369 8.25863 14.7193 8.57763 14.7193C9.01383 14.7193 9.26777 14.4328 9.26777 13.925V2.62288C9.26777 1.38591 8.64923 0.754395 7.4253 0.754395H2.33415C1.11019 0.754395 0.491699 1.38591 0.491699 2.62288V13.925C0.491699 14.4328 0.745605 14.7193 1.18181 14.7193Z" 
          fill="white"
        />
      </g>
      <defs>
        <clipPath id="clip0_11452_14474">
          <rect width="9.01693" height="13.9909" fill="white" transform="translate(0.491699 0.754395)"/>
        </clipPath>
      </defs>
    </svg>
  );
}; 
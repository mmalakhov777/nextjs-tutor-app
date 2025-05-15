import React from 'react';

interface PlusIconProps {
  className?: string;
  width?: number;
  height?: number;
}

export const PlusIcon: React.FC<PlusIconProps> = ({ 
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
        d="M3.28516 10C3.28516 10.3988 3.61882 10.7243 4.00944 10.7243H9.27474V15.9895C9.27474 16.3802 9.60026 16.7139 9.99902 16.7139C10.3978 16.7139 10.7314 16.3802 10.7314 15.9895V10.7243H15.9886C16.3792 10.7243 16.7129 10.3988 16.7129 10C16.7129 9.60123 16.3792 9.26757 15.9886 9.26757H10.7314V4.01042C10.7314 3.61979 10.3978 3.28613 9.99902 3.28613C9.60026 3.28613 9.27474 3.61979 9.27474 4.01042V9.26757H4.00944C3.61882 9.26757 3.28516 9.60123 3.28516 10Z" 
        fill="currentColor"
      />
    </svg>
  );
};

export default PlusIcon; 
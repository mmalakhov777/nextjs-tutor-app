import React from 'react';

interface LoadingSpinnerProps {
  className?: string;
  color?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  className = "", 
  color = "#70D6FF" 
}) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none"
      className={`animate-spin ${className}`}
    >
      <path 
        d="M5.00002 11.9998C4.44774 11.9998 3.99346 12.4498 4.06167 12.9978C4.55288 16.9451 7.91972 19.9998 12 19.9998C16.4183 19.9998 20 16.4181 20 11.9998C20 7.91958 16.9454 4.55277 12.9982 4.06149C12.4501 3.99328 12.0001 4.44756 12.0001 4.99985C12.0001 5.55212 12.4512 5.9911 12.9959 6.0821C15.8356 6.5565 18 9.02541 18 11.9998C18 15.3135 15.3137 17.9998 12 17.9998C9.02556 17.9998 6.55663 15.8354 6.08228 12.9956C5.99129 12.4509 5.5523 11.9998 5.00002 11.9998Z" 
        fill={color}
      />
    </svg>
  );
}; 
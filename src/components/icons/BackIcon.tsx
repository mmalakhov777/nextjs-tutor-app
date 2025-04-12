import React from 'react';

interface BackIconProps {
  className?: string;
  width?: number;
  height?: number;
}

export const BackIcon: React.FC<BackIconProps> = ({
  className = '',
  width = 24,
  height = 24
}) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={width} 
      height={height} 
      viewBox="0 0 24 24" 
      fill="none" 
      className={className}
    >
      <path 
        d="M2.93164 12C2.93164 12.2441 3.03906 12.4687 3.23437 12.6543L9.71875 19.1289C9.91406 19.3145 10.1191 19.4024 10.3535 19.4024C10.832 19.4024 11.2129 19.0508 11.2129 18.5625C11.2129 18.3282 11.125 18.0938 10.9688 17.9473L8.78125 15.7207L4.91406 12.1953L4.70898 12.6738L7.85352 12.8691H20.207C20.7148 12.8691 21.0664 12.5078 21.0664 12C21.0664 11.4922 20.7148 11.1309 20.207 11.1309H7.85352L4.70898 11.3262L4.91406 11.8145L8.78125 8.2793L10.9688 6.05274C11.125 5.89649 11.2129 5.67188 11.2129 5.4375C11.2129 4.94922 10.832 4.59766 10.3535 4.59766C10.1191 4.59766 9.91406 4.67578 9.69922 4.89063L3.23437 11.3457C3.03906 11.5312 2.93164 11.7559 2.93164 12Z" 
        fill="currentColor"
      />
    </svg>
  );
};

export default BackIcon; 
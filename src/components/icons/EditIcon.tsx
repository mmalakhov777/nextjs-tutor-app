import React from 'react';

interface EditIconProps {
  className?: string;
}

export function EditIcon({ className }: EditIconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="17" viewBox="0 0 16 17" fill="none">
  <path d="M3.81102 14.3547L12.5388 5.63494L11.1389 4.22698L2.40306 12.9468L1.64307 14.7307C1.56308 14.9228 1.77107 15.1467 1.96307 15.0667L3.81102 14.3547ZM13.2428 4.94696L14.0508 4.15498C14.4588 3.74699 14.4828 3.307 14.1148 2.93901L13.8428 2.66701C13.4828 2.30702 13.0428 2.33902 12.6348 2.73901L11.8268 3.53899L13.2428 4.94696Z" fill="#232323"/>
</svg>
  );
} 
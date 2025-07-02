import React from 'react';
import { CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

interface FileStatusBadgeProps {
  status?: string;
}

export const FileStatusBadge: React.FC<FileStatusBadgeProps> = ({ status }) => {
  if (!status || status === 'completed') {
    return (
      <div className="flex items-center text-green-600 text-xs gap-1">
        <CheckCircle2 className="h-3 w-3" />
        <span>Ready</span>
      </div>
    );
  } else if (status === 'pending' || status === 'processing') {
    return (
      <div className="flex items-center text-amber-600 text-xs gap-1">
        <Clock className="h-3 w-3" />
        <span>Processing</span>
      </div>
    );
  } else if (status === 'error') {
    return (
      <div className="flex items-center text-red-600 text-xs gap-1">
        <AlertTriangle className="h-3 w-3" />
        <span>Error</span>
      </div>
    );
  }
  return null;
}; 
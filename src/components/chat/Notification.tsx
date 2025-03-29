import { X } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { NotificationProps } from '@/types/chat';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export function Notification({ message, onClose }: NotificationProps) {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    if (message) {
      setIsVisible(true);
    }
  }, [message]);
  
  const handleClose = () => {
    setIsVisible(false);
    if (onClose) {
      onClose();
    }
  };
  
  if (!message) return null;
  
  return (
    <div 
      className={cn(
        "fixed top-4 right-4 bg-white border border-slate-200 text-slate-900 px-4 py-2 rounded-md shadow-md z-50 flex items-center gap-2",
        isVisible ? "animate-fade-in" : "animate-fade-out opacity-0 pointer-events-none"
      )}
    >
      <span>{message}</span>
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-5 w-5 rounded-full hover:bg-slate-100" 
        onClick={handleClose}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
} 
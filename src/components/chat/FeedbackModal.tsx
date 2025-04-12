import { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, Send } from 'lucide-react';

interface FeedbackModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FeedbackModal({ isOpen, onOpenChange }: FeedbackModalProps) {
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!feedback.trim()) return;
    
    setIsSubmitting(true);
    
    try {
      // Here you would typically send the feedback to your backend
      // For now, we'll just simulate a delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Show success message
      setIsSubmitted(true);
      
      // Reset and close after a delay
      setTimeout(() => {
        setFeedback('');
        setIsSubmitted(false);
        onOpenChange(false);
      }, 2000);
    } catch (error) {
      console.error('Error submitting feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Send Feedback</DialogTitle>
          <DialogDescription>
            Share your thoughts or report an issue with the chat experience.
          </DialogDescription>
        </DialogHeader>
        
        {!isSubmitted ? (
          <>
            <div className="py-4">
              <Textarea
                placeholder="Tell us what you think or describe any issues you've encountered..."
                className="resize-none min-h-[150px]"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            
            <DialogFooter>
              <Button 
                type="submit" 
                onClick={handleSubmit}
                disabled={!feedback.trim() || isSubmitting}
                className="flex items-center gap-2"
              >
                {isSubmitting ? 'Sending...' : 'Send Feedback'}
                <Send className="h-4 w-4" />
              </Button>
            </DialogFooter>
          </>
        ) : (
          <div className="py-8 flex flex-col items-center text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
            <p className="text-lg font-medium">Thank you for your feedback!</p>
            <p className="text-muted-foreground mt-2">
              Your input helps us improve the experience.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
} 
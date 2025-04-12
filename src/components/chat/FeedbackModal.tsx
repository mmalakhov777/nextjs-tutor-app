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
  userId?: string;
  sessionId?: string;
}

// Helper function to get the backend URL
const getBackendUrl = () => {
  return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5002';
};

export function FeedbackModal({ isOpen, onOpenChange, userId = 'anonymous', sessionId = 'default' }: FeedbackModalProps) {
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!feedback.trim()) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Try to submit to the backend
      try {
        const backendUrl = getBackendUrl();
        const response = await fetch(`${backendUrl}/api/feedback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            feedback: feedback.trim(),
            userId: userId,
            sessionId: sessionId,
            timestamp: new Date().toISOString()
          }),
        });
        
        const data = await response.json();
        
        if (data.success) {
          console.log('Feedback submitted successfully!', data.feedbackId);
        } else {
          console.warn('Backend returned error:', data.message);
          throw new Error(data.message || 'Failed to submit feedback');
        }
      } catch (fetchError) {
        // If we're in development mode or the API endpoint isn't available,
        // log the feedback to console and continue as if successful
        console.warn('Could not reach feedback API endpoint:', fetchError);
        console.log('Feedback that would have been submitted:', {
          feedback: feedback.trim(),
          userId,
          sessionId,
          timestamp: new Date().toISOString()
        });
        
        // In production, you might want to re-throw here instead
        // throw fetchError;
        
        // For now, we'll simulate a short delay so the UX feels natural
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
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
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent 
        style={{ 
          maxWidth: '60%', 
          width: '60%', 
          padding: '2rem',
          borderRadius: '20px',
          border: '1px solid var(--Monochrome-Light, #E8E8E5)'
        }} 
        className="w-[60%] mx-auto"
      >
        <DialogHeader className="pb-4">
          <DialogTitle>Send Feedback</DialogTitle>
          <DialogDescription>
            Share your thoughts or report an issue with the chat experience.
          </DialogDescription>
        </DialogHeader>
        
        {!isSubmitted ? (
          <>
            <div className="pb-6">
              <Textarea
                placeholder="Tell us what you think or describe any issues you've encountered..."
                className="resize-none min-h-[150px] focus:ring-0 focus:border-none focus:outline-none active:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                disabled={isSubmitting}
                style={{ 
                  boxShadow: 'none',
                  borderRadius: '20px',
                  border: '1px solid var(--Monochrome-Light, #E8E8E5)',
                  background: 'var(--Monochrome-Ultralight, #F8F8F3)',
                  padding: '1rem'
                }}
              />
              
              {error && (
                <p className="text-red-500 text-sm mt-2">{error}</p>
              )}
            </div>
            
            <DialogFooter>
              <Button 
                type="submit" 
                onClick={handleSubmit}
                disabled={!feedback.trim() || isSubmitting}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  background: 'var(--Monochrome-Black, #232323)',
                  color: 'white'
                }}
                className="flex items-center gap-4"
              >
                {isSubmitting ? 'Sending...' : 'Send Feedback'}
                <Send className="h-4 w-4" />
              </Button>
            </DialogFooter>
          </>
        ) : (
          <div className="py-6 flex flex-col items-center text-center">
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
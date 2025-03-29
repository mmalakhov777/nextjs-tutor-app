import { FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import type { AnalysisModalProps, AnalysisModalState } from '@/types/chat';

export function AnalysisModal({ modal, onClose }: AnalysisModalProps) {
  // Check if analysis is loading (null or undefined)
  const isLoading = !modal.analysis;
  const content = modal.analysis ? `
    <h2>Document Analysis</h2>
    ${modal.analysis.summary ? `<h3>Summary</h3><p>${modal.analysis.summary}</p>` : ''}
    ${modal.analysis.key_points && modal.analysis.key_points.length > 0 ? 
      `<h3>Key Points</h3><ul>${modal.analysis.key_points.map(point => `<li>${point}</li>`).join('')}</ul>` : ''}
    ${modal.analysis.entities && modal.analysis.entities.length > 0 ? 
      `<h3>Key Entities</h3><ul>${modal.analysis.entities.map(entity => `<li><strong>${entity.entity}</strong> (${entity.type})</li>`).join('')}</ul>` : ''}
    ${modal.analysis.sentiment ? `<h3>Sentiment</h3><p>${modal.analysis.sentiment}</p>` : ''}
    ${modal.analysis.topics && modal.analysis.topics.length > 0 ? 
      `<h3>Topics</h3><ul>${modal.analysis.topics.map(topic => `<li>${topic}</li>`).join('')}</ul>` : ''}
  ` : '';

  return (
    <Dialog open={modal.isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex flex-row justify-between items-center">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-500" />
            <span>Analysis: {modal.fileName}</span>
          </DialogTitle>
          <Button 
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="h-7 w-7"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto py-2">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64">
              <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mb-4"></div>
              <p className="text-slate-600">Analyzing document...</p>
            </div>
          ) : (
            <div className="prose prose-slate max-w-none">
              <div dangerouslySetInnerHTML={{ __html: content }} />
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 
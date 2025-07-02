import React from 'react';
import { Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface SessionInfoCardProps {
  currentConversationId?: string;
  defaultVectorStoreId?: string;
  onCopyId: (id: string) => void;
}

export const SessionInfoCard: React.FC<SessionInfoCardProps> = ({
  currentConversationId,
  defaultVectorStoreId,
  onCopyId
}) => {
  return (
    <Card className="mb-3 sm:mb-4 bg-white">
      <CardContent className="p-2 sm:p-3">
        <h3 className="text-xs sm:text-sm font-semibold text-slate-900 mb-2">Current Session</h3>
        
        <div className="space-y-2 text-xs">
          <div>
            <div className="font-medium text-slate-600">Conversation ID:</div>
            <div className="flex items-center justify-between gap-1">
              <code className="bg-slate-100 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-blue-700 font-mono text-[10px] sm:text-xs max-w-[150px] truncate">
                {currentConversationId || "None"}
              </code>
              {currentConversationId && (
                <Button 
                  onClick={() => onCopyId(currentConversationId)}
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  title="Copy Conversation ID"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
          
          <div>
            <div className="font-medium text-slate-600">Vector Store ID:</div>
            <div className="flex items-center justify-between gap-1">
              <code className="bg-slate-100 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-blue-700 font-mono text-[10px] sm:text-xs max-w-[150px] truncate">
                {defaultVectorStoreId || "None"}
              </code>
              {defaultVectorStoreId && (
                <Button 
                  onClick={() => onCopyId(defaultVectorStoreId)}
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  title="Copy Vector Store ID"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 
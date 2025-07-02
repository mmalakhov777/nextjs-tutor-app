import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { SpinnerIcon } from '@/components/icons/SpinnerIcon';
import { 
  Plus, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight, 
  Edit3, 
  Trash2, 
  BookOpen,
  Brain,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff
} from 'lucide-react';

export interface FlashCard {
  id: string;
  front: string;
  back: string;
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  lastReviewed?: Date;
  reviewCount: number;
  correctCount: number;
  created: Date;
}

interface FlashCardsProps {
  userId?: string;
  currentConversationId?: string;
  flashCards: FlashCard[];
  onCreateCard: (card: Omit<FlashCard, 'id'>) => void;
  onEditCard: (cardId: string, updates: Partial<FlashCard>) => void;
  onDeleteCard: (cardId: string) => void;
  onReviewCard: (cardId: string, correct: boolean) => void;
  onSendMessage?: (message: string, agent?: string) => void;
}

const FlashCards: React.FC<FlashCardsProps> = ({ 
  userId, 
  currentConversationId,
  flashCards,
  onCreateCard,
  onEditCard,
  onDeleteCard,
  onReviewCard,
  onSendMessage
}) => {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isStudyMode, setIsStudyMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingCards, setIsCreatingCards] = useState(false);

  // Remove duplicates based on front and back text
  const uniqueFlashCards = React.useMemo(() => {
    const seen = new Map<string, FlashCard>();
    const uniqueCards: FlashCard[] = [];
    
    flashCards.forEach(card => {
      const key = `${card.front}::${card.back}`;
      if (!seen.has(key)) {
        seen.set(key, card);
        uniqueCards.push(card);
      }
    });
    
    return uniqueCards;
  }, [flashCards]);

  const filteredCards = uniqueFlashCards;

  const currentCard = filteredCards[currentCardIndex];

  const handleCardReview = useCallback((correct: boolean) => {
    if (!currentCard) return;

    onReviewCard(currentCard.id, correct);

    // Move to next card
    setIsFlipped(false);
    if (currentCardIndex < filteredCards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
    } else {
      setCurrentCardIndex(0);
    }
  }, [currentCard, currentCardIndex, filteredCards.length, onReviewCard]);

  const handleDeleteCard = useCallback((cardId: string) => {
    onDeleteCard(cardId);
    // Adjust current index if needed
    if (currentCardIndex >= filteredCards.length - 1 && currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
    }
  }, [currentCardIndex, filteredCards.length, onDeleteCard]);

  const nextCard = () => {
    setIsFlipped(false);
    setCurrentCardIndex((prev) => (prev + 1) % filteredCards.length);
  };

  const prevCard = () => {
    setIsFlipped(false);
    setCurrentCardIndex((prev) => (prev - 1 + filteredCards.length) % filteredCards.length);
  };

  const getDifficultyColor = (difficulty?: string) => {
    // Using monochrome styles instead of colors
    return 'bg-[#F8F8F3] text-[#232323] border border-[#E8E8E5]';
  };

  const getSuccessRate = (card: FlashCard) => {
    if (card.reviewCount === 0) return 0;
    return Math.round((card.correctCount / card.reviewCount) * 100);
  };

  // Calculate dynamic font size based on content length
  const getAnswerFontSize = (text: string) => {
    const length = text.length;
    if (length <= 100) return '16px'; // text-base
    if (length <= 200) return '15px';
    if (length <= 300) return '14px'; // text-sm
    if (length <= 500) return '13px';
    return '12px'; // text-xs for very long content
  };

  // Quick action handler - now sends with Flash Card Maker agent
  const handleQuickAction = (action: string) => {
    if (!onSendMessage) {
      console.error('No message handler available for flashcard quick actions');
      return;
    }
    
    setIsCreatingCards(true);
    
    // Send the action as a message to the chat with Flash Card Maker agent
    onSendMessage(action, 'Flash Card Maker');
  };

  if (isStudyMode && filteredCards.length > 0) {
    return (
      <div className="p-4 h-full flex flex-col">
        <div className="mb-4 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => setIsStudyMode(false)}
            style={{
              color: '#232323',
              border: 'none',
              background: 'transparent'
            }}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Exit Study
          </Button>
        </div>

        <div className="flex-1 flex flex-col justify-center items-center px-10">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: '448px' }}>
            <div 
              className="w-full"
              style={{
                display: 'flex',
                padding: '80px 64px',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '48px',
                alignSelf: 'stretch',
                borderRadius: '40px',
                background: 'rgba(199, 239, 255, 0.40)',
                minHeight: '450px',
                position: 'relative',
                zIndex: 2
              }}
            >
              <div className="text-center">
                <div className="cursor-pointer" onClick={() => setIsFlipped(!isFlipped)}>
                  {/* Question section - always visible */}
                  <div className="mb-8">
                    <div className="text-lg font-medium mb-4" style={{ color: '#232323' }}>
                      <span style={{ fontWeight: 'bold' }}>Q:</span> {currentCard.front}
                    </div>
                  </div>

                  {/* Answer section - show/hide based on flip state */}
                  <div className="border-t border-gray-200 pt-8">
                    {!isFlipped ? (
                      <div className="text-sm flex items-center justify-center" style={{ color: '#3C3C3C' }}>
                        <Eye className="h-4 w-4 mr-1" />
                        Click to reveal answer
                      </div>
                    ) : (
                      <>
                        <div 
                          className="mb-4" 
                          style={{ 
                            color: '#232323',
                            fontSize: getAnswerFontSize(currentCard.back),
                            maxHeight: '120px',
                            overflowY: 'auto',
                            lineHeight: '1.4'
                          }}
                        >
                          <span style={{ fontWeight: 'bold' }}>A:</span> {currentCard.back}
                        </div>
                        <div className="text-sm flex items-center justify-center" style={{ color: '#3C3C3C' }}>
                          <EyeOff className="h-4 w-4 mr-1" />
                          Click to hide answer
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Pseudo stacked element */}
            <div style={{
              height: '12px',
              borderRadius: '0px 0px 16px 16px',
              background: '#C7EFFF',
              width: 'calc(100% - 32px)',
              marginTop: '-12px'
            }}></div>
          </div>

          {/* Action buttons - only show when flipped */}
          {isFlipped && (
            <div className="flex gap-2 mt-4 w-full max-w-md justify-center">
              <Button
                variant="outline"
                onClick={() => handleCardReview(false)}
                style={{
                  display: 'flex',
                  padding: '12px 16px',
                  alignItems: 'center',
                  gap: '8px',
                  borderRadius: '8px',
                  border: '1px solid #E8E8E5',
                  background: '#FFF',
                  color: '#232323'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = '#F8F8F3';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = '#FFF';
                }}
              >
                <XCircle className="h-4 w-4" />
                I do not knew it
              </Button>
              <Button
                onClick={() => handleCardReview(true)}
                style={{
                  display: 'flex',
                  padding: '12px 16px',
                  alignItems: 'center',
                  gap: '8px',
                  borderRadius: '8px',
                  border: '1px solid #E8E8E5',
                  background: '#FFF',
                  color: '#232323'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = '#F8F8F3';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = '#FFF';
                }}
              >
                <CheckCircle className="h-4 w-4" />
                I knew it
              </Button>
            </div>
          )}
        </div>

        {/* Navigation Footer */}
        <footer className="flex-shrink-0 p-4 bg-white">
          <div className="flex justify-center items-center gap-4">
            <div 
              style={{
                borderRadius: '8px',
                border: '1px solid #E8E8E5',
                background: '#F2F2ED'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = '#E8E8E5';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = '#F2F2ED';
              }}
            >
              <Button
                variant="ghost"
                onClick={prevCard}
                disabled={filteredCards.length <= 1}
                style={{
                  color: '#232323',
                  opacity: filteredCards.length <= 1 ? 0.5 : 1
                }}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>

            <div className="text-sm" style={{ color: '#3C3C3C' }}>
              {currentCardIndex + 1} of {filteredCards.length}
            </div>

            <div 
              style={{
                borderRadius: '8px',
                border: '1px solid #E8E8E5',
                background: '#F2F2ED'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = '#E8E8E5';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = '#F2F2ED';
              }}
            >
              <Button
                variant="ghost"
                onClick={nextCard}
                disabled={filteredCards.length <= 1}
                style={{
                  color: '#232323',
                  opacity: filteredCards.length <= 1 ? 0.5 : 1
                }}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // Empty state - simplified
  if (filteredCards.length === 0) {
    return (
      <div className="p-6 h-full flex flex-col items-center justify-center text-center">
        <div className="mb-6">
          <div 
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: '#6C6C6C' }}
          >
            <Brain className="h-8 w-8 text-white" />
          </div>
        </div>
        
        <p className="mb-4 max-w-md" style={{ color: '#3C3C3C', fontSize: '16px' }}>
          No flashcards yet. Use the overview to create your first flashcards.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-3 flex flex-col items-center">
          {filteredCards.map((card, index) => (
            <div 
              key={`${card.id}-${index}`} 
              className="transition-colors"
              style={{
                display: 'flex',
                width: '542px',
                padding: '16px',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: '8px',
                borderRadius: '16px',
                border: '1px solid #E8E8E5',
                background: '#FFF'
              }}
            >
              <div className="w-full">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-sm font-medium mb-1" style={{ color: '#232323' }}>
                      <span style={{ fontWeight: 'bold' }}>Q:</span> {card.front}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDeleteCard(card.id);
                    }}
                    className="hover:bg-red-50"
                    style={{
                      color: '#3C3C3C',
                      cursor: 'pointer'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.color = '#EF4444';
                      e.currentTarget.style.background = '#FEE2E2';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.color = '#3C3C3C';
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="w-full">
                <div className="text-sm mb-2" style={{ color: '#3C3C3C' }}>
                  <span style={{ fontWeight: 'bold' }}>A:</span> {card.back}
                </div>
                <div className="text-xs" style={{ color: '#3C3C3C', fontWeight: 'bold' }}>
                  Reviewed {card.reviewCount} times • 
                  Created {new Date(card.created).toLocaleDateString()}
                  {card.lastReviewed && (
                    <> • Last reviewed {new Date(card.lastReviewed).toLocaleDateString()}</>
                  )}
                  {' • '}{getSuccessRate(card)}% success
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Footer - always visible at bottom */}
      {filteredCards.length > 0 && (
        <footer className="flex-shrink-0 p-4 border-t border-gray-200 bg-white flex justify-center">
          <Button
            onClick={() => setIsStudyMode(true)}
            style={{
              display: 'flex',
              padding: '12px 24px',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '8px',
              borderRadius: '100px',
              background: '#232323',
              color: '#FFF',
              border: 'none',
              height: '48px',
              fontSize: '14px'
            }}
          >
            Start Studying ({filteredCards.length} cards)
          </Button>
        </footer>
      )}
    </div>
  );
};

export default FlashCards; 
import { tool } from 'ai';
import { z } from 'zod';

// Tool for creating a new flashcard
export const createFlashCardTool = tool({
  description: 'Create a new flashcard with a question (front) and answer (back)',
  parameters: z.object({
    front: z.string().describe('The question or prompt on the front of the flashcard'),
    back: z.string().describe('The answer or content on the back of the flashcard'),
    category: z.string().optional().describe('Optional category for organizing the flashcard'),
    difficulty: z.enum(['easy', 'medium', 'hard']).optional().default('medium').describe('Difficulty level of the flashcard'),
  }),
  execute: async ({ front, back, category, difficulty }) => {
    try {
      // Create a new flashcard
      const newCard = {
        id: Date.now().toString(),
        front: front.trim(),
        back: back.trim(),
        category: category?.trim() || 'General',
        difficulty: difficulty || 'medium',
        reviewCount: 0,
        correctCount: 0,
        created: new Date(),
        lastReviewed: undefined,
      };

      // In a real implementation, this would save to a database
      // For now, we'll return the created card
      return {
        success: true,
        message: `Flashcard created successfully`,
        card: newCard,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to create flashcard: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },
});

// Tool for editing an existing flashcard
export const editFlashCardTool = tool({
  description: 'Edit an existing flashcard by updating its content',
  parameters: z.object({
    cardId: z.string().describe('The ID of the flashcard to edit'),
    front: z.string().optional().describe('New question or prompt for the front of the flashcard'),
    back: z.string().optional().describe('New answer or content for the back of the flashcard'),
    category: z.string().optional().describe('New category for the flashcard'),
    difficulty: z.enum(['easy', 'medium', 'hard']).optional().describe('New difficulty level'),
  }),
  execute: async ({ cardId, front, back, category, difficulty }) => {
    try {
      // In a real implementation, this would update the flashcard in the database
      // For now, we'll simulate the update
      const updates: any = {};
      
      if (front !== undefined) updates.front = front.trim();
      if (back !== undefined) updates.back = back.trim();
      if (category !== undefined) updates.category = category.trim();
      if (difficulty !== undefined) updates.difficulty = difficulty;

      if (Object.keys(updates).length === 0) {
        return {
          success: false,
          message: 'No updates provided',
        };
      }

      return {
        success: true,
        message: `Flashcard ${cardId} updated successfully`,
        updates,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to edit flashcard: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },
});

// Tool for deleting a flashcard
export const deleteFlashCardTool = tool({
  description: 'Delete an existing flashcard',
  parameters: z.object({
    cardId: z.string().describe('The ID of the flashcard to delete'),
    confirmDelete: z.boolean().optional().default(true).describe('Confirmation to delete the flashcard'),
  }),
  execute: async ({ cardId, confirmDelete }) => {
    try {
      if (!confirmDelete) {
        return {
          success: false,
          message: 'Deletion cancelled - confirmation not provided',
        };
      }

      // In a real implementation, this would delete from the database
      // For now, we'll simulate the deletion
      return {
        success: true,
        message: `Flashcard ${cardId} deleted successfully`,
        deletedId: cardId,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to delete flashcard: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },
});

// Export all flashcard tools
export const FLASHCARD_TOOLS = {
  createFlashCard: createFlashCardTool,
  editFlashCard: editFlashCardTool,
  deleteFlashCard: deleteFlashCardTool,
}; 
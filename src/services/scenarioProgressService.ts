import { ScenarioProgress } from '@/types/chat';

export class ScenarioProgressService {
  private getBackendUrl(): string {
    return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5002';
  }

  /**
   * Save scenario progress to the database
   */
  async saveScenarioProgress(
    sessionId: string, 
    scenarioProgress: ScenarioProgress,
    completed: boolean = false
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`/api/chat-sessions/${sessionId}/scenario-progress`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scenario_progress: scenarioProgress,
          scenario_id: scenarioProgress.scenario.id,
          completed
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save scenario progress');
      }

      const result = await response.json();
      return { success: true };
    } catch (error) {
      console.error('Error saving scenario progress:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Load scenario progress from the database
   */
  async loadScenarioProgress(sessionId: string): Promise<{
    success: boolean;
    data?: {
      scenario_id: string | null;
      scenario_progress: ScenarioProgress | null;
      scenario_started_at: string | null;
      scenario_completed_at: string | null;
    };
    error?: string;
  }> {
    try {
      const response = await fetch(`/api/chat-sessions/${sessionId}/scenario-progress`);

      if (!response.ok) {
        if (response.status === 404) {
          return { success: true, data: { 
            scenario_id: null, 
            scenario_progress: null, 
            scenario_started_at: null, 
            scenario_completed_at: null 
          }};
        }
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load scenario progress');
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error('Error loading scenario progress:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Clear scenario progress from the database
   */
  async clearScenarioProgress(sessionId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`/api/chat-sessions/${sessionId}/scenario-progress`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to clear scenario progress');
      }

      return { success: true };
    } catch (error) {
      console.error('Error clearing scenario progress:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Mark scenario as completed
   */
  async completeScenario(
    sessionId: string, 
    scenarioProgress: ScenarioProgress
  ): Promise<{ success: boolean; error?: string }> {
    return this.saveScenarioProgress(sessionId, scenarioProgress, true);
  }

  /**
   * Create scenario progress object from current state
   */
  createScenarioProgress(
    scenario: any,
    currentStep: number,
    completedSteps: number[],
    triggeredActions: Record<string, boolean>
  ): ScenarioProgress {
    const now = new Date().toISOString();
    
    return {
      scenario: {
        id: scenario.id,
        title: scenario.title,
        description: scenario.description,
        steps: scenario.steps.map((step: any) => ({
          title: step.title,
          description: step.description,
          actions: step.actions.map((action: any) => ({
            label: action.label,
            prompt: action.prompt,
            agentName: action.agentName || action.agent_name,
            type: action.type
          }))
        }))
      },
      currentStep,
      completedSteps,
      triggeredActions,
      startedAt: now,
      lastUpdatedAt: now
    };
  }

  /**
   * Update scenario progress with new state
   */
  updateScenarioProgress(
    existingProgress: ScenarioProgress,
    currentStep: number,
    completedSteps: number[],
    triggeredActions: Record<string, boolean>
  ): ScenarioProgress {
    return {
      ...existingProgress,
      currentStep,
      completedSteps,
      triggeredActions,
      lastUpdatedAt: new Date().toISOString()
    };
  }
}

// Export a singleton instance
export const scenarioProgressService = new ScenarioProgressService(); 
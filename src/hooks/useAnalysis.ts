import { useState } from 'react';
import type { AnalysisModalState, UploadedFile } from '@/types/chat';

const getBackendUrl = () => {
  return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5002';
};

export function useAnalysis() {
  const [analysisModal, setAnalysisModal] = useState<AnalysisModalState>({
    isOpen: false,
    fileName: null,
    fileType: null,
    analysis: null
  });

  const handleShowAnalysis = async (file: UploadedFile, messages: any[] = []) => {
    if (!file) return { success: false, message: 'No file selected' };
    
    setAnalysisModal({
      isOpen: true,
      fileName: file.name,
      fileType: file.type,
      analysis: null
    });

    try {
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/analyze-file`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file_id: file.id,
          messages: messages
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to analyze file: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Parse the analysis response
      const analysisResult = {
        summary: data.summary || null,
        key_points: data.key_points || null,
        entities: data.entities || null,
        sentiment: data.sentiment || null,
        topics: data.topics || null
      };

      setAnalysisModal(prev => ({
        ...prev,
        analysis: analysisResult
      }));
      
      return { success: true };
    } catch (error) {
      // On error, still provide an error analysis
      setAnalysisModal(prev => ({
        ...prev,
        analysis: {
          summary: `Error analyzing file: ${error instanceof Error ? error.message : 'Unknown error'}`,
          key_points: null,
          entities: null,
          sentiment: null,
          topics: null
        }
      }));
      
      return {
        success: false,
        message: `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  };

  const handleCloseAnalysis = () => {
    setAnalysisModal(prev => ({ ...prev, isOpen: false }));
  };

  return {
    analysisModal,
    handleShowAnalysis,
    handleCloseAnalysis
  };
} 
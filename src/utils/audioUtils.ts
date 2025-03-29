// Audio recording utilities
import { useState, useEffect, useRef } from 'react';

interface UseAudioRecorderProps {
  onRecordingComplete?: (blob: Blob) => void;
  maxDuration?: number; // in milliseconds
}

export const useAudioRecorder = ({
  onRecordingComplete,
  maxDuration = 60000, // default 60 seconds
}: UseAudioRecorderProps = {}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Reset recording state
  const resetRecording = () => {
    audioChunksRef.current = [];
    setAudioBlob(null);
    setError(null);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  // Start recording
  const startRecording = async () => {
    try {
      resetRecording();
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 44100,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        } 
      });
      
      // Try different audio formats in order of preference
      let mimeType = 'audio/wav';
      const formats = ['audio/wav', 'audio/webm', 'audio/mp4', 'audio/ogg'];
      
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        for (const format of formats) {
          if (MediaRecorder.isTypeSupported(format)) {
            mimeType = format;
            break;
          }
        }
      }
      
      if (!mimeType) {
        throw new Error('No supported audio format found');
      }
      
      // Create media recorder with supported format
      const mediaRecorder = new MediaRecorder(stream, { 
        mimeType,
        audioBitsPerSecond: 128000 // Set to 128kbps for better quality
      });
      mediaRecorderRef.current = mediaRecorder;
      
      // Set up data handling
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      
      // Handle recording stop
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { 
          type: mediaRecorder.mimeType 
        });
        setAudioBlob(audioBlob);
        
        // Close media tracks
        stream.getTracks().forEach(track => track.stop());
        
        if (onRecordingComplete) {
          onRecordingComplete(audioBlob);
        }
      };
      
      // Request data frequently for more reliable stopping
      mediaRecorder.start(100); // Get data every 100ms
      setIsRecording(true);
      
      // Set a timeout for max duration
      if (maxDuration > 0) {
        timeoutRef.current = setTimeout(() => {
          if (mediaRecorderRef.current?.state === 'recording') {
            stopRecording();
          }
        }, maxDuration);
      }
    } catch (err) {
      setError('Could not access microphone. Please check permissions.');
      console.error('Error starting recording:', err);
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    isRecording,
    audioBlob,
    error,
    startRecording,
    stopRecording,
    resetRecording
  };
};

// Convert audio blob to base64
export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove prefix like "data:audio/webm;base64," to get only the base64 data
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// Play audio from a URL
export const playAudio = (audioUrl: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const audio = new Audio(audioUrl);
    audio.onended = () => resolve();
    audio.onerror = (error) => reject(error);
    audio.play().catch(reject);
  });
}; 
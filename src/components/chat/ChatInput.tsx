import { useRef, useEffect, useState } from 'react';
import { Send, Loader2, Square } from 'lucide-react';
import type { ChatInputProps } from '@/types/chat';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { DotsIcon } from '@/components/icons/DotsIcon';
import { MicrophoneIcon } from '@/components/icons/MicrophoneIcon';
import { cn } from '@/lib/utils';
import { blobToBase64 } from '@/utils/audioUtils';
import { speechToText } from '@/services/audioService';
import { toast } from 'react-hot-toast';

export function ChatInput({
  value,
  onChange,
  onSend,
  disabled
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  
  // MediaRecorder references
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [value]);

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend(value);
    }
  };
  
  // Start recording
  const startRecording = async () => {
    try {
      let mimeType = null;
      const supportedMimeTypes = [
        'audio/mp4',  // Most compatible with Safari
        'audio/mpeg', // MP3 format
        'audio/wav',  // Uncompressed but widely supported
      ];

      for (const type of supportedMimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          console.log('Found supported MIME type:', type);
          mimeType = type;
          break;
        }
      }

      if (!mimeType) {
        throw new Error('No supported audio format found');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
        }
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000
      });

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          console.log('Received audio chunk, size:', event.data.size);
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        console.log('Recording stopped, blob:', {
          type: audioBlob.type,
          size: audioBlob.size
        });
        
        try {
          setIsTranscribing(true);
          const text = await speechToText(audioBlob);
          if (text) {
            onChange(text);
            setIsRecording(false);
            setIsTranscribing(false);
          }
        } catch (error) {
          console.error('Error processing audio:', error);
          toast.error('Failed to process audio. Please try again.');
          setIsRecording(false);
          setIsTranscribing(false);
        }
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100);
      setIsRecording(true);
      onChange('');
    } catch (error: unknown) {
      console.error('Error starting recording:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setRecordingError('Failed to start recording: ' + errorMessage);
    }
  };
  
  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };
  
  // Handle recording toggle
  const toggleRecording = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      await startRecording();
    }
  };
  
  // Cleanup
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  return (
    <div className="bg-transparent w-full">
      <div 
        style={{
          display: 'flex',
          padding: isMobile ? '12px' : '16px',
          flexDirection: 'column',
          alignItems: 'flex-start',
          alignSelf: 'stretch',
          borderRadius: '16px',
          border: '1px solid var(--Monochrome-Light, #E8E8E5)',
          background: 'var(--Monochrome-White, #FFF)',
          boxShadow: '0px 0px 20px 0px rgba(203, 203, 203, 0.20)'
        }}
      >
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyPress}
          disabled={disabled || isRecording || isTranscribing}
          placeholder={
            disabled ? "Please wait..." : 
            isRecording ? "Recording..." : 
            isTranscribing ? "Transcribing..." :
            "Ask anything, use @ to tag sources"
          }
          rows={1}
          className="w-full resize-none min-h-[44px] border-none shadow-none focus-visible:ring-0 p-0 mb-2"
          style={{ padding: '0', lineHeight: '24px' }}
        />
        
        <div 
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            alignSelf: 'stretch'
          }}
        >
          <button
            style={{
              display: 'flex',
              padding: isMobile ? '6px' : '8px',
              alignItems: 'center',
              gap: '10px',
              borderRadius: '8px',
              background: 'var(--Monochrome-Light, #E8E8E5)',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <DotsIcon />
          </button>
          
          <div className="flex gap-2">
            {/* Recording button */}
            <button
              onClick={toggleRecording}
              disabled={disabled || isTranscribing}
              style={{
                display: 'flex',
                padding: isMobile ? '6px' : '8px',
                alignItems: 'center',
                justifyContent: 'center',
                width: isMobile ? '32px' : '36px',
                height: isMobile ? '32px' : '36px',
                borderRadius: '8px',
                background: isRecording ? 'var(--Error-400, #EF4444)' : 'var(--Monochrome-Superlight, #F2F2ED)',
                border: 'none',
                cursor: 'pointer',
                opacity: (disabled || isTranscribing) ? 0.5 : 1,
                position: 'relative'
              }}
            >
              {isRecording ? (
                <Square className="h-4 w-4 text-white" />
              ) : (
                <MicrophoneIcon className="h-4 w-4" />
              )}
              {isRecording && (
                <span style={{ 
                  position: 'absolute',
                  fontSize: '12px', 
                  fontWeight: 500, 
                  color: 'white',
                  bottom: '-18px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  whiteSpace: 'nowrap'
                }}>
                  Stop
                </span>
              )}
            </button>
            
            {/* Send button */}
            <button
              onClick={() => onSend(value)}
              disabled={disabled || isRecording || isTranscribing || !value.trim()}
              style={{
                display: 'flex',
                padding: isMobile ? '6px' : '8px',
                alignItems: 'center',
                gap: '10px',
                borderRadius: '8px',
                background: 'var(--Monochrome-Superlight, #F2F2ED)',
                border: 'none',
                cursor: 'pointer',
                opacity: (disabled || isRecording || isTranscribing || !value.trim()) ? 0.5 : 1
              }}
            >
              {disabled ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              <span style={{ fontSize: '14px', fontWeight: 500 }}>
                {disabled ? "Processing..." : "Send"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 
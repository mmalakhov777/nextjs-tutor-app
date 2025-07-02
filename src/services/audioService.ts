import { blobToBase64, playAudio } from '@/utils/audioUtils';

// Add a helper function to get the backend URL at the top of the file
const getBackendUrl = () => {
  return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5002';
};

// Define API types
interface SpeechToTextResponse {
  text: string;
  success: boolean;
  error?: string;
}

interface TextToSpeechResponse {
  audio: string; // Base64-encoded audio data
  success: boolean;
  error?: string;
}

// Create a reference to the current audio element for stopping playback
let currentAudioElement: HTMLAudioElement | null = null;

/**
 * Converts speech audio to text using the OpenAI API
 * @param audioBlob The recorded audio as a Blob
 * @returns The transcribed text
 */
export const speechToText = async (audioBlob: Blob): Promise<string> => {
  try {
    console.log('Processing audio:', {
      type: audioBlob.type,
      size: audioBlob.size
    });

    const reader = new FileReader();
    const audioBase64 = await new Promise<string>((resolve, reject) => {
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        console.log('Audio converted to base64, length:', base64.length);
        resolve(base64);
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(audioBlob);
    });

    const backendUrl = getBackendUrl();
    const response = await fetch(`${backendUrl}/api/speech-to-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio_data: audioBase64,
        mime_type: audioBlob.type || 'audio/mp4'
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error('Speech-to-text error response:', errorData);
      throw new Error(errorData?.error || `Speech-to-text failed with status ${response.status}`);
    }

    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error('Error in speechToText:', error);
    throw error;
  }
};

/**
 * Converts text to speech using the OpenAI TTS API
 * @param text The text to convert to speech
 * @param voice The voice to use (default: 'alloy')
 * @returns A URL to the audio file
 */
export async function textToSpeech(
  text: string,
  voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer' = 'nova'
): Promise<string> {
  try {
    // Send to API
    const backendUrl = getBackendUrl();
    const response = await fetch(`${backendUrl}/api/text-to-speech`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        voice,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to generate speech');
    }
    
    const data: TextToSpeechResponse = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Speech generation failed');
    }
    
    // Convert base64 to blob URL
    const audioData = data.audio;
    const audioBlob = base64ToBlob(audioData, 'audio/mpeg');
    const audioUrl = URL.createObjectURL(audioBlob);
    
    return audioUrl;
  } catch (error) {
    console.error('Error in textToSpeech:', error);
    throw error;
  }
}

/**
 * Plays text as speech
 * @param text The text to speak
 * @param voice The voice to use
 * @returns A promise that resolves when audio playback is complete or stopped
 */
export async function speakText(
  text: string,
  voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer' = 'nova'
): Promise<void> {
  try {
    // Stop any currently playing audio first
    stopSpeaking();
    
    const audioUrl = await textToSpeech(text, voice);
    
    // Create a new audio element
    const audio = new Audio(audioUrl);
    currentAudioElement = audio;
    
    // Play the audio
    await new Promise<void>((resolve, reject) => {
      audio.onended = () => {
        currentAudioElement = null;
        URL.revokeObjectURL(audioUrl);
        resolve();
      };
      
      audio.onerror = (error) => {
        currentAudioElement = null;
        URL.revokeObjectURL(audioUrl);
        reject(error);
      };
      
      // Handle if playback is aborted
      audio.onabort = () => {
        URL.revokeObjectURL(audioUrl);
        resolve();
      };
      
      audio.play().catch(error => {
        currentAudioElement = null;
        URL.revokeObjectURL(audioUrl);
        reject(error);
      });
    });
    
  } catch (error) {
    console.error('Error in speakText:', error);
    throw error;
  }
}

/**
 * Stops any currently playing audio
 */
export function stopSpeaking(): void {
  if (currentAudioElement) {
    currentAudioElement.pause();
    currentAudioElement.currentTime = 0;
    currentAudioElement = null;
  }
}

/**
 * Checks if audio is currently playing
 * @returns True if audio is playing, false otherwise
 */
export function isAudioPlaying(): boolean {
  return currentAudioElement !== null && 
         !currentAudioElement.paused && 
         currentAudioElement.currentTime > 0;
}

/**
 * Converts base64 string to a Blob
 * @param base64 Base64-encoded string
 * @param mimeType MIME type of the data
 * @returns Blob representation of the data
 */
function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64);
  const byteArrays = [];
  
  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }
  
  return new Blob(byteArrays, { type: mimeType });
} 
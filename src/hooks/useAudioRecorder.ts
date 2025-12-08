import { useState, useRef, useCallback } from 'react';

interface AudioRecorderHook {
  isRecording: boolean;
  startRecording: (onData: (data: ArrayBuffer) => void) => Promise<void>;
  stopRecording: () => void;
  error: string | null;
}

export function useAudioRecorder(): AudioRecorderHook {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);

  // Define stopRecording first so it can be used in startRecording
  const stopRecording = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Disconnect and clean up nodes
    if (workletNodeRef.current) {
      workletNodeRef.current.port.onmessage = null;
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    
    // Close context
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    setIsRecording(false);
  }, []);

  const startRecording = useCallback(async (onData: (data: ArrayBuffer) => void) => {
    try {
      setError(null);

      // Guard for Server-Side Rendering (SSR)
      if (typeof window === 'undefined' || !navigator) {
        throw new Error('Audio recording not supported on server');
      }

      // Guard for Secure Context / API Availability
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone access not supported. Ensure you are on HTTPS or localhost.');
      }
      
      // 1. Get Microphone Stream with Fallback Strategy
      let stream: MediaStream;
      
      try {
        // Attempt 1: High Quality Constraints
        stream = await navigator.mediaDevices.getUserMedia({ 
          audio: { 
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          } 
        });
      } catch (e) {
        console.warn('High quality audio constraints failed, falling back to basic audio', e);
        // Attempt 2: Basic Audio (Fallback)
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      
      streamRef.current = stream;

      // 2. Create Audio Context without forcing sampleRate
      const audioContext = new AudioContext(); 
      audioContextRef.current = audioContext;

      console.log('Audio Context Sample Rate:', audioContext.sampleRate);

      // 3. Load AudioWorklet
      try {
          await audioContext.audioWorklet.addModule('/audio-processor.js');
      } catch (e) {
          console.error('Failed to load audio worklet:', e);
          throw new Error('Failed to load audio processor');
      }

      // 4. Create Nodes
      const source = audioContext.createMediaStreamSource(stream);
      sourceNodeRef.current = source;

      const worklet = new AudioWorkletNode(audioContext, 'audio-processor');
      workletNodeRef.current = worklet;

      // 5. Handle Data from Worklet
      worklet.port.onmessage = (event) => {
        if (event.data.event === 'audio-input' && event.data.pcmData) {
            onData(event.data.pcmData);
        }
      };

      // 6. Connect Graph
      source.connect(worklet);
      worklet.connect(audioContext.destination); 

      setIsRecording(true);
    } catch (err: unknown) {
      console.error('Failed to start recording', err);
      
      // Type-safe error handling
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      const errorName = err instanceof DOMException ? err.name : '';
      
      // Provide specific user-friendly messages based on error type
      if (errorMessage.includes('Microphone access not supported')) {
        setError(errorMessage);
      } else if (errorName === 'NotAllowedError') {
        setError('Microphone permission denied. Please allow access in browser settings.');
      } else if (errorName === 'NotFoundError') {
        setError('No microphone found. Please connect a microphone.');
      } else if (errorName === 'NotReadableError') {
        setError('Microphone is in use by another app. Please close it and try again.');
      } else if (errorName === 'OverconstrainedError') {
        setError('Microphone constraints not supported by your device.');
      } else {
        setError('Could not access microphone: ' + errorMessage);
      }
      stopRecording();
    }
  }, [stopRecording]);

  return { isRecording, startRecording, stopRecording, error };
}

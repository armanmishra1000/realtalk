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
      
      // 1. Get Microphone Stream
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          // sampleRate: 16000 // Removed to let browser decide native hardware rate
        } 
      });
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
    } catch (err: any) {
      console.error('Failed to start recording', err);
      // Differentiate errors
      if (err.message.includes('Microphone access not supported')) {
          setError(err.message);
      } else if (err.name === 'NotAllowedError') {
          setError('Microphone permission denied. Please allow access.');
      } else if (err.name === 'NotFoundError') {
          setError('No microphone found.');
      } else {
          setError('Could not access microphone: ' + (err.message || 'Unknown error'));
      }
      stopRecording();
    }
  }, [stopRecording]);

  return { isRecording, startRecording, stopRecording, error };
}

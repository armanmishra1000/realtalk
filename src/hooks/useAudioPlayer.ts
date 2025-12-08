import { useRef, useCallback } from 'react';

export function useAudioPlayer() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  
  // Initialize context lazily (user gesture required usually)
  const ensureContext = useCallback(() => {
    if (!audioContextRef.current) {
      // Allow browser to pick native sample rate (e.g. 48kHz or 44.1kHz)
      // forcing 24kHz can break on mobile
      audioContextRef.current = new AudioContext(); 
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  const playChunk = useCallback((pcmData: ArrayBuffer) => {
    const ctx = ensureContext();
    if (!ctx) return;

    // Convert Int16 ArrayBuffer to Float32 for AudioBuffer
    const int16Array = new Int16Array(pcmData);
    const float32Array = new Float32Array(int16Array.length);
    
    // Normalize Int16 to Float32 [-1, 1]
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768.0;
    }

    // Create a buffer at 24kHz (Gemini's output rate)
    // The AudioContext (running at e.g. 48kHz) will automatically resample this during playback
    const buffer = ctx.createBuffer(1, float32Array.length, 24000); 
    buffer.copyToChannel(float32Array, 0);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);

    const currentTime = ctx.currentTime;
    // Schedule play
    let startTime = nextStartTimeRef.current;
    
    // If we fell behind (gap > 0.5s) or first chunk, reset start time to now
    // This prevents huge delays if the network lags
    if (startTime < currentTime || (currentTime - startTime) > 0.5) {
      startTime = currentTime;
    }

    source.start(startTime);
    nextStartTimeRef.current = startTime + buffer.duration;
  }, [ensureContext]);

  const stop = useCallback(() => {
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    nextStartTimeRef.current = 0;
  }, []);

  return { playChunk, stop };
}

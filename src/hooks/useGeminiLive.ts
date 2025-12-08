import { useState, useRef, useCallback, useEffect } from 'react';
import { useAudioRecorder } from './useAudioRecorder';
import { useAudioPlayer } from './useAudioPlayer';
import { useAppStore } from '@/lib/store';
import { Message } from '@/lib/types';
import { generateId } from '@/lib/utils';

const MODEL = 'models/gemini-2.0-flash-exp';

function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export function useGeminiLive() {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const { isRecording, startRecording, stopRecording, error: recordError } = useAudioRecorder();
  const { playChunk, stop: stopPlayer } = useAudioPlayer();
  const { settings, currentScenario } = useAppStore();

  const connect = useCallback(() => {
    return new Promise<void>((resolve, reject) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }
      if (!settings.apiKey) {
        reject(new Error('API Key missing'));
        return;
      }

      const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${settings.apiKey}`;
      const ws = new WebSocket(url);

      ws.onopen = () => {
        console.log('Connected to Gemini Live');
        setIsConnected(true);
        
        let systemPrompt = `You are a helpful language tutor. 
                       The user's native language is ${settings.nativeLanguage}. 
                       They are learning ${settings.targetLanguage}. 
                       Accent preference: ${settings.accent}.
                       Be encouraging, correct their mistakes gently, and keep the conversation flowing.
                       If they speak in their native language, translate and guide them.`;
  
        if (currentScenario) {
          systemPrompt += `\n\nSCENARIO MODE ACTIVE:
          Topic: ${currentScenario.topic}
          Role: ${currentScenario.aiRole}
          User Role: ${currentScenario.userRole}
          Level: ${currentScenario.level}
          Context: ${currentScenario.description}`;
        }
        
        // Send Setup Message
        const setupMsg = {
          setup: {
            model: MODEL,
            generationConfig: {
              responseModalities: ['AUDIO'], // Removed TEXT to avoid 1007/400 error
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: 'Puck'
                  }
                }
              }
            },
            systemInstruction: {
              parts: [{ 
                text: systemPrompt
              }]
            }
          }
        };
        console.log('Sending Setup Message:', JSON.stringify(setupMsg, null, 2));
        ws.send(JSON.stringify(setupMsg));
        resolve();
      };
  
      ws.onmessage = async (event) => {
        let data = event.data;
        
        if (data instanceof Blob) {
          data = await data.text();
        }
  
        try {
          // console.log('Received WebSocket Message:', data); // Too verbose, only log if needed
          const response = JSON.parse(data as string);
          
          if (response.serverContent) {
            const { modelTurn, turnComplete } = response.serverContent;

            if (turnComplete) {
                // console.log("Turn Complete");
            }

            if (modelTurn?.parts) {
              for (const part of modelTurn.parts) {
                if (part.text) {
                  setMessages(prev => {
                    const lastMsg = prev[prev.length - 1];
                    if (lastMsg && lastMsg.role === 'model' && (Date.now() - lastMsg.timestamp < 5000)) {
                        // If we are appending text to an existing audio message, ensure we don't overwrite isAudioMessage if we want to keep the waveform
                        // actually, if text comes, we should show text. 
                        return prev.map((msg, i) => i === prev.length - 1 ? { ...msg, text: msg.text + part.text } : msg);
                    }
                     return [...prev, { id: generateId(), role: 'model', text: part.text, timestamp: Date.now() }];
                  });
                }
                if (part.inlineData && part.inlineData.mimeType.startsWith('audio/pcm')) {
                  const base64 = part.inlineData.data;
                  const binaryString = atob(base64);
                  const len = binaryString.length;
                  const bytes = new Uint8Array(len);
                  for (let i = 0; i < len; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                  }
                  playChunk(bytes.buffer);

                  // Update UI to show audio message bubble if no text is present
                  setMessages(prev => {
                    const lastMsg = prev[prev.length - 1];
                    if (lastMsg && lastMsg.role === 'model' && (Date.now() - lastMsg.timestamp < 5000)) {
                        if (!lastMsg.isAudioMessage) {
                             return prev.map((msg, i) => i === prev.length - 1 ? { ...msg, isAudioMessage: true } : msg);
                        }
                        return prev;
                    }
                    // Create new placeholder message for audio
                    return [...prev, { 
                        id: generateId(), 
                        role: 'model', 
                        text: '', // Empty text, UI will handle isAudioMessage
                        timestamp: Date.now(),
                        isAudioMessage: true 
                    }];
                  });
                }
              }
            }
          }
        } catch (e) {
          console.error('Error parsing WebSocket message', e);
        }
      };
  
      ws.onclose = (e) => {
        console.log('Disconnected', e.code, e.reason);
        console.error('WebSocket Close Code:', e.code);
        console.error('WebSocket Close Reason:', e.reason);
        setIsConnected(false);
        // Auto-reconnect logic could go here if needed, but careful with loops
      };
  
      ws.onerror = (err) => {
        console.error('WebSocket Error Details:', err);
        // Only reject if we are still connecting
        if (ws.readyState === WebSocket.CONNECTING) {
            reject(err);
        }
      };
  
      wsRef.current = ws;
    });
  }, [settings, playChunk, currentScenario]);

  const disconnect = useCallback(() => {
    stopRecording();
    stopPlayer();
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, [stopRecording, stopPlayer]);

  // Initialize Speech Recognition for User Text Fallback
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = settings.targetLanguage === 'Spanish' ? 'es-ES' : 'en-US'; // Simple mapping for prototype
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onresult = (event: any) => {
            const transcript = event.results[event.results.length - 1][0].transcript;
            if (transcript) {
                setMessages(prev => [...prev, { id: generateId(), role: 'user', text: transcript, timestamp: Date.now() }]);
            }
        };
        recognitionRef.current = recognition;
      }
    }
  }, [settings.targetLanguage]);

  const toggleRecording = useCallback(async () => {
    if (isRecording) {
      stopRecording();
      if (recognitionRef.current) {
          recognitionRef.current.stop();
      }
    } else {
      try {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          await connect();
        }
        
        // Start Web Speech API
        if (recognitionRef.current) {
            try {
                recognitionRef.current.start();
            } catch (e) {
                console.error("Speech recognition error", e);
            }
        }

        await startRecording((pcmData) => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
             const base64 = arrayBufferToBase64(pcmData);
             const msg = {
               realtime_input: {
                 media_chunks: [{
                   mime_type: 'audio/pcm',
                   data: base64
                 }]
               }
             };
             wsRef.current.send(JSON.stringify(msg));
          }
        });
      } catch (err) {
        console.error('Failed to start recording session:', err);
      }
    }
  }, [isRecording, startRecording, stopRecording, connect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
        disconnect();
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
    };
  }, [disconnect]);

  return {
    isConnected,
    isRecording,
    messages,
    toggleRecording,
    connect,
    disconnect,
    error: recordError
  };
}

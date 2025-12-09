import { useState, useRef, useCallback, useEffect } from 'react';
import { useAudioRecorder } from './useAudioRecorder';
import { useAudioPlayer } from './useAudioPlayer';
import { useAppStore } from '@/lib/store';
import { Message } from '@/lib/types';
import { generateId } from '@/lib/utils';

const MODEL = 'models/gemini-2.5-flash-native-audio-preview-09-2025';

// Available voice options for natural-sounding speech
type GeminiVoiceName = 
  | 'Aoede'      // Breezy - natural casual conversation
  | 'Sulafat'    // Warm - friendly and comforting
  | 'Achird'     // Friendly - approachable
  | 'Vindemiatrix' // Gentle - soft interactions
  | 'Puck'       // Upbeat - energetic
  | 'Kore'       // Firm
  | 'Charon';    // Informative

const VOICE_NAME: GeminiVoiceName = 'Aoede';

// Type definitions for Gemini Live API messages
interface GeminiServerContent {
  modelTurn?: {
    parts?: Array<{
      text?: string;
      inlineData?: {
        mimeType: string;
        data: string;
      };
    }>;
  };
  turnComplete?: boolean;
  interrupted?: boolean;
  inputTranscription?: { text: string };
  outputTranscription?: { text: string };
}

interface GeminiServerMessage {
  setupComplete?: Record<string, never>;
  serverContent?: GeminiServerContent;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
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
        
        let systemPrompt = `You are a warm, friendly language tutor having a casual conversation.

PERSONALITY:
- Speak naturally like a real person, not a formal teacher
- Use conversational tone with natural pauses and rhythm
- Keep responses concise (1-3 sentences usually)
- Match the user's energy and pace
- Be encouraging but not overly enthusiastic

LANGUAGE CONTEXT:
- User's native language: ${settings.nativeLanguage}
- Learning: ${settings.targetLanguage}
- Accent preference: ${settings.accent}

TEACHING STYLE:
- Correct mistakes gently by naturally rephrasing
- If they speak in their native language, help translate naturally
- Keep the conversation flowing like chatting with a friend`;
  
        if (currentScenario) {
          systemPrompt += `\n\nSCENARIO MODE ACTIVE:
          Topic: ${currentScenario.topic}
          Role: ${currentScenario.aiRole}
          User Role: ${currentScenario.userRole}
          Level: ${currentScenario.level}
          Context: ${currentScenario.description}`;
        }
        
        // Send Setup Message with transcription enabled
        const setupMsg = {
          setup: {
            model: MODEL,
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: VOICE_NAME
                  }
                }
              }
            },
            systemInstruction: {
              parts: [{ 
                text: systemPrompt
              }]
            },
            // Enable transcription for both input and output audio
            inputAudioTranscription: {},
            outputAudioTranscription: {}
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
          const response = JSON.parse(data as string) as GeminiServerMessage;
          
          // Handle setup complete - send greeting prompt to trigger AI response
          if (response.setupComplete) {
            console.log('Setup complete, sending greeting prompt');
            const greetingMsg = {
              clientContent: {
                turns: [{
                  role: 'user',
                  parts: [{ 
                    text: `Greet me warmly in ${settings.targetLanguage}. Introduce yourself as my friendly language tutor. Keep it brief and natural.`
                  }]
                }],
                turnComplete: true
              }
            };
            ws.send(JSON.stringify(greetingMsg));
            return;
          }
          
          if (response.serverContent) {
            const { modelTurn, inputTranscription, outputTranscription } = response.serverContent;

            // Handle user's speech transcription (real-time)
            if (inputTranscription?.text) {
              const transcript = inputTranscription.text.trim();
              if (transcript) {
                setMessages(prev => {
                  const lastMsg = prev[prev.length - 1];
                  // Append to existing user message if recent
                  if (lastMsg && lastMsg.role === 'user' && (Date.now() - lastMsg.timestamp < 3000)) {
                    return prev.map((msg, i) => 
                      i === prev.length - 1 ? { ...msg, text: msg.text + ' ' + transcript } : msg
                    );
                  }
                  return [...prev, { id: generateId(), role: 'user', text: transcript, timestamp: Date.now() }];
                });
              }
            }

            // Handle AI's speech transcription (real-time)
            if (outputTranscription?.text) {
              const transcript = outputTranscription.text.trim();
              if (transcript) {
                setMessages(prev => {
                  const lastMsg = prev[prev.length - 1];
                  // Append to existing model message if recent
                  if (lastMsg && lastMsg.role === 'model' && (Date.now() - lastMsg.timestamp < 5000)) {
                    return prev.map((msg, i) => 
                      i === prev.length - 1 ? { ...msg, text: msg.text + transcript, isAudioMessage: false } : msg
                    );
                  }
                  return [...prev, { id: generateId(), role: 'model', text: transcript, timestamp: Date.now() }];
                });
              }
            }

            // Handle audio data from model
            if (modelTurn?.parts) {
              for (const part of modelTurn.parts) {
                if (part.inlineData && part.inlineData.mimeType.startsWith('audio/pcm')) {
                  const base64 = part.inlineData.data;
                  const binaryString = atob(base64);
                  const len = binaryString.length;
                  const bytes = new Uint8Array(len);
                  for (let i = 0; i < len; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                  }
                  playChunk(bytes.buffer);

                  // Create placeholder if no transcription yet
                  setMessages(prev => {
                    const lastMsg = prev[prev.length - 1];
                    if (lastMsg && lastMsg.role === 'model' && (Date.now() - lastMsg.timestamp < 5000)) {
                      return prev;
                    }
                    return [...prev, { 
                      id: generateId(), 
                      role: 'model', 
                      text: '',
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

  const toggleRecording = useCallback(async () => {
    if (isRecording) {
      stopRecording();
    } else {
      try {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          await connect();
        }

        await startRecording((pcmData) => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            const base64 = arrayBufferToBase64(pcmData);
            // Use current API format (not deprecated media_chunks)
            const msg = {
              realtimeInput: {
                audio: {
                  mimeType: 'audio/pcm;rate=16000',
                  data: base64
                }
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

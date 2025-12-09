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

export type ConversationState = 'idle' | 'starting' | 'active';

export function useGeminiLive() {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationState, setConversationState] = useState<ConversationState>('idle');
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
        
        let systemPrompt = `You're a friendly chat buddy helping someone practice ${settings.targetLanguage}.

RULES:
- Keep responses SHORT (1-2 sentences max)
- Talk like a friend, not a teacher
- Be casual and fun
- If they make mistakes, gently correct by naturally rephrasing
- Ask simple questions to keep the chat going
- User speaks ${settings.nativeLanguage} natively`;
  
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
                    text: `Say hi in ${settings.targetLanguage} and ask me one simple question to start chatting. Keep it under 2 sentences.`
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
                  // Append to existing user message if recent (add space between chunks)
                  if (lastMsg && lastMsg.role === 'user' && (Date.now() - lastMsg.timestamp < 3000)) {
                    return prev.map((msg, i) => 
                      i === prev.length - 1 ? { ...msg, text: (msg.text + ' ' + transcript).trim() } : msg
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
                  // Append to existing model message if recent (add space between chunks)
                  if (lastMsg && lastMsg.role === 'model' && (Date.now() - lastMsg.timestamp < 5000)) {
                    return prev.map((msg, i) => 
                      i === prev.length - 1 ? { ...msg, text: (msg.text + ' ' + transcript).trim(), isAudioMessage: false } : msg
                    );
                  }
                  return [...prev, { id: generateId(), role: 'model', text: transcript, timestamp: Date.now() }];
                });
                // Set conversation to active when AI starts responding
                setConversationState('active');
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
        if (e.code === 1000) {
          console.log('Gemini Live disconnected normally (Code 1000)');
        } else {
          console.error('Gemini Live disconnected unexpectedly', {
            code: e.code,
            reason: e.reason
          });
        }
        setIsConnected(false);
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
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close(1000, 'User initiated disconnect');
      }
      wsRef.current = null;
    }
    setIsConnected(false);
    setConversationState('idle');
    setMessages([]);
  }, [stopRecording, stopPlayer]);

  // Start conversation - connects and triggers AI greeting
  const startConversation = useCallback(async () => {
    if (conversationState !== 'idle') return;
    
    setConversationState('starting');
    try {
      await connect();
    } catch (err) {
      console.error('Failed to start conversation:', err);
      setConversationState('idle');
    }
  }, [conversationState, connect]);

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
    conversationState,
    toggleRecording,
    startConversation,
    connect,
    disconnect,
    error: recordError
  };
}

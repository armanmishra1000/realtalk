'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useGeminiLive } from '@/hooks/useGeminiLive';
import { AudioVisualizer } from '@/components/visualizer/AudioVisualizer';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAppStore } from '@/lib/store';
import { translateText } from '@/lib/gemini';
import { generateId } from '@/lib/utils';
import { Mic, MicOff, Languages, Plus, AlertCircle, Play, Loader2 } from 'lucide-react';

export default function SpeakPage() {
  const { isConnected, isRecording, messages, conversationState, toggleRecording, startConversation, error } = useGeminiLive();
  const { settings, updateSettings, addVocabulary } = useAppStore();
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [translatedTexts, setTranslatedTexts] = useState<Record<string, string>>({});
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSaveApiKey = () => {
    if (apiKeyInput.trim()) {
      updateSettings({ apiKey: apiKeyInput.trim() });
    }
  };

  const handleAddToVocab = (text: string) => {
    const timestamp = Date.now();
    addVocabulary({
      id: generateId(),
      original: text,
      translated: '',
      createdAt: timestamp
    });
    alert('Saved to Vocabulary');
  };

  const handleTranslate = async (id: string, text: string) => {
    if (!settings.apiKey) return;
    const translation = await translateText(text, settings.nativeLanguage, settings.apiKey);
    setTranslatedTexts(prev => ({ ...prev, [id]: translation }));
  };

  if (!settings.apiKey) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center space-y-4 text-center p-4">
        <AlertCircle className="h-12 w-12 text-yellow-500" />
        <h2 className="text-xl font-bold">Setup Required</h2>
        <p className="text-gray-500 max-w-xs">
          Enter your Google Gemini API Key to start speaking.
        </p>
        <div className="w-full max-w-xs space-y-2">
          <Input 
            type="password" 
            placeholder="Paste API Key here" 
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
          />
          <Button onClick={handleSaveApiKey} className="w-full">
            Connect
          </Button>
          <p className="text-xs text-gray-400">
            Get one at <a href="https://aistudio.google.com/app/apikey" target="_blank" className="underline text-blue-500">Google AI Studio</a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 relative">
      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 pb-32 space-y-4">
        {/* Idle State - Show Start Button */}
        {conversationState === 'idle' && messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Ready to practice?</h2>
              <p className="text-gray-500 text-sm">Tap Start to begin chatting</p>
            </div>
            <Button
              onClick={startConversation}
              className="h-16 px-8 rounded-full bg-green-500 hover:bg-green-600 text-white font-medium text-lg shadow-lg hover:scale-105 transition-all"
            >
              <Play size={24} className="mr-2" />
              Start
            </Button>
          </div>
        )}

        {/* Starting State - Show Loading */}
        {conversationState === 'starting' && messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <Loader2 size={40} className="text-blue-500 animate-spin mb-4" />
            <p className="text-gray-500">Starting conversation...</p>
          </div>
        )}
        
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2 fade-in duration-300`}
          >
            <div 
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-br-none' 
                  : 'bg-white text-gray-800 rounded-bl-none border border-gray-100'
              }`}
            >
              {msg.isAudioMessage && !msg.text ? (
                 <div className="flex items-center gap-2 text-blue-600">
                    <div className="flex gap-1 h-4 items-center">
                        <span className="w-1 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                        <span className="w-1 h-4 bg-blue-500 rounded-full animate-pulse delay-75"></span>
                        <span className="w-1 h-2 bg-blue-500 rounded-full animate-pulse delay-150"></span>
                    </div>
                    <span className="text-xs font-medium">Audio Message</span>
                 </div>
              ) : msg.text}
            </div>
            
            {/* AI Message Actions */}
            {msg.role === 'model' && (
              <div className="mt-1 flex gap-3 px-1">
                 <button 
                   onClick={() => handleTranslate(msg.id, msg.text)}
                   className="flex items-center text-[10px] font-medium text-gray-400 hover:text-blue-600 transition-colors"
                 >
                   <Languages size={12} className="mr-1" /> Translate
                 </button>
                 <button 
                   onClick={() => handleAddToVocab(msg.text)}
                   className="flex items-center text-[10px] font-medium text-gray-400 hover:text-blue-600 transition-colors"
                 >
                   <Plus size={12} className="mr-1" /> Save
                 </button>
              </div>
            )}

            {/* Translation Result */}
            {translatedTexts[msg.id] && (
              <div className="mt-2 max-w-[85%] rounded-xl bg-yellow-50 px-3 py-2 text-xs text-yellow-800 border border-yellow-100 animate-in fade-in">
                {translatedTexts[msg.id]}
              </div>
            )}
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* Floating Bottom Bar - Only show when conversation is active */}
      {conversationState === 'active' && (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-transparent pt-12">
          {/* Error Display */}
          {error && (
            <div className="mb-2 text-center">
              <span className="inline-block px-3 py-1 rounded-full bg-red-100 text-red-600 text-xs font-medium">
                {error}
              </span>
            </div>
          )}

          <div className="flex items-center justify-center gap-4">
            {/* Status Indicator / Mini Visualizer */}
            <div className={`flex-1 h-12 rounded-full bg-white border border-gray-200 shadow-lg flex items-center px-4 overflow-hidden transition-all ${isRecording ? 'ring-2 ring-blue-100 border-blue-200' : ''}`}>
              {isRecording || isConnected ? (
                <AudioVisualizer 
                  isActive={isRecording}
                  mode={isRecording ? 'speaking' : 'listening'}
                  className="w-full h-8"
                />
              ) : (
                <span className="text-gray-400 text-sm w-full text-center">Tap mic to speak</span>
              )}
            </div>

            {/* Main Mic Button */}
            <Button
              size="icon"
              className={`h-16 w-16 rounded-full shadow-xl transition-all duration-300 ${
                isRecording 
                  ? 'bg-red-500 hover:bg-red-600 scale-110 animate-pulse' 
                  : 'bg-blue-600 hover:bg-blue-700 hover:scale-105'
              }`}
              onClick={toggleRecording}
            >
              {isRecording ? (
                <MicOff size={28} className="text-white" />
              ) : (
                <Mic size={28} className="text-white" />
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

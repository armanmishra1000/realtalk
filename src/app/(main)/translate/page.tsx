'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { translateText } from '@/lib/gemini';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { ArrowRightLeft, Copy, Check } from 'lucide-react';

const LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Hindi', 'Japanese', 'Chinese', 'Russian', 'Arabic', 'Portuguese'];

export default function TranslatePage() {
  const { settings } = useAppStore();
  const [sourceText, setSourceText] = useState('');
  const [targetText, setTargetText] = useState('');
  const [sourceLang, setSourceLang] = useState(settings.nativeLanguage || 'English');
  const [targetLang, setTargetLang] = useState(settings.targetLanguage || 'Spanish');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleTranslate = async () => {
    if (!sourceText.trim() || !settings.apiKey) return;
    
    setIsLoading(true);
    const result = await translateText(sourceText, targetLang, settings.apiKey);
    setTargetText(result);
    setIsLoading(false);
  };

  const handleSwapLanguages = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    setSourceText(targetText);
    setTargetText(sourceText);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(targetText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex h-full flex-col space-y-4">
      <h2 className="text-xl font-bold">Translate</h2>

      <Card className="flex-1 overflow-hidden border-0 shadow-none">
        <CardContent className="flex h-full flex-col space-y-4 p-0">
          
          {/* Language Selectors */}
          <div className="flex items-center justify-between rounded-xl bg-gray-50 p-2">
            <select 
              className="bg-transparent text-sm font-medium focus:outline-none"
              value={sourceLang}
              onChange={(e) => setSourceLang(e.target.value)}
            >
              {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
            </select>

            <Button variant="ghost" size="icon" onClick={handleSwapLanguages} className="h-8 w-8">
              <ArrowRightLeft size={16} />
            </Button>

            <select 
              className="bg-transparent text-sm font-medium focus:outline-none text-right"
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
            >
              {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          {/* Input Area */}
          <div className="flex-1">
            <textarea
              className="h-full w-full resize-none border-0 text-lg focus:ring-0 p-4"
              placeholder="Enter text..."
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
            />
          </div>

          {/* Action Button */}
          <div className="px-4">
            <Button 
              className="w-full" 
              onClick={handleTranslate} 
              disabled={isLoading || !sourceText}
            >
              {isLoading ? 'Translating...' : 'Translate'}
            </Button>
          </div>

          {/* Output Area */}
          <div className="flex-1 bg-blue-50/50 p-4 rounded-xl relative">
            {targetText ? (
              <>
                <p className="text-lg text-blue-900">{targetText}</p>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute bottom-2 right-2 text-blue-400 hover:text-blue-600"
                  onClick={copyToClipboard}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </Button>
              </>
            ) : (
              <p className="text-sm text-gray-400">Translation will appear here</p>
            )}
          </div>

        </CardContent>
      </Card>
    </div>
  );
}

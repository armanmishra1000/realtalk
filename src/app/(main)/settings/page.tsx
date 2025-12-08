'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Save, Globe, Key } from 'lucide-react';

export default function SettingsPage() {
  const { settings, updateSettings } = useAppStore();
  const [formData, setFormData] = useState({
    nativeLanguage: '',
    targetLanguage: '',
    accent: '',
    apiKey: '',
  });

  useEffect(() => {
    // Sync local state with global settings on mount or update
    // Using setTimeout to avoid synchronous setState warning during render phase checks
    const timer = setTimeout(() => {
        setFormData(prev => {
            if (
              prev.nativeLanguage === settings.nativeLanguage &&
              prev.targetLanguage === settings.targetLanguage &&
              prev.accent === settings.accent &&
              prev.apiKey === (settings.apiKey || '')
            ) {
              return prev;
            }
            return {
              nativeLanguage: settings.nativeLanguage,
              targetLanguage: settings.targetLanguage,
              accent: settings.accent,
              apiKey: settings.apiKey || '',
            };
          });
    }, 0);
    return () => clearTimeout(timer);
  }, [settings]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(formData);
    alert('Settings Saved!');
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Language Environment</h2>

      <form onSubmit={handleSave} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-base">
              <Globe className="mr-2 h-4 w-4" /> Learning Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">I speak (Native Language)</label>
              <select 
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.nativeLanguage}
                onChange={(e) => setFormData({...formData, nativeLanguage: e.target.value})}
              >
                <option value="English">English</option>
                <option value="Hindi">Hindi</option>
                <option value="Spanish">Spanish</option>
                <option value="French">French</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">I want to learn (Target Language)</label>
              <select 
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.targetLanguage}
                onChange={(e) => setFormData({...formData, targetLanguage: e.target.value})}
              >
                <option value="English">English</option>
                <option value="Spanish">Spanish</option>
                <option value="French">French</option>
                <option value="German">German</option>
                <option value="Japanese">Japanese</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Preferred Accent</label>
              <select 
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.accent}
                onChange={(e) => setFormData({...formData, accent: e.target.value})}
              >
                <option value="American">American</option>
                <option value="British">British</option>
                <option value="Indian">Indian</option>
                <option value="Australian">Australian</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-base">
              <Key className="mr-2 h-4 w-4" /> API Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="space-y-2">
              <label className="text-sm font-medium">Gemini API Key</label>
              <Input 
                type="password"
                value={formData.apiKey}
                onChange={(e) => setFormData({...formData, apiKey: e.target.value})}
                placeholder="Enter your API Key"
              />
              <p className="text-xs text-gray-400">
                Required for AI features. Your key is stored locally on your device.
              </p>
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" size="lg">
          <Save className="mr-2 h-4 w-4" /> Save Changes
        </Button>
      </form>
    </div>
  );
}

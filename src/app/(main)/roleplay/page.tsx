'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { RoleplayScenario } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { generateId } from '@/lib/utils';
import { Sparkles, Briefcase, Coffee, MapPin, Plus, ArrowLeft } from 'lucide-react';

const PREDEFINED_SCENARIOS: RoleplayScenario[] = [
  {
    id: 'coffee-shop',
    title: 'Ordering Coffee',
    description: 'Order a latte and a croissant at a busy cafe.',
    aiRole: 'Barista',
    userRole: 'Customer',
    level: 'beginner',
    topic: 'Food & Drink',
  },
  {
    id: 'job-interview',
    title: 'Job Interview',
    description: 'Interview for a software engineer position.',
    aiRole: 'Hiring Manager',
    userRole: 'Candidate',
    level: 'advanced',
    topic: 'Business',
  },
  {
    id: 'asking-directions',
    title: 'Asking Directions',
    description: 'You are lost in Tokyo and need to find the train station.',
    aiRole: 'Local',
    userRole: 'Tourist',
    level: 'intermediate',
    topic: 'Travel',
  },
];

export default function RoleplayPage() {
  const router = useRouter();
  const { setScenario } = useAppStore();
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    aiRole: '',
    userRole: '',
    topic: '',
    level: 'intermediate' as 'beginner' | 'intermediate' | 'advanced',
    context: '',
  });

  const handleStart = (scenario: RoleplayScenario) => {
    setScenario(scenario);
    router.push('/speak');
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newScenario: RoleplayScenario = {
      id: generateId(),
      title: 'Custom Scenario',
      description: formData.context,
      aiRole: formData.aiRole,
      userRole: formData.userRole,
      level: formData.level,
      topic: formData.topic,
    };
    handleStart(newScenario);
  };

  if (isCreating) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setIsCreating(false)}>
            <ArrowLeft size={20} />
          </Button>
          <h2 className="text-xl font-bold">Create Scenario</h2>
        </div>

        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">AI Role (Required)</label>
            <Input 
              required 
              value={formData.aiRole}
              onChange={(e) => setFormData({...formData, aiRole: e.target.value})}
              placeholder="e.g., Shopkeeper, Doctor"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Your Role</label>
            <Input 
              value={formData.userRole}
              onChange={(e) => setFormData({...formData, userRole: e.target.value})}
              placeholder="e.g., Customer, Patient"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Topic</label>
            <Input 
              value={formData.topic}
              onChange={(e) => setFormData({...formData, topic: e.target.value})}
              placeholder="e.g., Shopping, Health"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Level</label>
            <select 
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.level}
              onChange={(e) => setFormData({...formData, level: e.target.value as 'beginner' | 'intermediate' | 'advanced'})}
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Context / Situation</label>
            <textarea 
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
              value={formData.context}
              onChange={(e) => setFormData({...formData, context: e.target.value})}
              placeholder="Describe the situation..."
            />
          </div>
          <Button type="submit" className="w-full">Start Roleplay</Button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Choose a Scenario</h2>
        <Button size="sm" onClick={() => setIsCreating(true)}>
          <Plus size={16} className="mr-1" /> Create
        </Button>
      </div>

      <div className="grid gap-4">
        {PREDEFINED_SCENARIOS.map((scenario) => (
          <Card 
            key={scenario.id} 
            className="cursor-pointer hover:border-blue-200 hover:shadow-md transition-all"
            onClick={() => handleStart(scenario)}
          >
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <div className="mr-4 flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                {scenario.id === 'coffee-shop' && <Coffee size={20} />}
                {scenario.id === 'job-interview' && <Briefcase size={20} />}
                {scenario.id === 'asking-directions' && <MapPin size={20} />}
              </div>
              <div className="flex-1">
                <CardTitle className="text-base">{scenario.title}</CardTitle>
                <p className="text-xs text-gray-500 capitalize">{scenario.level} • {scenario.topic}</p>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">{scenario.description}</p>
            </CardContent>
          </Card>
        ))}

        <Card 
          className="cursor-pointer border-dashed bg-gray-50 hover:bg-gray-100 transition-colors"
          onClick={() => setIsCreating(true)}
        >
          <CardContent className="flex flex-col items-center justify-center py-8 text-center text-gray-500">
            <Sparkles className="mb-2 h-8 w-8" />
            <h3 className="font-medium">Create Your Own</h3>
            <p className="text-xs">Customize roles, topic and context</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

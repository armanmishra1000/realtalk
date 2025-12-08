'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { VocabularyItem } from '@/lib/types';
import { generateId } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import { Plus, Search, MessageSquare, Trash2, X } from 'lucide-react';

export default function VocabularyPage() {
  const router = useRouter();
  const { vocabulary, addVocabulary, removeVocabulary, setScenario } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newItem, setNewItem] = useState('');

  const filteredVocab = vocabulary.filter(v => 
    v.original.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItem.trim()) {
      addVocabulary({
        id: generateId(),
        original: newItem.trim(),
        translated: '',
        createdAt: Date.now()
      });
      setNewItem('');
      setIsAdding(false);
    }
  };

  const handlePractice = (item: VocabularyItem) => {
    setScenario({
      id: `practice-${item.id}`,
      title: 'Vocabulary Practice',
      description: `Practice using the phrase: "${item.original}"`,
      aiRole: 'Tutor',
      userRole: 'Student',
      level: 'intermediate',
      topic: 'Vocabulary Practice'
    });
    router.push('/speak');
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Vocabulary</h2>
        <Button size="sm" onClick={() => setIsAdding(true)}>
          <Plus size={16} className="mr-1" /> Add
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <Input 
          className="pl-9" 
          placeholder="Search phrases..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Add Form */}
      {isAdding && (
        <Card className="animate-in fade-in slide-in-from-top-2">
          <CardContent className="p-4 flex gap-2">
            <Input 
              autoFocus
              placeholder="Enter phrase..." 
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd(e)}
            />
            <Button size="icon" onClick={handleAdd}><Plus size={18} /></Button>
            <Button size="icon" variant="ghost" onClick={() => setIsAdding(false)}><X size={18} /></Button>
          </CardContent>
        </Card>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-24">
        {filteredVocab.length === 0 ? (
          <div className="text-center text-gray-400 mt-10">
            <p>No vocabulary saved yet.</p>
          </div>
        ) : (
          filteredVocab.map((item) => (
            <Card key={item.id} className="group hover:border-blue-200 transition-all">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{item.original}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-8 w-8 text-blue-500 hover:bg-blue-50"
                    onClick={() => handlePractice(item)}
                    title="Practice Conversation"
                  >
                    <MessageSquare size={16} />
                  </Button>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-8 w-8 text-red-400 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeVocabulary(item.id)}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

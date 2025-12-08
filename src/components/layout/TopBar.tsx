'use client';

import React from 'react';
import { UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function TopBar() {
  return (
    <header className="fixed left-0 right-0 top-0 z-40 border-b border-gray-50 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-md items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <h1 className="text-lg font-bold tracking-tight text-gray-900">
            RealTalk<span className="text-blue-600">.ai</span>
          </h1>
        </div>
        
        <Button variant="ghost" size="icon" className="text-gray-500">
          <UserCircle size={24} />
        </Button>
      </div>
    </header>
  );
}

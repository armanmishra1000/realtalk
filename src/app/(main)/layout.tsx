'use client';

import React from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { BottomNav } from '@/components/layout/BottomNav';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <TopBar />
      <main className="flex-1 pb-24 pt-16">
        <div className="mx-auto max-w-md px-4">
          {children}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}

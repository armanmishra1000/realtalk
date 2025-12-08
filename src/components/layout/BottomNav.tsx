'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Mic, Languages, Book, Globe, VenetianMask } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    {
      href: '/roleplay',
      label: 'Roleplay',
      icon: VenetianMask, // Represents (M) / Modes
      activeColor: 'text-purple-600',
    },
    {
      href: '/translate',
      label: 'Translate',
      icon: Languages, // Represents (T)
      activeColor: 'text-blue-600',
    },
    {
      href: '/speak',
      label: 'Speak',
      icon: Mic, // Home / Speak
      activeColor: 'text-red-500',
      isMain: true,
    },
    {
      href: '/vocabulary',
      label: 'Vocab',
      icon: Book, // Represents (V)
      activeColor: 'text-green-600',
    },
    {
      href: '/settings',
      label: 'Language',
      icon: Globe, // Represents (L)
      activeColor: 'text-orange-600',
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-100 bg-white pb-safe">
      <div className="mx-auto flex h-16 max-w-md items-center justify-around px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center p-2 transition-all duration-200',
                isActive ? item.activeColor : 'text-gray-400 hover:text-gray-600',
                item.isMain && '-mt-8' // Lift the main button
              )}
            >
              <div
                className={cn(
                  'flex items-center justify-center rounded-2xl transition-all',
                  item.isMain
                    ? isActive
                      ? 'h-14 w-14 bg-red-500 text-white shadow-lg shadow-red-200'
                      : 'h-14 w-14 bg-gray-900 text-white shadow-lg'
                    : 'h-10 w-10'
                )}
              >
                <Icon size={item.isMain ? 28 : 24} strokeWidth={item.isMain ? 2.5 : 2} />
              </div>
              {!item.isMain && (
                <span className="mt-1 text-[10px] font-medium">{item.label}</span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

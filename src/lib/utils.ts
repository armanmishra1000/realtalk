import { ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getDiscountPercentage(startDate: number): number {
  const now = Date.now();
  const diffInMs = now - startDate;
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) return 60;
  if (diffInDays === 1) return 50;
  if (diffInDays === 2) return 40;
  if (diffInDays === 3) return 30;
  if (diffInDays === 4) return 20;
  if (diffInDays === 5) return 10;
  
  return 0; // No discount after 6th day (7th day of trial)
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

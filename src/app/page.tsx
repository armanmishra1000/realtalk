'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { getDiscountPercentage } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Check, Sparkles, ArrowRight } from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const { userState, completeOnboarding, setStartDate } = useAppStore();
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState('');
  const [currentDate, setCurrentDate] = useState<number | null>(null);

  useEffect(() => {
    // Avoid synchronous state update warning
    const timer = setTimeout(() => {
        setMounted(true);
        setCurrentDate(Date.now());
        // Initialize start date if not set (though store sets it to Date.now() default)
        if (!userState.startDate) {
          setStartDate(Date.now());
        }
    }, 0);
    return () => clearTimeout(timer);
  }, [userState.startDate, setStartDate]);

  // Redirect if already onboarded
  useEffect(() => {
    if (mounted && userState.hasCompletedOnboarding) {
      router.push('/speak');
    }
  }, [mounted, userState.hasCompletedOnboarding, router]);

  if (!mounted || !currentDate) return null;

  const discount = getDiscountPercentage(userState.startDate);
  const daysPassed = Math.floor((currentDate - userState.startDate) / (1000 * 60 * 60 * 24));
  const dayOfTrial = Math.min(daysPassed + 1, 7);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      completeOnboarding();
      router.push('/speak');
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Header */}
      <header className="fixed top-0 w-full bg-white/80 p-4 backdrop-blur-md z-10">
        <div className="mx-auto max-w-md text-center">
          <h1 className="text-2xl font-bold tracking-tighter">
            RealTalk<span className="text-blue-600">.ai</span>
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 pb-24 pt-20">
        {/* Hero Section */}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
            <Sparkles className="mr-1 h-3 w-3" />
            AI-Powered Language Learning
          </div>
          <h2 className="mb-2 text-3xl font-bold">Speak Confidently.</h2>
          <p className="text-gray-500">
            Real-time conversation practice with advanced AI that listens, understands, and corrects you.
          </p>
        </div>

        {/* Trial & Discount Card */}
        <Card className="mb-8 overflow-hidden border-blue-100 bg-gradient-to-b from-blue-50 to-white">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <span className="text-xl font-bold">{7 - daysPassed}</span>
            </div>
            <CardTitle className="text-blue-900">Free 7 Days Trial</CardTitle>
            <p className="text-sm text-blue-600 font-medium">Day {dayOfTrial} of 7</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {discount > 0 ? (
              <div className="rounded-xl bg-white p-4 shadow-sm border border-blue-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-gray-700">Pay Now Offer</span>
                  <span className="font-bold text-green-600">Save {discount}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                  <div 
                    className="h-full bg-green-500 transition-all duration-1000" 
                    style={{ width: `${discount}%` }} 
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500 text-center">
                  Discount decreases daily. Lock in your price today!
                </p>
              </div>
            ) : (
              <div className="rounded-xl bg-gray-100 p-4 text-center text-sm text-gray-500">
                Trial ending soon. Subscribe to continue learning.
              </div>
            )}
            
            <div className="space-y-2">
              <div className="flex items-center text-sm text-gray-600">
                <Check className="mr-2 h-4 w-4 text-green-500" />
                Unlimited Roleplay Scenarios
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Check className="mr-2 h-4 w-4 text-green-500" />
                Real-time Pronunciation Feedback
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Check className="mr-2 h-4 w-4 text-green-500" />
                Native Accent Options
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Login Form */}
        <div className="fixed bottom-0 left-0 right-0 border-t bg-white p-4 pb-8">
          <div className="mx-auto max-w-md">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Input 
                  type="email" 
                  placeholder="Enter your email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" size="lg">
                Start Learning <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
            <p className="mt-4 text-center text-xs text-gray-400">
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

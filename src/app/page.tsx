'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { cn, getDiscountPercentage } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Check, Sparkles, ArrowRight } from 'lucide-react';

const rainbow = [
  '#E81416',
  '#FFA500',
  '#FAEB36',
  '#79C314',
  '#487DE7',
  '#4B369D',
  '#70369D',
] as const;

const rainbowGradient = `linear-gradient(90deg, ${rainbow.join(', ')})`;
const rainbowGradientDiagonal = `linear-gradient(to right, ${rainbow.join(', ')})`;

type PlanKey = '6mo' | '12mo' | '18mo' | '24mo';

const pricingPlans: Record<
  PlanKey,
  { label: string; price: number; billedText: string; savingsText: string }
> = {
  '6mo': {
    label: '6mo',
    price: 10,
    billedText: 'billed $60 every 6 months',
    savingsText: 'Save 50% vs monthly',
  },
  '12mo': {
    label: '12mo',
    price: 9,
    billedText: 'billed $108 every 12 months',
    savingsText: 'Save 55% vs monthly',
  },
  '18mo': {
    label: '18mo',
    price: 8,
    billedText: 'billed $144 every 18 months',
    savingsText: 'Save 60% vs monthly',
  },
  '24mo': {
    label: '24mo',
    price: 7,
    billedText: 'billed $168 every 24 months',
    savingsText: 'Save 65% vs monthly',
  },
};

const planOrder: PlanKey[] = ['6mo', '12mo', '18mo', '24mo'];

const pricingFeatures = [
  'Everything in Sophie Close Friend',
  'Priority 24/7 support',
  'Exclusive content & early access',
  'Custom learning path',
  'Dedicated account manager',
];

export default function LandingPage() {
  const router = useRouter();
  const { userState, completeOnboarding, setStartDate } = useAppStore();
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState('');
  const [currentDate, setCurrentDate] = useState<number | null>(null);
  const [activePlan, setActivePlan] = useState<PlanKey>('6mo');

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
  const selectedPlan = pricingPlans[activePlan];

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
            Sophie<span className="text-blue-600">.ai</span>
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 pb-72 pt-20">
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
          <CardContent className="space-y-6">
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
            
            <div>
              <svg aria-hidden="true" className="absolute h-0 w-0 overflow-hidden">
                <defs>
                  <linearGradient id="pricing-rainbow-stroke" x1="0%" y1="0%" x2="100%" y2="0%">
                    {rainbow.map((color, index) => (
                      <stop
                        key={color}
                        offset={`${(index / (rainbow.length - 1)) * 100}%`}
                        stopColor={color}
                      />
                    ))}
                  </linearGradient>
                </defs>
              </svg>

              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-3xl font-black text-gray-950 sm:text-4xl">SBB</h3>
                  <p className="mt-1 text-sm text-gray-500 sm:text-base">Sophie Best Buddy</p>
                </div>
                <div className="rounded-full p-px" style={{ backgroundImage: rainbowGradient }}>
                  <div className="rounded-full bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-700">
                    <span className="bg-clip-text text-transparent" style={{ backgroundImage: rainbowGradient }}>
                      Best Value
                    </span>
                  </div>
                </div>
              </div>

              <div className="mb-2 flex items-end gap-1.5 text-gray-950">
                <span className="text-2xl font-black sm:text-4xl">${selectedPlan.price}</span>
                <span className="text-lg font-medium">/month</span>
              </div>

              <p className="text-base font-medium text-gray-500 sm:text-lg">{selectedPlan.billedText}</p>

              <div className="mt-5 inline-flex items-center rounded-full p-px" style={{ backgroundImage: rainbowGradient }}>
                <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-gray-950 sm:px-5 sm:text-base">
                  <span className="text-base sm:text-lg">$</span>
                  <span>{selectedPlan.savingsText}</span>
                </div>
              </div>

              <div className="mt-6" role="tablist" aria-label="Billing duration">
                <div className="grid grid-cols-4 gap-2 sm:gap-3">
                  {planOrder.map((planKey) => {
                    const plan = pricingPlans[planKey];
                    const isActive = planKey === activePlan;

                    return (
                      <button
                        key={planKey}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        aria-controls={`plan-panel-${planKey}`}
                        id={`plan-tab-${planKey}`}
                        className={cn(
                          'rounded-full p-px transition-transform duration-200'
                        )}
                        style={{ backgroundImage: rainbowGradient }}
                        onClick={() => setActivePlan(planKey)}
                      >
                        <span
                          className={cn(
                            'relative flex min-h-8 items-center justify-center overflow-hidden rounded-full font-medium text-gray-950',
                            isActive ? '' : 'bg-white'
                          )}
                          style={isActive ? { backgroundImage: rainbowGradientDiagonal } : undefined}
                        >
                          {isActive ? <span className="absolute inset-0 bg-white/70" aria-hidden="true" /> : null}
                          <span className="relative">{plan.label}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div
                id={`plan-panel-${activePlan}`}
                role="tabpanel"
                aria-labelledby={`plan-tab-${activePlan}`}
                className="mt-7 space-y-4"
              >
                {pricingFeatures.map((feature) => (
                  <div key={feature} className="flex items-center gap-3 text-base text-gray-700">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm">
                      <Check className="h-3.5 w-3.5" style={{ stroke: 'url(#pricing-rainbow-stroke)' }} />
                    </span>
                    <span>{feature}</span>
                  </div>
                ))}
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

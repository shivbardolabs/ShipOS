'use client';

import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import type { ReactNode } from 'react';

export interface Step {
  id: string;
  label: string;
  description?: string;
  icon?: ReactNode;
}

interface StepperProps {
  steps: Step[];
  currentStep: number;
  className?: string;
}

export function Stepper({ steps, currentStep, className }: StepperProps) {
  return (
    <nav className={cn('flex items-center', className)}>
      {steps.map((step, index) => {
        const isComplete = index < currentStep;
        const isCurrent = index === currentStep;
        const isUpcoming = index > currentStep;

        return (
          <div key={step.id} className="flex items-center flex-1 last:flex-none">
            {/* Step circle + label */}
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all duration-300 flex-shrink-0',
                  isComplete && 'border-emerald-500 bg-emerald-500/20 text-emerald-400',
                  isCurrent && 'border-primary-500 bg-primary-500/20 text-primary-400 ring-4 ring-primary-500/10',
                  isUpcoming && 'border-surface-700 bg-surface-800 text-surface-500'
                )}
              >
                {isComplete ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              <div className="hidden sm:block min-w-0">
                <p
                  className={cn(
                    'text-sm font-medium leading-tight truncate',
                    isComplete && 'text-emerald-400',
                    isCurrent && 'text-surface-100',
                    isUpcoming && 'text-surface-500'
                  )}
                >
                  {step.label}
                </p>
                {step.description && (
                  <p className="text-[11px] text-surface-500 leading-tight mt-0.5 truncate">
                    {step.description}
                  </p>
                )}
              </div>
            </div>

            {/* Connector line */}
            {index < steps.length - 1 && (
              <div className="flex-1 mx-3">
                <div
                  className={cn(
                    'h-0.5 rounded-full transition-colors duration-300',
                    isComplete ? 'bg-emerald-500/60' : 'bg-surface-700'
                  )}
                />
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

export type { StepperProps };

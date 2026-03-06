'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Moon, Sun } from 'lucide-react';

export interface AppearanceTabProps {
  theme: string;
  setTheme: (v: string) => void;
}

export function AppearanceTab({ theme, setTheme }: AppearanceTabProps) {
  return (
    <>
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle>Theme</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-surface-500 mb-5">
          Choose how ShipOS looks. Your preference is saved to this browser.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
          {/* Light theme card */}
          <button
            onClick={() => setTheme('light')}
            className={`group relative rounded-xl border-2 p-4 text-left transition-all duration-200 ${
              theme === 'light'
                ? 'border-primary-600 bg-primary-50 ring-2 ring-primary-600/20'
                : 'border-surface-700 hover:border-surface-600 bg-surface-900'
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                theme === 'light' ? 'bg-primary-100 text-primary-600' : 'bg-surface-800 text-surface-500'
              }`}>
                <Sun className="h-5 w-5" />
              </div>
              <div>
                <p className={`text-sm font-semibold ${
                  theme === 'light' ? 'text-primary-600' : 'text-surface-200'
                }`}>Light</p>
                <p className="text-xs text-surface-500">Clean and bright</p>
              </div>
              {theme === 'light' && (
                <div className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-primary-600">
                  <Check className="h-3.5 w-3.5 text-white" />
                </div>
              )}
            </div>
            {/* Mini preview */}
            <div className="rounded-lg border border-surface-700 bg-white p-2.5 space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary-500" />
                <div className="h-1.5 w-16 rounded bg-surface-700" />
              </div>
              <div className="h-1.5 w-full rounded bg-surface-800" />
              <div className="h-1.5 w-3/4 rounded bg-surface-800" />
              <div className="flex gap-1.5 mt-1">
                <div className="h-4 w-12 rounded bg-primary-500" />
                <div className="h-4 w-12 rounded bg-surface-700" />
              </div>
            </div>
          </button>

          {/* Dark theme card */}
          <button
            onClick={() => setTheme('dark')}
            className={`group relative rounded-xl border-2 p-4 text-left transition-all duration-200 ${
              theme === 'dark'
                ? 'border-primary-600 bg-primary-50 ring-2 ring-primary-600/20'
                : 'border-surface-700 hover:border-surface-600 bg-surface-900'
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                theme === 'dark' ? 'bg-primary-100 text-primary-600' : 'bg-surface-800 text-surface-500'
              }`}>
                <Moon className="h-5 w-5" />
              </div>
              <div>
                <p className={`text-sm font-semibold ${
                  theme === 'dark' ? 'text-primary-600' : 'text-surface-200'
                }`}>Dark</p>
                <p className="text-xs text-surface-500">Easy on the eyes</p>
              </div>
              {theme === 'dark' && (
                <div className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-primary-600">
                  <Check className="h-3.5 w-3.5 text-white" />
                </div>
              )}
            </div>
            {/* Mini preview */}
            <div className="rounded-lg border border-surface-300 bg-surface-100 p-2.5 space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary-400" />
                <div className="h-1.5 w-16 rounded bg-surface-300" />
              </div>
              <div className="h-1.5 w-full rounded bg-surface-200" />
              <div className="h-1.5 w-3/4 rounded bg-surface-200" />
              <div className="flex gap-1.5 mt-1">
                <div className="h-4 w-12 rounded bg-primary-500" />
                <div className="h-4 w-12 rounded bg-surface-300" />
              </div>
            </div>
          </button>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Interface Density</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-surface-500 mb-4">
          Controls spacing and sizing across the interface.
        </p>
        <div className="flex items-center gap-3">
          <Badge variant="info">Default</Badge>
          <span className="text-sm text-surface-400">Comfortable — optimized for desktop and tablet</span>
        </div>
      </CardContent>
    </Card>
  </div>
    </>
  );
}

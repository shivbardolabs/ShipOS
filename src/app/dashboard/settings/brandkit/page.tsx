'use client';

/* ── TASTE: Copyable SVG logo + brand kit ── */

import { useState, useCallback } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Check, Download, Palette } from 'lucide-react';

/* ── Brand constants ── */
const BRAND = {
  colors: [
    { name: 'Indigo 600', hex: '#4F46E5', role: 'Primary / brand' },
    { name: 'Indigo 500', hex: '#6366F1', role: 'Interactive / hover' },
    { name: 'Surface 100', hex: '#0F172A', role: 'Text / headings' },
  ],
  fonts: [
    { name: 'DM Sans', role: 'Body & UI', weight: '400–800' },
    { name: 'Instrument Serif', role: 'Brand italic accent', weight: 'Italic' },
    { name: 'JetBrains Mono', role: 'Code & data', weight: '400–500' },
  ],
};

const LOGO_SVG_MARK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4F46E5"/>
      <stop offset="100%" stop-color="#818CF8"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="14" fill="url(#g)"/>
  <path d="M18 33L27 42L46 21" stroke="white" stroke-width="5.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const LOGO_SVG_FULL = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 64" width="200" height="64">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4F46E5"/>
      <stop offset="100%" stop-color="#818CF8"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="14" fill="url(#g)"/>
  <path d="M18 33L27 42L46 21" stroke="white" stroke-width="5.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="76" y="30" font-family="DM Sans, system-ui, sans-serif" font-size="26" font-weight="700" fill="#0F172A">Ship</text>
  <text x="139" y="30" font-family="DM Sans, system-ui, sans-serif" font-size="26" font-weight="700" fill="#4F46E5">OS</text>
  <text x="76" y="48" font-family="DM Sans, system-ui, sans-serif" font-size="11" fill="#64748B">Postal Management</text>
</svg>`;

function useCopy() {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copy = useCallback(async (id: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);
  return { copiedId, copy };
}

function LogoCard({
  label,
  svg,
  id,
  copiedId,
  onCopy,
}: {
  label: string;
  svg: string;
  id: string;
  copiedId: string | null;
  onCopy: (id: string, text: string) => void;
}) {
  const isCopied = copiedId === id;

  return (
    <div className="glass-card p-6 flex flex-col items-center gap-4">
      <p className="text-xs font-medium text-surface-500 uppercase tracking-wider">{label}</p>
      <div
        className="p-6 bg-surface-900 rounded-xl border border-surface-700 flex items-center justify-center"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <div className="flex gap-2 w-full">
        <Button
          variant="outline"
          size="sm"
          fullWidth
          leftIcon={isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          onClick={() => onCopy(id, svg)}
        >
          {isCopied ? 'Copied SVG' : 'Copy SVG'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<Download className="h-4 w-4" />}
          onClick={() => {
            const blob = new Blob([svg], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `shipos-${id}.svg`;
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          .svg
        </Button>
      </div>
    </div>
  );
}

export default function BrandKitPage() {
  const { copiedId, copy } = useCopy();

  return (
    <>
      <PageHeader
        title="Brand Kit"
        description="Logos, colors, and type."
        icon={<Palette className="h-5 w-5" />}
      />

      {/* Logos */}
      <section className="mb-8">
        <h3 className="text-sm font-semibold text-surface-300 mb-4">Logos</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <LogoCard
            label="Logo Mark"
            svg={LOGO_SVG_MARK}
            id="mark"
            copiedId={copiedId}
            onCopy={copy}
          />
          <LogoCard
            label="Full Logo"
            svg={LOGO_SVG_FULL}
            id="full"
            copiedId={copiedId}
            onCopy={copy}
          />
        </div>
      </section>

      {/* Colors */}
      <section className="mb-8">
        <h3 className="text-sm font-semibold text-surface-300 mb-4">Colors — max 3</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {BRAND.colors.map((c) => {
            const id = `color-${c.hex}`;
            const isCopied = copiedId === id;
            return (
              <button
                key={c.hex}
                onClick={() => copy(id, c.hex)}
                className="glass-card p-4 text-left group cursor-pointer hover:border-primary-500 transition-all"
              >
                <div
                  className="h-16 w-full rounded-lg mb-3"
                  style={{ background: c.hex }}
                />
                <p className="text-sm font-medium text-surface-200">{c.name}</p>
                <p className="text-xs text-surface-500 mt-0.5">{c.role}</p>
                <p className="text-xs font-mono text-surface-400 mt-1 flex items-center gap-1">
                  {c.hex}
                  {isCopied ? (
                    <Check className="h-3 w-3 text-accent-emerald" />
                  ) : (
                    <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Typography */}
      <section>
        <h3 className="text-sm font-semibold text-surface-300 mb-4">Typography</h3>
        <Card>
          <CardHeader>
            <CardTitle className="sr-only">Font Stack</CardTitle>
          </CardHeader>
          <div className="divide-y divide-surface-700">
            {BRAND.fonts.map((f) => (
              <div key={f.name} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p
                    className="text-lg text-surface-200"
                    style={{
                      fontFamily:
                        f.name === 'JetBrains Mono'
                          ? 'var(--font-mono)'
                          : f.name === 'Instrument Serif'
                          ? 'var(--font-serif)'
                          : 'var(--font-sans)',
                      fontStyle: f.name === 'Instrument Serif' ? 'italic' : undefined,
                    }}
                  >
                    {f.name}
                  </p>
                  <p className="text-xs text-surface-500">{f.role} · {f.weight}</p>
                </div>
                <span
                  className="text-2xl text-surface-300"
                  style={{
                    fontFamily:
                      f.name === 'JetBrains Mono'
                        ? 'var(--font-mono)'
                        : f.name === 'Instrument Serif'
                        ? 'var(--font-serif)'
                        : 'var(--font-sans)',
                    fontStyle: f.name === 'Instrument Serif' ? 'italic' : undefined,
                  }}
                >
                  Aa 123
                </span>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </>
  );
}

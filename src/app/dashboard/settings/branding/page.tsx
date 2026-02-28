'use client';
/* eslint-disable */

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Palette,
  Save,
  Image,
  Type,
  Globe,
  Loader2,
  CheckCircle2,
  Eye,
} from 'lucide-react';

/* ── Types ──────────────────────────────────────────────────────────────── */

interface BrandingData {
  brandLogo: string | null;
  brandAccentColor: string | null;
  brandTagline: string | null;
  brandFavicon: string | null;
}

/* ── Main Component ─────────────────────────────────────────────────────── */

export default function BrandingPage() {
  const [branding, setBranding] = useState<BrandingData>({
    brandLogo: null,
    brandAccentColor: '#6366f1',
    brandTagline: null,
    brandFavicon: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/settings/branding')
      .then((r) => r.json())
      .then((d) => {
        if (d.branding) {
          setBranding({
            brandLogo: d.branding.brandLogo || null,
            brandAccentColor: d.branding.brandAccentColor || '#6366f1',
            brandTagline: d.branding.brandTagline || null,
            brandFavicon: d.branding.brandFavicon || null,
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch('/api/settings/branding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(branding),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {
      // Error handled silently
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-surface-500" />
      </div>
    );
  }

  const accentColor = branding.brandAccentColor || '#6366f1';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Branding"
        description="Customize your store's visual identity"
        icon={<Palette className="h-6 w-6" />}
        actions={
          <Button
            onClick={handleSave}
            loading={saving}
            leftIcon={saved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          >
            {saved ? 'Saved!' : 'Save Changes'}
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Settings */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Logo</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                label="Logo URL"
                value={branding.brandLogo || ''}
                onChange={(e) => setBranding({ ...branding, brandLogo: e.target.value || null })}
                placeholder="https://example.com/logo.png"
                leftIcon={<Image className="h-4 w-4" />}
              />
              <p className="text-xs text-surface-500 mt-2">
                Recommended: 200×60px PNG with transparent background
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Accent Color</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setBranding({ ...branding, brandAccentColor: e.target.value })}
                  className="h-10 w-10 rounded-lg border border-surface-600 cursor-pointer"
                />
                <Input
                  value={branding.brandAccentColor || ''}
                  onChange={(e) => setBranding({ ...branding, brandAccentColor: e.target.value })}
                  placeholder="#6366f1"
                  className="font-mono"
                />
              </div>
              <p className="text-xs text-surface-500 mt-2">
                Used for buttons, links, and accent elements across your dashboard
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tagline</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                label="Brand Tagline"
                value={branding.brandTagline || ''}
                onChange={(e) => setBranding({ ...branding, brandTagline: e.target.value || null })}
                placeholder="Your trusted mailbox partner"
                leftIcon={<Type className="h-4 w-4" />}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Favicon</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                label="Favicon URL"
                value={branding.brandFavicon || ''}
                onChange={(e) => setBranding({ ...branding, brandFavicon: e.target.value || null })}
                placeholder="https://example.com/favicon.ico"
                leftIcon={<Globe className="h-4 w-4" />}
              />
            </CardContent>
          </Card>
        </div>

        {/* Preview */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>
                <span className="flex items-center gap-2">
                  <Eye className="h-4 w-4" /> Preview
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-surface-900 rounded-lg p-6 space-y-4">
                {/* Header preview */}
                <div
                  className="flex items-center gap-3 p-4 rounded-lg"
                  style={{ backgroundColor: `${accentColor}15`, borderLeft: `3px solid ${accentColor}` }}
                >
                  {branding.brandLogo ? (
                    <img
                      src={branding.brandLogo}
                      alt="Logo"
                      className="h-8 object-contain"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <div
                      className="h-8 w-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                      style={{ backgroundColor: accentColor }}
                    >
                      S
                    </div>
                  )}
                  <div>
                    <div className="font-semibold text-surface-200">Your Store Name</div>
                    {branding.brandTagline && (
                      <div className="text-xs text-surface-400">{branding.brandTagline}</div>
                    )}
                  </div>
                </div>

                {/* Button preview */}
                <div className="flex gap-2">
                  <button
                    className="px-4 py-2 text-sm font-medium rounded-lg text-white"
                    style={{ backgroundColor: accentColor }}
                  >
                    Primary Button
                  </button>
                  <button
                    className="px-4 py-2 text-sm font-medium rounded-lg border"
                    style={{ color: accentColor, borderColor: `${accentColor}50` }}
                  >
                    Secondary
                  </button>
                </div>

                {/* Badge preview */}
                <div className="flex gap-2">
                  <span
                    className="px-2 py-1 text-xs rounded-full font-medium"
                    style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
                  >
                    Active
                  </span>
                  <span
                    className="px-2 py-1 text-xs rounded-full font-medium"
                    style={{ backgroundColor: `${accentColor}10`, color: accentColor }}
                  >
                    PMB-0001
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Email Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Email Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-white rounded-lg p-6 text-gray-900">
                <div className="flex items-center gap-2 mb-4">
                  {branding.brandLogo ? (
                    <img
                      src={branding.brandLogo}
                      alt="Logo"
                      className="h-6 object-contain"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <span className="text-lg font-bold">📦 ShipOS Pro</span>
                  )}
                </div>
                <div className="text-sm text-gray-600 space-y-2">
                  <p className="font-semibold text-gray-900">New Package Arrived!</p>
                  <p>Hi John, a new UPS package has arrived at your mailbox PMB-0101.</p>
                  <div
                    className="px-4 py-2 rounded-lg text-white text-center text-sm font-medium mt-3 w-fit"
                    style={{ backgroundColor: accentColor }}
                  >
                    View Details
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

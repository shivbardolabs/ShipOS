'use client';

/**
 * BAR-289 — Customer-Facing Welcome Screen
 * POS 2nd Screen & Portal
 *
 * BAR-293 — Marketing Display (carousel integrated into welcome screen)
 */

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  Package,
  Mail,
  QrCode,
  Clock,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */
interface WelcomeScreenProps {
  storeName: string;
  storeLogo?: string | null;
  tagline?: string;
  isOpen: boolean;
  onCheckMailbox: () => void;
  announcements?: string[];
  marketingImages?: MarketingImage[];
  accentColor?: string;
}

interface MarketingImage {
  id: string;
  url: string;
  caption?: string;
  linkUrl?: string;
  altText: string;
}

/* -------------------------------------------------------------------------- */
/*  Marketing Carousel — BAR-293                                              */
/* -------------------------------------------------------------------------- */
function MarketingCarousel({
  images,
  interval = 8000,
}: {
  images: MarketingImage[];
  interval?: number;
}) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % images.length);
    }, interval);
    return () => clearInterval(timer);
  }, [images.length, interval]);

  if (images.length === 0) return null;

  return (
    <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-surface-900">
      {images.map((img, idx) => (
        <div
          key={img.id}
          className={cn(
            'absolute inset-0 transition-opacity duration-1000',
            idx === current ? 'opacity-100' : 'opacity-0'
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={img.url}
            alt={img.altText}
            className="w-full h-full object-cover"
          />
          {img.caption && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
              <p className="text-white text-sm font-medium">{img.caption}</p>
            </div>
          )}
        </div>
      ))}
      {/* Dots */}
      {images.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {images.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrent(idx)}
              className={cn(
                'h-2 rounded-full transition-all duration-300',
                idx === current ? 'w-6 bg-white' : 'w-2 bg-white/40'
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Welcome Screen                                                            */
/* -------------------------------------------------------------------------- */
export function WelcomeScreen({
  storeName,
  storeLogo,
  tagline,
  isOpen,
  onCheckMailbox,
  announcements = [],
  marketingImages = [],
  accentColor = '#6366f1',
}: WelcomeScreenProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [announcementIdx, setAnnouncementIdx] = useState(0);

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Rotate announcements
  useEffect(() => {
    if (announcements.length <= 1) return;
    const timer = setInterval(() => {
      setAnnouncementIdx((prev) => (prev + 1) % announcements.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [announcements.length]);

  const timeStr = currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const dateStr = currentTime.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-surface-950 to-surface-900 flex flex-col items-center justify-center p-8 relative overflow-hidden">
      {/* Background decorative gradient */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          background: `radial-gradient(circle at 50% 0%, ${accentColor}40, transparent 70%)`,
        }}
      />

      <div className="relative z-10 w-full max-w-2xl space-y-8">
        {/* Store Branding */}
        <div className="text-center space-y-3">
          {storeLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={storeLogo}
              alt={storeName}
              className="h-16 mx-auto object-contain"
            />
          ) : (
            <div
              className="inline-flex h-16 w-16 items-center justify-center rounded-2xl mx-auto text-2xl font-bold text-white"
              style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}80)` }}
            >
              {storeName.charAt(0)}
            </div>
          )}
          <h1 className="text-3xl md:text-4xl font-bold text-white">{storeName}</h1>
          {tagline && (
            <p className="text-surface-400 text-lg">{tagline}</p>
          )}
        </div>

        {/* Time & Status */}
        <div className="flex items-center justify-center gap-6">
          <div className="text-center">
            <p className="text-2xl font-mono font-bold text-surface-100">{timeStr}</p>
            <p className="text-xs text-surface-500">{dateStr}</p>
          </div>
          <div className="h-8 w-px bg-surface-700" />
          <div className={cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold',
            isOpen
              ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30'
              : 'bg-red-500/20 text-red-400 ring-1 ring-red-500/30'
          )}>
            <span className={cn(
              'h-2.5 w-2.5 rounded-full animate-pulse',
              isOpen ? 'bg-emerald-400' : 'bg-red-400'
            )} />
            {isOpen ? 'Open' : 'Closed'}
          </div>
        </div>

        {/* Main CTA */}
        <div className="flex justify-center">
          <button
            onClick={onCheckMailbox}
            className="group relative flex items-center gap-4 rounded-2xl px-10 py-5 text-xl font-bold text-white transition-all duration-300 hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-4"
            style={{
              background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
              boxShadow: `0 8px 32px ${accentColor}40`,
              minWidth: '280px',
              minHeight: '64px',
            }}
          >
            <Package className="h-7 w-7" />
            <span>Check Mailbox</span>
            <ChevronRight className="h-6 w-6 transition-transform group-hover:translate-x-1" />
          </button>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
          <button className="flex flex-col items-center gap-2 rounded-xl bg-surface-800/50 p-4 text-surface-400 hover:text-surface-200 hover:bg-surface-800 transition-colors min-h-[76px]">
            <QrCode className="h-6 w-6" />
            <span className="text-xs font-medium">Scan QR</span>
          </button>
          <button className="flex flex-col items-center gap-2 rounded-xl bg-surface-800/50 p-4 text-surface-400 hover:text-surface-200 hover:bg-surface-800 transition-colors min-h-[76px]">
            <Mail className="h-6 w-6" />
            <span className="text-xs font-medium">Check Mail</span>
          </button>
          <button className="flex flex-col items-center gap-2 rounded-xl bg-surface-800/50 p-4 text-surface-400 hover:text-surface-200 hover:bg-surface-800 transition-colors min-h-[76px]">
            <Clock className="h-6 w-6" />
            <span className="text-xs font-medium">Hours</span>
          </button>
        </div>

        {/* Marketing Carousel — BAR-293 */}
        {marketingImages.length > 0 && (
          <MarketingCarousel images={marketingImages} />
        )}

        {/* Rotating Announcements */}
        {announcements.length > 0 && (
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-surface-800/60 px-4 py-2 text-sm text-surface-300 backdrop-blur-sm">
              <ArrowRight className="h-3.5 w-3.5 text-primary-400" />
              <span className="transition-opacity duration-500">
                {announcements[announcementIdx]}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ADA: High contrast bottom bar */}
      <div className="absolute bottom-4 left-0 right-0 text-center">
        <p className="text-[10px] text-surface-600">
          Powered by ShipOS • Accessibility: Press Tab to navigate
        </p>
      </div>
    </div>
  );
}

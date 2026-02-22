'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LogIn,
  ArrowRight,
  ChevronDown,
  Package,
  Layers,
  Headphones,
  Users,
  Info,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Navigation structure                                                      */
/* -------------------------------------------------------------------------- */

interface NavItem {
  label: string;
  href?: string;
  icon?: React.ElementType;
  children?: { label: string; href: string; desc: string; icon: React.ElementType }[];
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Products',
    icon: Layers,
    children: [
      {
        label: 'ShipOS',
        href: '/products/shipos',
        desc: 'All-in-one postal store management platform',
        icon: Package,
      },
    ],
  },
  { label: 'Customers', href: '/customers', icon: Users },
  { label: 'Support', href: '/support', icon: Headphones },
  { label: 'About', href: '/about', icon: Info },
];

/* -------------------------------------------------------------------------- */
/*  Navbar                                                                    */
/* -------------------------------------------------------------------------- */

export function Navbar() {
  const pathname = usePathname();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropdownTimeout = useRef<NodeJS.Timeout | null>(null);

  // Close dropdown on route change
  useEffect(() => {
    setOpenDropdown(null);
    setMobileOpen(false);
  }, [pathname]);

  const handleMouseEnter = (label: string) => {
    if (dropdownTimeout.current) clearTimeout(dropdownTimeout.current);
    setOpenDropdown(label);
  };

  const handleMouseLeave = () => {
    dropdownTimeout.current = setTimeout(() => setOpenDropdown(null), 150);
  };

  const isActive = (item: NavItem) => {
    if (item.href) return pathname === item.href || pathname.startsWith(item.href + '/');
    if (item.children) return item.children.some((c) => pathname === c.href || pathname.startsWith(c.href + '/'));
    return false;
  };

  return (
    <header className="relative z-50 px-6 py-4 border-b border-surface-700/60 backdrop-blur-sm bg-surface-950/80">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/shipos-logo-mark.svg" alt="ShipOS" width={36} height={36} className="group-hover:scale-105 transition-transform" />
          <div>
            <div className="flex items-baseline gap-0.5">
              <span className="text-lg font-bold text-surface-100">Ship</span>
              <span className="text-lg font-bold text-primary-500">OS</span>
            </div>
            <p className="text-[10px] text-surface-500 -mt-0.5">by Bardo Labs</p>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item);

            if (item.children) {
              return (
                <div
                  key={item.label}
                  className="relative"
                  onMouseEnter={() => handleMouseEnter(item.label)}
                  onMouseLeave={handleMouseLeave}
                >
                  <button
                    className={cn(
                      'flex items-center gap-1 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors',
                      active
                        ? 'text-primary-500 bg-primary-500/10'
                        : 'text-surface-400 hover:text-surface-100 hover:bg-surface-800/60'
                    )}
                    onClick={() => setOpenDropdown(openDropdown === item.label ? null : item.label)}
                  >
                    {item.label}
                    <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', openDropdown === item.label && 'rotate-180')} />
                  </button>

                  {/* Dropdown */}
                  {openDropdown === item.label && (
                    <div className="absolute top-full left-0 pt-2 w-72">
                      <div className="rounded-xl border border-surface-700 bg-surface-900 shadow-2xl shadow-surface-950/80 p-2">
                        {item.children.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={cn(
                              'flex items-start gap-3 p-3 rounded-lg transition-colors group/item',
                              pathname === child.href
                                ? 'bg-primary-500/10 text-primary-400'
                                : 'hover:bg-surface-800/60'
                            )}
                          >
                            <div className={cn(
                              'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg mt-0.5',
                              pathname === child.href ? 'bg-primary-500/20' : 'bg-surface-800 group-hover/item:bg-surface-700'
                            )}>
                              <child.icon className="h-4 w-4 text-primary-500" />
                            </div>
                            <div>
                              <span className="text-sm font-semibold text-surface-100">{child.label}</span>
                              <p className="text-xs text-surface-500 mt-0.5">{child.desc}</p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.label}
                href={item.href!}
                className={cn(
                  'px-3.5 py-2 rounded-lg text-sm font-medium transition-colors',
                  active
                    ? 'text-primary-500 bg-primary-500/10'
                    : 'text-surface-400 hover:text-surface-100 hover:bg-surface-800/60'
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Auth buttons */}
        <div className="hidden md:flex items-center gap-3">
          <a
            href="/api/auth/login"
            className="px-4 py-2 text-surface-300 hover:text-surface-100 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            Log In
          </a>
          <a
            href="/api/auth/signup"
            className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-lg shadow-primary-900/20"
          >
            Sign Up Free
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden flex flex-col gap-1.5 p-2"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          <span className={cn('block h-0.5 w-6 bg-surface-400 transition-transform', mobileOpen && 'translate-y-2 rotate-45')} />
          <span className={cn('block h-0.5 w-6 bg-surface-400 transition-opacity', mobileOpen && 'opacity-0')} />
          <span className={cn('block h-0.5 w-6 bg-surface-400 transition-transform', mobileOpen && '-translate-y-2 -rotate-45')} />
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden mt-4 pb-4 border-t border-surface-700/60 pt-4 space-y-2">
          {NAV_ITEMS.map((item) => {
            if (item.children) {
              return (
                <div key={item.label} className="space-y-1">
                  <p className="px-3 py-1.5 text-xs font-semibold text-surface-500 uppercase tracking-wider">{item.label}</p>
                  {item.children.map((child) => (
                    <Link key={child.href} href={child.href} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-surface-300 hover:bg-surface-800">
                      <child.icon className="h-4 w-4 text-primary-500" />
                      {child.label}
                    </Link>
                  ))}
                </div>
              );
            }
            return (
              <Link key={item.label} href={item.href!} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-surface-300 hover:bg-surface-800">
                {item.icon && <item.icon className="h-4 w-4 text-surface-400" />}
                {item.label}
              </Link>
            );
          })}
          <div className="pt-3 border-t border-surface-700/60 flex flex-col gap-2 px-3">
            <a href="/api/auth/login" className="py-2.5 text-sm text-surface-300 font-medium flex items-center gap-2"><LogIn className="w-4 h-4" /> Log In</a>
            <a href="/api/auth/signup" className="py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium text-center">Sign Up Free</a>
          </div>
        </div>
      )}
    </header>
  );
}

/**
 * ShipOS Dark Theme
 * Matches the web application's design language.
 */

export const colors = {
  // Backgrounds
  background: '#0a0a0a',
  surface: '#111111',
  surfaceHover: '#1a1a1a',
  card: '#141414',
  cardBorder: '#262626',

  // Text
  textPrimary: '#fafafa',
  textSecondary: '#a1a1aa',
  textMuted: '#71717a',
  textInverse: '#0a0a0a',

  // Brand
  primary: '#3b82f6',
  primaryHover: '#2563eb',
  primaryLight: '#1e3a5f',

  // Status
  success: '#22c55e',
  successLight: '#14532d',
  warning: '#f59e0b',
  warningLight: '#78350f',
  error: '#ef4444',
  errorLight: '#7f1d1d',
  info: '#3b82f6',
  infoLight: '#1e3a5f',

  // Carriers
  carrierUPS: '#FFB500',
  carrierFedEx: '#4D148C',
  carrierUSPS: '#004B87',
  carrierDHL: '#FFCC00',
  carrierAmazon: '#FF9900',

  // Borders & dividers
  border: '#262626',
  borderLight: '#1f1f1f',
  divider: '#1e1e1e',

  // Input
  inputBg: '#0a0a0a',
  inputBorder: '#333333',
  inputFocus: '#3b82f6',
  placeholder: '#555555',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.6)',
  backdrop: 'rgba(0, 0, 0, 0.8)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  display: 40,
} as const;

export const borderRadius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  full: 999,
} as const;

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
} as const;

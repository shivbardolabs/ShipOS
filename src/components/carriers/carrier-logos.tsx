/**
 * Carrier logo components — official-style SVG marks for each shipping carrier.
 *
 * Usage:
 *   import { CarrierLogo } from '@/components/carriers/carrier-logos';
 *   <CarrierLogo carrier="ups" size={32} />
 */
import React from 'react';

/* -------------------------------------------------------------------------- */
/*  Shared props                                                              */
/* -------------------------------------------------------------------------- */
export interface CarrierLogoProps {
  /** Carrier id from the system */
  carrier: string;
  /** Width & height in px (logos are always square containers) */
  size?: number;
  className?: string;
}

/* -------------------------------------------------------------------------- */
/*  Individual carrier logos                                                   */
/* -------------------------------------------------------------------------- */

function UPSLogo({ size = 32 }: { size?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Shield shape */}
      <path d="M50 5C30 5 10 15 10 15V55C10 80 50 95 50 95C50 95 90 80 90 55V15C90 15 70 5 50 5Z" fill="#351C15"/>
      <path d="M50 10C33 10 16 18.5 16 18.5V54C16 76 50 89 50 89C50 89 84 76 84 54V18.5C84 18.5 67 10 50 10Z" fill="#FFB500"/>
      {/* UPS text */}
      <text x="50" y="58" textAnchor="middle" fill="#351C15" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="24">UPS</text>
    </svg>
  );
}

function FedExLogo({ size = 32 }: { size?: number }) {
  return (
    <svg viewBox="0 0 100 40" width={size * 2.5} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
      <text x="2" y="32" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="34">
        <tspan fill="#4D148C">Fed</tspan>
        <tspan fill="#FF6600">Ex</tspan>
      </text>
    </svg>
  );
}

function USPSLogo({ size = 32 }: { size?: number }) {
  return (
    <svg viewBox="0 0 120 40" width={size * 3} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Blue background bar */}
      <rect x="0" y="0" width="120" height="40" rx="4" fill="#333366"/>
      {/* USPS text */}
      <text x="60" y="28" textAnchor="middle" fill="#FFFFFF" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="22">USPS</text>
      {/* Eagle accent */}
      <rect x="0" y="36" width="120" height="4" rx="0" fill="#CC0000"/>
    </svg>
  );
}

function DHLLogo({ size = 32 }: { size?: number }) {
  return (
    <svg viewBox="0 0 100 40" width={size * 2.5} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Yellow background */}
      <rect width="100" height="40" rx="4" fill="#FFCC00"/>
      {/* DHL text */}
      <text x="50" y="29" textAnchor="middle" fill="#D40511" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="26">DHL</text>
    </svg>
  );
}

function AmazonLogo({ size = 32 }: { size?: number }) {
  return (
    <svg viewBox="0 0 120 40" width={size * 3} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Amazon text */}
      <text x="60" y="24" textAnchor="middle" fill="#232F3E" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="20">amazon</text>
      {/* Smile arrow */}
      <path d="M30 30 Q60 38 95 28" stroke="#FF9900" strokeWidth="3" fill="none" strokeLinecap="round"/>
      <path d="M88 22 L95 28 L86 31" stroke="#FF9900" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function WalmartLogo({ size = 32 }: { size?: number }) {
  return (
    <svg viewBox="0 0 120 40" width={size * 3} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Walmart text */}
      <text x="60" y="28" textAnchor="middle" fill="#0071CE" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="19">Walmart</text>
      {/* Spark */}
      <circle cx="108" cy="20" r="3" fill="#FFC220"/>
    </svg>
  );
}

function TargetLogo({ size = 32 }: { size?: number }) {
  return (
    <svg viewBox="0 0 100 40" width={size * 2.5} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Bullseye */}
      <circle cx="18" cy="20" r="12" fill="#CC0000"/>
      <circle cx="18" cy="20" r="8" fill="#FFFFFF"/>
      <circle cx="18" cy="20" r="4" fill="#CC0000"/>
      {/* Target text */}
      <text x="60" y="27" textAnchor="middle" fill="#CC0000" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="18">Target</text>
    </svg>
  );
}

function LaserShipLogo({ size = 32 }: { size?: number }) {
  return (
    <svg viewBox="0 0 130 40" width={size * 3.2} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* LaserShip text */}
      <text x="65" y="27" textAnchor="middle" fill="#00843D" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="17">
        <tspan fill="#00843D">Laser</tspan>
        <tspan fill="#003DA5">Ship</tspan>
      </text>
      {/* Laser line accent */}
      <line x1="8" y1="33" x2="122" y2="33" stroke="#00843D" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

function TemuLogo({ size = 32 }: { size?: number }) {
  return (
    <svg viewBox="0 0 100 40" width={size * 2.5} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Orange background pill */}
      <rect width="100" height="40" rx="20" fill="#FB5634"/>
      {/* Temu text */}
      <text x="50" y="28" textAnchor="middle" fill="#FFFFFF" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="22">Temu</text>
    </svg>
  );
}

function OnTracLogo({ size = 32 }: { size?: number }) {
  return (
    <svg viewBox="0 0 110 40" width={size * 2.75} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
      <text x="55" y="28" textAnchor="middle" fill="#005DAA" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="20">OnTrac</text>
      <line x1="8" y1="34" x2="102" y2="34" stroke="#F7941E" strokeWidth="3" strokeLinecap="round"/>
    </svg>
  );
}

function OtherCarrierLogo({ size = 32 }: { size?: number }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Simple package icon */}
      <rect x="6" y="12" width="28" height="20" rx="2" stroke="#6B7280" strokeWidth="2.5" fill="none"/>
      <line x1="6" y1="18" x2="34" y2="18" stroke="#6B7280" strokeWidth="2"/>
      <line x1="20" y1="12" x2="20" y2="32" stroke="#6B7280" strokeWidth="2"/>
      <polyline points="12,12 20,6 28,12" stroke="#6B7280" strokeWidth="2.5" fill="none" strokeLinejoin="round"/>
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/*  Carrier logo map                                                          */
/* -------------------------------------------------------------------------- */
const logoMap: Record<string, React.FC<{ size?: number }>> = {
  ups: UPSLogo,
  fedex: FedExLogo,
  usps: USPSLogo,
  dhl: DHLLogo,
  amazon: AmazonLogo,
  walmart: WalmartLogo,
  target: TargetLogo,
  lasership: LaserShipLogo,
  temu: TemuLogo,
  ontrac: OnTracLogo,
  other: OtherCarrierLogo,
};

/* -------------------------------------------------------------------------- */
/*  Public component                                                          */
/* -------------------------------------------------------------------------- */
export function CarrierLogo({ carrier, size = 32, className }: CarrierLogoProps) {
  const Logo = logoMap[carrier.toLowerCase()] || OtherCarrierLogo;
  return (
    <span className={className} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <Logo size={size} />
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  Full list of supported carriers (for imports)                             */
/* -------------------------------------------------------------------------- */
export const SUPPORTED_CARRIERS = Object.keys(logoMap);

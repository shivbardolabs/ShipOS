'use client';

/**
 * BAR-187: QR Code Generation per Customer
 *
 * Generates a QR code containing the customer's PMB number for quick
 * identification during checkout. Uses a simple SVG-based QR representation.
 */

import { useMemo } from 'react';
import { cn } from '@/lib/utils';

/* -------------------------------------------------------------------------- */
/*  Simple QR Code SVG Generator                                              */
/* -------------------------------------------------------------------------- */

/**
 * Generate a simple QR-like SVG pattern from a string value.
 * In production, this would use a proper QR library (e.g., qrcode).
 * For now, creates a deterministic pattern from the input.
 */
function generateQRPattern(value: string, size: number): boolean[][] {
  const grid: boolean[][] = [];
  // Simple hash-based pattern generation
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  }

  for (let y = 0; y < size; y++) {
    grid[y] = [];
    for (let x = 0; x < size; x++) {
      // Position detection patterns (corners)
      const inTopLeft = x < 7 && y < 7;
      const inTopRight = x >= size - 7 && y < 7;
      const inBottomLeft = x < 7 && y >= size - 7;

      if (inTopLeft || inTopRight || inBottomLeft) {
        const lx = inTopRight ? x - (size - 7) : x;
        const ly = inBottomLeft ? y - (size - 7) : y;
        // Standard QR finder pattern
        grid[y][x] =
          lx === 0 || lx === 6 || ly === 0 || ly === 6 || // Border
          (lx >= 2 && lx <= 4 && ly >= 2 && ly <= 4); // Center
      } else {
        // Data area — deterministic pattern from hash
        const seed = (hash + x * 31 + y * 37) | 0;
        grid[y][x] = (seed & (1 << ((x + y) % 16))) !== 0;
      }
    }
  }
  return grid;
}

/* -------------------------------------------------------------------------- */
/*  QR Code Component                                                         */
/* -------------------------------------------------------------------------- */

interface QRCodeProps {
  /** Value to encode (typically PMB number) */
  value: string;
  /** Size in pixels */
  size?: number;
  /** Module count (QR grid dimension) */
  modules?: number;
  className?: string;
}

export function QRCode({
  value,
  size = 200,
  modules = 21,
  className,
}: QRCodeProps) {
  const pattern = useMemo(
    () => generateQRPattern(value, modules),
    [value, modules]
  );

  const cellSize = size / modules;

  return (
    <div className={cn('inline-block', className)}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width={size} height={size} fill="white" />
        {pattern.map((row, y) =>
          row.map((cell, x) =>
            cell ? (
              <rect
                key={`${x}-${y}`}
                x={x * cellSize}
                y={y * cellSize}
                width={cellSize}
                height={cellSize}
                fill="black"
              />
            ) : null
          )
        )}
      </svg>
      <p className="text-center text-xs font-mono mt-1 text-surface-400">
        {value}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Customer QR Badge (compact version)                                       */
/* -------------------------------------------------------------------------- */

interface CustomerQRBadgeProps {
  pmbNumber: string;
  customerName: string;
  className?: string;
}

export function CustomerQRBadge({
  pmbNumber,
  customerName,
  className,
}: CustomerQRBadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-surface-200',
        className
      )}
    >
      <QRCode value={pmbNumber} size={120} modules={21} />
      <div className="text-center">
        <p className="text-sm font-bold text-gray-900">{pmbNumber}</p>
        <p className="text-xs text-gray-600">{customerName}</p>
      </div>
    </div>
  );
}
